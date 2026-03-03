// Confluence API 연동 및 용어 추출
class ConfluenceIntegration {
    constructor() {
        this.baseURL = 'https://krafton.atlassian.net';
        this.apiToken = null;
        this.email = null; // Confluence 계정 이메일
        this.monitoredPages = [];
        this.checkInterval = 24 * 60 * 60 * 1000; // 기본 24시간 (하루)
        this.checkTimer = null;
        this.lastCheckTime = null;
        this.lastPageCheckTime = null; // 신규 페이지 체크 시간
        this.parentPageId = '686854573'; // ADK Meeting Hub 페이지 ID
        this.initialized = false;
        this.autoCheckEnabled = true; // 자동 가져오기 활성화 여부 (기본값: 활성화)
    }
    
    async initialize() {
        if (this.initialized) return;
        await this.loadSettings();
        this.initialized = true;
    }

    // 설정 로드
    async loadSettings() {
        try {
            if (window.RealtimeDBHelper) {
                const settings = await RealtimeDBHelper.get('settings/confluence');
                if (settings) {
                    this.apiToken = settings.apiToken || null;
                    this.email = settings.email || null;
                    this.monitoredPages = settings.monitoredPages || [];
                    this.checkInterval = settings.checkInterval || this.checkInterval;
                    this.lastCheckTime = settings.lastCheckTime || null;
                    this.lastPageCheckTime = settings.lastPageCheckTime || null;
                    this.autoCheckEnabled = settings.autoCheckEnabled !== undefined ? settings.autoCheckEnabled : true;
                    console.log('RealtimeDB에서 설정 로드 완료:', {
                        autoCheckEnabled: this.autoCheckEnabled,
                        checkInterval: this.checkInterval
                    });
                }
            } else {
                // LocalStorage 폴백
                const saved = localStorage.getItem('confluenceSettings');
                if (saved) {
                    const settings = JSON.parse(saved);
                    this.apiToken = settings.apiToken || null;
                    this.email = settings.email || null;
                    this.monitoredPages = settings.monitoredPages || [];
                    this.checkInterval = settings.checkInterval || this.checkInterval;
                    this.lastCheckTime = settings.lastCheckTime || null;
                    this.lastPageCheckTime = settings.lastPageCheckTime || null;
                    this.autoCheckEnabled = settings.autoCheckEnabled !== undefined ? settings.autoCheckEnabled : true;
                    console.log('LocalStorage에서 설정 로드 완료:', {
                        autoCheckEnabled: this.autoCheckEnabled,
                        checkInterval: this.checkInterval
                    });
                }
            }
        } catch (error) {
            console.error('Confluence 설정 로드 실패:', error);
        }
    }

    // 설정 저장
    async saveSettings() {
        const settings = {
            apiToken: this.apiToken,
            email: this.email,
            monitoredPages: this.monitoredPages,
            checkInterval: this.checkInterval,
            lastCheckTime: this.lastCheckTime,
            lastPageCheckTime: this.lastPageCheckTime,
            autoCheckEnabled: this.autoCheckEnabled
        };

        try {
            if (window.RealtimeDBHelper) {
                await RealtimeDBHelper.set('settings/confluence', settings);
                console.log('RealtimeDB에 설정 저장 완료:', settings);
            }
            localStorage.setItem('confluenceSettings', JSON.stringify(settings));
            console.log('LocalStorage에 설정 저장 완료:', settings);
        } catch (error) {
            console.error('Confluence 설정 저장 실패:', error);
            throw error;
        }
    }

