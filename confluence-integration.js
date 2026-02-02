// Confluence API 연동 및 용어 추출
class ConfluenceIntegration {
    constructor() {
        this.baseURL = 'https://krafton.atlassian.net';
        this.apiToken = null;
        this.email = null; // Confluence 계정 이메일
        this.monitoredPages = [];
        this.checkInterval = 60 * 60 * 1000; // 기본 1시간
        this.checkTimer = null;
        this.lastCheckTime = null;
        this.initialized = false;
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
            lastCheckTime: this.lastCheckTime
        };

        try {
            if (window.RealtimeDBHelper) {
                await RealtimeDBHelper.set('settings/confluence', settings);
            }
            localStorage.setItem('confluenceSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Confluence 설정 저장 실패:', error);
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

                // 새 용어가 있으면 알림 생성
                if (result.newTerms && result.newTerms.length > 0) {
                    await this.createNotifications(result);
                }
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

    // 주기적 체크 시작
    startPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }

        // 즉시 한 번 체크
        this.checkAllPages().catch(error => {
            console.error('초기 페이지 체크 실패:', error);
        });

        // 주기적 체크
        this.checkTimer = setInterval(() => {
            this.checkAllPages().catch(error => {
                console.error('주기적 페이지 체크 실패:', error);
            });
        }, this.checkInterval);
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