    // Confluence 페이지 내용 가져오기
    async fetchPageContent(pageId) {
        if (!this.apiToken) {
            throw new Error('Confluence API Token이 설정되지 않았습니다.');
        }

        try {
            // Netlify Functions를 통해 호출 (우선)
            let apiUrl;
            if (typeof window !== 'undefined' && window.getConfluenceApiUrl) {
                apiUrl = window.getConfluenceApiUrl();
            } else {
                // Fallback: 직접 Netlify URL 구성
                const netlifyUrl = 'https://monumental-kringle-4c13b3.netlify.app';
                const isFirebase = typeof window !== 'undefined' && (
                    window.location.hostname.includes('firebaseapp.com') || 
                    window.location.hostname.includes('web.app')
                );
                apiUrl = isFirebase 
                    ? `${netlifyUrl}/.netlify/functions/confluence`
                    : '/api/confluence';
            }
            
            // 이메일이 있으면 쿼리 파라미터에 포함
            let url = `${apiUrl}?pageId=${encodeURIComponent(pageId)}&apiToken=${encodeURIComponent(this.apiToken)}`;
            if (this.email) {
                url += `&email=${encodeURIComponent(this.email)}`;
            }
            
            console.log('Netlify Functions를 통해 Confluence API 호출 시도');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = errorData.error || `API 요청 실패: ${response.status} ${response.statusText}`;
                
                // 403 에러인 경우 상세 정보 포함
                if (response.status === 403) {
                    console.error('403 Forbidden 상세 정보:', errorData);
                    if (errorData.details) {
                        errorMessage += `\n상세: ${JSON.stringify(errorData.details)}`;
                    }
                    if (errorData.possibleCauses) {
                        errorMessage += `\n가능한 원인:\n${errorData.possibleCauses.map(c => `- ${c}`).join('\n')}`;
                    }
                } else if (response.status === 401) {
                    throw new Error('인증 실패: API Token 또는 이메일을 확인해주세요.');
                } else if (response.status === 404) {
                    throw new Error('페이지를 찾을 수 없습니다.');
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data.body.storage.value; // HTML 형식의 페이지 내용
        } catch (error) {
            console.error('Confluence 페이지 가져오기 실패:', error);
            
            // 네트워크 에러 체크
            if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
                throw new Error('Netlify Functions에 연결할 수 없습니다. Netlify 사이트가 배포되어 있는지 확인해주세요.');
            }
            
            throw error;
        }
    }

    // URL에서 페이지 ID 추출
    extractPageId(url) {
        try {
            // URL 형식: https://krafton.atlassian.net/wiki/spaces/.../pages/123456789/...
            const match = url.match(/\/pages\/(\d+)/);
            if (match) {
                return match[1];
            }
            // 또는 직접 페이지 ID가 URL에 있는 경우
            const directMatch = url.match(/\/wiki\/rest\/api\/content\/(\d+)/);
            if (directMatch) {
                return directMatch[1];
            }
            throw new Error('페이지 ID를 찾을 수 없습니다.');
        } catch (error) {
            console.error('페이지 ID 추출 실패:', error);
            throw error;
        }
    }

    // HTML에서 "용어" 섹션 파싱
    parseTermsSection(htmlContent) {
        const terms = [];
        
        try {
            // 임시 DOM 요소 생성
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // "용어" 제목 찾기
            const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, strong');
            let inTermsSection = false;
            let termsSection = null;

            for (let heading of headings) {
                const text = heading.textContent.trim();
                if (text.includes('용어') || text.includes('용어집')) {
                    inTermsSection = true;
                    // 다음 테이블이나 리스트 찾기
                    let nextElement = heading.nextElementSibling;
                    while (nextElement) {
                        if (nextElement.tagName === 'TABLE' || nextElement.tagName === 'UL' || nextElement.tagName === 'OL') {
                            termsSection = nextElement;
                            break;
                        }
                        nextElement = nextElement.nextElementSibling;
                    }
                    break;
                }
            }

            // 테이블에서 용어 추출
            if (termsSection && termsSection.tagName === 'TABLE') {
                const rows = termsSection.querySelectorAll('tr');
                for (let i = 1; i < rows.length; i++) { // 첫 번째 행은 헤더로 가정
                    const cells = rows[i].querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const korean = cells[0].textContent.trim();
                        const japanese = cells[1].textContent.trim();
                        if (korean && japanese) {
                            terms.push({ korean, japanese });
                        }
                    }
                }
            }
            // 리스트에서 용어 추출
            else if (termsSection && (termsSection.tagName === 'UL' || termsSection.tagName === 'OL')) {
                const items = termsSection.querySelectorAll('li');
                for (let item of items) {
                    const text = item.textContent.trim();
                    // 형식: "한국어 / 일본어" 또는 "한국어 - 일본어"
                    const match = text.match(/(.+?)\s*[\/\-]\s*(.+)/);
                    if (match) {
                        terms.push({
                            korean: match[1].trim(),
                            japanese: match[2].trim()
                        });
                    }
                }
            }
            // 일반 텍스트에서 용어 추출 (한국어-일본어 쌍 찾기)
            else {
                const text = doc.body.textContent || doc.body.innerText;
                const lines = text.split('\n');
                for (let line of lines) {
                    // 형식: "한국어 / 일본어" 또는 "한국어 - 일본어"
                    const match = line.match(/(.+?)\s*[\/\-]\s*(.+)/);
                    if (match) {
                        const korean = match[1].trim();
                        const japanese = match[2].trim();
                        // 한글과 일본어가 포함되어 있는지 확인
                        if (this.containsKorean(korean) && this.containsJapanese(japanese)) {
                            terms.push({ korean, japanese });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('용어 섹션 파싱 실패:', error);
        }

        return terms;
    }

    // 한글 포함 여부 확인
    containsKorean(text) {
        return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
    }

    // 일본어 포함 여부 확인
    containsJapanese(text) {
        return /[ひらがな|カタカナ|漢字]/.test(text) || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    }

    // 기존 용어집과 비교하여 새로운 용어 찾기
    async findNewTerms(extractedTerms) {
        try {
            // 현재 용어집 로드
            let existingTerms = [];
            if (window.glossaryManager && window.glossaryManager.terms) {
                existingTerms = window.glossaryManager.terms;
            } else if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('glossary', 'terms');
                if (data && data.terms) {
                    existingTerms = data.terms;
                }
            }

            // 기존 용어를 키로 변환 (한국어-일본어 쌍)
            const existingKeys = new Set(
                existingTerms.map(term => `${term.korean}|||${term.japanese}`.toLowerCase())
            );

            // 새로운 용어 필터링
            const newTerms = extractedTerms.filter(term => {
                const key = `${term.korean}|||${term.japanese}`.toLowerCase();
                return !existingKeys.has(key);
            });

            return newTerms;
        } catch (error) {
            console.error('새 용어 찾기 실패:', error);
            return extractedTerms; // 오류 시 전체 반환
        }
    }

    // 페이지 체크 및 새 용어 감지
    async checkPage(pageUrl, email = null) {
        // 이메일이 전달되면 저장
        if (email) {
            this.email = email;
        }
        try {
            const pageId = this.extractPageId(pageUrl);
            const htmlContent = await this.fetchPageContent(pageId);
            const extractedTerms = this.parseTermsSection(htmlContent);
            const newTerms = await this.findNewTerms(extractedTerms);

            return {
                pageUrl,
                pageId,
                extractedTerms,
                newTerms
            };
        } catch (error) {
            console.error('페이지 체크 실패:', error);
            throw error;
        }
    }

    // 모든 모니터링 페이지 체크
    async checkAllPages() {
        if (!this.apiToken || this.monitoredPages.length === 0) {
            return;
        }

        const results = [];
        for (let pageUrl of this.monitoredPages) {
            try {
                const result = await this.checkPage(pageUrl);
                results.push(result);

                // 자동 체크 기능 제거됨 - 알림 생성하지 않음
                // 수동으로 가져올 때는 알림이 필요 없음
                // if (result.newTerms && result.newTerms.length > 0) {
                //     await this.createNotifications(result);
                // }
            } catch (error) {
                console.error(`페이지 체크 실패 (${pageUrl}):`, error);
                results.push({
                    pageUrl,
                    error: error.message
                });
            }
        }

        this.lastCheckTime = new Date().toISOString();
        await this.saveSettings();

        return results;
    }

    // 알림 생성
    async createNotifications(checkResult) {
        if (!window.NotificationManager) {
            console.error('NotificationManager가 로드되지 않았습니다.');
            return;
        }

        for (let term of checkResult.newTerms) {
            await window.NotificationManager.createNotification({
                type: 'new_term',
                pageUrl: checkResult.pageUrl,
                pageId: checkResult.pageId,
                korean: term.korean,
                japanese: term.japanese,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
    }

    // 신규 페이지 체크 (ADK Meeting Hub 하위 페이지)
    async checkNewPages() {
        if (!this.apiToken || !this.email) {
            console.log('API Token 또는 이메일이 설정되지 않았습니다.');
            return [];
        }

        try {
            // Cloudflare Workers를 통해 호출
            let apiUrl;
            if (typeof window !== 'undefined' && window.getConfluenceApiUrl) {
                apiUrl = window.getConfluenceApiUrl();
            } else {
                apiUrl = '/api/confluence';
            }

            // 하위 페이지 목록 가져오기
            const url = `${apiUrl}?pageId=${encodeURIComponent(this.parentPageId)}&apiToken=${encodeURIComponent(this.apiToken)}&email=${encodeURIComponent(this.email)}&action=children&limit=20`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.status}`);
            }

            const data = await response.json();
            const pages = data.results || [];

            // 마지막 체크 이후 생성된 페이지 필터링
            const lastCheck = this.lastPageCheckTime ? new Date(this.lastPageCheckTime) : new Date(0);
            const newPages = pages.filter(page => {
                const pageDate = new Date(page.version.when);
                return pageDate > lastCheck;
            });

            // 마지막 체크 시간 업데이트
            if (pages.length > 0) {
                this.lastPageCheckTime = new Date().toISOString();
                await this.saveSettings();
            }

            return newPages;
        } catch (error) {
            console.error('신규 페이지 체크 실패:', error);
            throw error;
        }
    }

    // 알림 패널 표시 (옵션 2)
    showNewPagesNotification(newPages) {
        // 기존 알림 패널이 있으면 제거
        const existingPanel = document.getElementById('newPagesNotificationPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // 알림 패널 생성
        const panel = document.createElement('div');
        panel.id = 'newPagesNotificationPanel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-width: 90vw;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border: 2px solid #f9423a;
            z-index: 10000;
            font-family: 'Pretendard', 'Nanum Gothic', sans-serif;
        `;

        const pagesList = newPages.map(page => {
            const date = new Date(page.version.when);
            const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            return `- ${dateStr} ${page.title}`;
        }).join('\n');

        panel.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #e0e0e0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 18px; color: #333; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📢</span>
                        신규 회의록 발견!
                    </h3>
                    <button id="closeNotificationBtn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; color: #333; white-space: pre-line; line-height: 1.8; max-height: 300px; overflow-y: auto;">
${pagesList}
                </div>
            </div>
            <div style="padding: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="laterNotificationBtn" style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666;">나중에</button>
                <button id="extractTermsBtn" style="padding: 10px 20px; background: linear-gradient(135deg, #f9423a 0%, #f9423a 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(249, 66, 58, 0.3);">용어 추출하기</button>
            </div>
        `;

        document.body.appendChild(panel);

        // 닫기 버튼
        panel.querySelector('#closeNotificationBtn').addEventListener('click', () => {
            panel.remove();
        });

        // 나중에 버튼
        panel.querySelector('#laterNotificationBtn').addEventListener('click', () => {
            panel.remove();
        });

        // 용어 추출하기 버튼
        panel.querySelector('#extractTermsBtn').addEventListener('click', async () => {
            panel.remove();
            await this.extractTermsFromNewPages(newPages);
        });
    }

    // 신규 페이지에서 용어 추출
    async extractTermsFromNewPages(newPages) {
        if (!window.glossaryManager) {
            alert('GlossaryManager가 로드되지 않았습니다.');
            return;
        }

        try {
            // 로딩 표시
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'extractingTermsLoading';
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <div style="font-size: 16px; color: #333; margin-bottom: 15px;">용어를 추출하는 중...</div>
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #f9423a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            `;
            document.body.appendChild(loadingDiv);

            let allNewTerms = [];
            for (const page of newPages) {
                try {
                    const pageUrl = `${this.baseURL}/wiki/spaces/EASTTRANS/pages/${page.id}`;
                    const result = await this.checkPage(pageUrl);
                    if (result.newTerms && result.newTerms.length > 0) {
                        allNewTerms = allNewTerms.concat(result.newTerms);
                    }
                } catch (error) {
                    console.error(`페이지 ${page.title}에서 용어 추출 실패:`, error);
                }
            }

            loadingDiv.remove();

            if (allNewTerms.length === 0) {
                alert('새로운 용어가 없습니다.');
                return;
            }

            // 카테고리 선택 모달 표시
            const category = await this.selectCategory();
            if (!category) {
                return;
            }

            // 용어 추가
            let addedCount = 0;
            for (const term of allNewTerms) {
                try {
                    const manager = window.glossaryManager;
                    const korean = term.korean.trim();
                    const japanese = term.japanese.trim();

                    if (!korean || !japanese) continue;

                    // 중복 체크
                    const isDuplicate = manager.terms.some(t => 
                        t.korean === korean && t.japanese === japanese
                    );

                    if (isDuplicate) continue;

                    // 새 ID 생성
                    let newId = 1;
                    if (manager.terms.length > 0) {
                        const maxId = Math.max(...manager.terms.map(t => t.id || 0));
                        newId = maxId >= 1 ? maxId + 1 : 1;
                    }

                    manager.terms.push({
                        id: newId,
                        korean,
                        japanese,
                        category: [category],
                        notes: 'Confluence 회의록에서 자동 추출',
                        updatedAt: new Date().toISOString()
                    });

                    addedCount++;
                } catch (error) {
                    console.error('용어 추가 실패:', term, error);
                }
            }

            if (addedCount > 0) {
                await window.glossaryManager.saveData();
                alert(`${addedCount}개의 용어가 성공적으로 추가되었습니다.`);
                
                // 메인 페이지로 리다이렉트
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                } else {
                    // 페이지 새로고침
                    window.location.reload();
                }
            } else {
                alert('추가할 새로운 용어가 없습니다.');
            }
        } catch (error) {
            console.error('용어 추출 실패:', error);
            alert('용어 추출 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 카테고리 선택 모달
    async selectCategory() {
        return new Promise((resolve) => {
            if (!window.glossaryManager || !window.glossaryManager.categories || window.glossaryManager.categories.length === 0) {
                resolve(null);
                return;
            }

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
            `;

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333;">카테고리 선택</h3>
                    <div id="categorySelectRadio" style="margin-bottom: 20px;"></div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="modalCancelBtn" style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">취소</button>
                        <button id="modalConfirmBtn" style="padding: 10px 20px; background: #f9423a; color: white; border: none; border-radius: 6px; cursor: pointer;">확인</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const radioContainer = modal.querySelector('#categorySelectRadio');
            window.glossaryManager.categories.forEach(cat => {
                const radioDiv = document.createElement('div');
                radioDiv.style.cssText = 'margin-bottom: 10px;';
                radioDiv.innerHTML = `
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="selectCategory" value="${cat}" style="margin-right: 8px;">
                        <span>${cat}</span>
                    </label>
                `;
                radioContainer.appendChild(radioDiv);
            });

            const closeModal = () => {
                document.body.removeChild(modal);
                resolve(null);
            };

            modal.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            modal.querySelector('#modalConfirmBtn').addEventListener('click', () => {
                const selected = modal.querySelector('input[name="selectCategory"]:checked');
                const category = selected ? selected.value : null;
                document.body.removeChild(modal);
                resolve(category);
            });
        });
    }

    // 주기적 체크 시작 (신규 페이지 체크만)
    startPeriodicCheck() {
        // 자동 가져오기가 비활성화되어 있으면 시작하지 않음
        if (!this.autoCheckEnabled) {
            console.log('자동 가져오기가 비활성화되어 있습니다.');
            return;
        }

        // 기존 타이머가 있으면 중지
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }

        // 신규 페이지 체크만 주기적으로 실행
        const checkNewPagesPeriodically = async () => {
            try {
                const newPages = await this.checkNewPages();
                if (newPages && newPages.length > 0) {
                    this.showNewPagesNotification(newPages);
                }
            } catch (error) {
                console.error('신규 페이지 체크 실패:', error);
            }
        };

        // 주기적으로 체크 (24시간마다)
        this.checkTimer = setInterval(checkNewPagesPeriodically, this.checkInterval);
    }

    // 주기적 체크 중지
    stopPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
    }

    // 수동 새로고침
    async manualRefresh() {
        try {
            const results = await this.checkAllPages();
            return results;
        } catch (error) {
            console.error('수동 새로고침 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
window.confluenceIntegration = new ConfluenceIntegration();

// 자동 초기화 (Firebase 준비 후)
(async function() {
    try {
        if (typeof waitForFirebaseSDK === 'function') {
            await waitForFirebaseSDK();
        }
        await window.confluenceIntegration.initialize();
    } catch (error) {
        console.error('Confluence 통합 초기화 실패:', error);
    }
})();
