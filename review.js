// 번역물 리뷰 - 텍스트 추출기
class ReviewExtractor {
    constructor() {
        this.currentFile = null;
        this.extractedText = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        const fileInput = document.getElementById('fileInput');
        const extractBtn = document.getElementById('extractBtn');
        const clearBtn = document.getElementById('clearBtn');
        const checkSpellingBtn = document.getElementById('checkSpellingBtn');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        if (extractBtn) {
            extractBtn.addEventListener('click', async () => {
                await this.extractText();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAll();
            });
        }

        if (checkSpellingBtn) {
            checkSpellingBtn.addEventListener('click', async () => {
                await this.checkSpelling();
            });
        }

        // API 키 관리
        this.setupApiKeyListeners();
    }

    setupApiKeyListeners() {
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        const apiKeyInput = document.getElementById('claudeApiKeyInput');
        
        // API 키 상태 표시 업데이트 함수
        const updateApiKeyStatus = () => {
            const apiKey = localStorage.getItem('claude_api_key');
            const statusText = document.getElementById('apiKeyStatus');
            if (statusText) {
                if (apiKey && apiKey.trim()) {
                    statusText.textContent = '✅ API 키가 저장되어 있습니다. 오탈자 점검 기능을 사용할 수 있습니다.';
                    statusText.style.color = '#27ae60';
                } else {
                    statusText.textContent = '⚠️ API 키가 없습니다. 오탈자 점검 기능을 사용할 수 없습니다.';
                    statusText.style.color = '#f39c12';
                }
            }
        };
        
        if (saveApiKeyBtn && apiKeyInput) {
            saveApiKeyBtn.addEventListener('click', () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    localStorage.setItem('claude_api_key', apiKey);
                    updateApiKeyStatus();
                    alert('✅ API 키가 저장되었습니다. 이제 오탈자 점검 기능을 사용할 수 있습니다.');
                } else {
                    alert('API 키를 입력해주세요.');
                }
            });
        }
        
        if (clearApiKeyBtn) {
            clearApiKeyBtn.addEventListener('click', () => {
                localStorage.removeItem('claude_api_key');
                if (apiKeyInput) apiKeyInput.value = '';
                updateApiKeyStatus();
                alert('API 키가 삭제되었습니다.');
            });
        }
        
        // 저장된 API 키 로드
        if (apiKeyInput) {
            const savedKey = localStorage.getItem('claude_api_key');
            if (savedKey) {
                apiKeyInput.value = savedKey;
            }
            // 초기 상태 표시
            updateApiKeyStatus();
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        const fileInfo = document.getElementById('fileInfo');
        const extractBtn = document.getElementById('extractBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (file) {
            this.currentFile = file;
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            fileInfo.style.display = 'block';
            fileInfo.innerHTML = `
                <strong>선택된 파일:</strong> ${this.escapeHtml(file.name)}<br>
                <strong>크기:</strong> ${fileSize} MB<br>
                <strong>형식:</strong> ${file.type || this.getFileType(file.name)}
            `;
            extractBtn.disabled = false;
            clearBtn.disabled = false;
        } else {
            this.currentFile = null;
            fileInfo.style.display = 'none';
            extractBtn.disabled = true;
            clearBtn.disabled = true;
        }
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pptx') return 'PowerPoint Presentation';
        if (ext === 'docx') return 'Word Document';
        return 'Unknown';
    }

    async extractText() {
        if (!this.currentFile) {
            alert('파일을 선택해주세요.');
            return;
        }

        const loadingInfo = document.getElementById('loadingInfo');
        const loadingMessage = document.getElementById('loadingMessage');
        const extractBtn = document.getElementById('extractBtn');
        const extractedTextSection = document.getElementById('extractedTextSection');
        const textContent = document.getElementById('textContent');
        const textStats = document.getElementById('textStats');

        try {
            loadingInfo.style.display = 'block';
            extractBtn.disabled = true;
            extractedTextSection.classList.remove('show');

            const filename = this.currentFile.name.toLowerCase();
            let allText = '';

            if (filename.endsWith('.pptx')) {
                loadingMessage.textContent = 'PPTX 파일에서 텍스트 추출 중...';
                allText = await this.extractFromPPTX(this.currentFile);
            } else if (filename.endsWith('.docx')) {
                loadingMessage.textContent = 'DOCX 파일에서 텍스트 추출 중...';
                allText = await this.extractFromDOCX(this.currentFile);
            } else {
                throw new Error('지원하지 않는 파일 형식입니다. PPTX 또는 DOCX 파일을 선택해주세요.');
            }

            this.extractedText = allText;
            
            // 통계 계산 (공백 제외 문자 수만)
            const charactersNoSpaces = allText.replace(/\s/g, '').length;

            textStats.innerHTML = `
                <strong>📊 텍스트 통계:</strong><br>
                문자 수(공백 제외): ${charactersNoSpaces}자
            `;

            textContent.textContent = allText;
            extractedTextSection.classList.add('show');
            
            // 오탈자 점검 버튼 활성화
            const checkSpellingBtn = document.getElementById('checkSpellingBtn');
            if (checkSpellingBtn) {
                checkSpellingBtn.disabled = false;
            }
            
            alert(`텍스트 추출이 완료되었습니다!\n\n문자 수(공백 제외): ${charactersNoSpaces}자`);

        } catch (error) {
            console.error('텍스트 추출 오류:', error);
            alert(`텍스트 추출 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            loadingInfo.style.display = 'none';
            extractBtn.disabled = false;
        }
    }

    async extractFromPPTX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const slideContents = []; // 슬라이드별 전체 내용 저장
                    const seenSlideContents = new Set(); // 중복 체크용

                    // 슬라이드 파일 찾기
                    const slideFiles = Object.keys(zip.files).filter(name => 
                        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
                    ).sort((a, b) => {
                        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
                        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
                        return numA - numB;
                    });

                    for (let i = 0; i < slideFiles.length; i++) {
                        const slideFile = zip.files[slideFiles[i]];
                        const xmlContent = await slideFile.async('string');
                        const texts = this.extractTextFromXML(xmlContent);
                        
                        if (texts.length > 0) {
                            // 슬라이드 내에서 중복 제거
                            const uniqueTexts = this.removeDuplicates(texts);
                            
                            if (uniqueTexts.length > 0) {
                                // 슬라이드 전체 텍스트를 하나로 합침 (정규화)
                                const slideText = uniqueTexts.join('\n').trim();
                                const normalizedSlideText = this.normalizeText(slideText);
                                
                                // 정규화된 텍스트로 중복 체크
                                if (seenSlideContents.has(normalizedSlideText)) {
                                    // 완전히 동일한 슬라이드는 스킵
                                    continue;
                                }
                                
                                // 부분 중복 체크 (90% 이상 유사하면 중복으로 간주)
                                let isDuplicate = false;
                                for (const existing of seenSlideContents) {
                                    if (normalizedSlideText.length > 100 && existing.length > 100) {
                                        const similarity = this.calculateTextSimilarity(normalizedSlideText, existing);
                                        if (similarity > 0.9) {
                                            isDuplicate = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (isDuplicate) {
                                    continue;
                                }
                                
                                seenSlideContents.add(normalizedSlideText);
                                slideContents.push({
                                    slideNum: i + 1,
                                    texts: uniqueTexts
                                });
                            }
                        }
                    }

                    // 최종 텍스트 조합
                    const allTexts = [];
                    for (const slide of slideContents) {
                        allTexts.push(...slide.texts);
                        allTexts.push(''); // 빈 줄 추가
                    }

                    // 전체 결과에서도 중복 제거 (연속된 동일 텍스트 및 부분 중복)
                    let finalText = allTexts.join('\n');
                    
                    // 슬라이드 헤더를 제외한 순수 텍스트만으로 중복 체크
                    finalText = this.removeAllDuplicates(finalText);
                    
                    // 최종 검증: 연속된 긴 텍스트 블록 중복 제거
                    finalText = this.removeConsecutiveLongBlocks(finalText);
                    
                    resolve(finalText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsArrayBuffer(file);
        });
    }

    async extractFromDOCX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const allTexts = [];

                    // document.xml 파일 읽기
                    const documentXml = zip.files['word/document.xml'];
                    if (!documentXml) {
                        reject(new Error('문서 파일을 찾을 수 없습니다.'));
                        return;
                    }

                    const xmlContent = await documentXml.async('string');
                    const texts = this.extractTextFromWordXML(xmlContent);
                    
                    resolve(texts.join('\n'));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsArrayBuffer(file);
        });
    }

    extractTextFromXML(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const texts = [];
        const seenTexts = new Set(); // 중복 체크용
        const seenPartialTexts = new Map(); // 부분 중복 체크용 (긴 텍스트용)

        // 슬라이드의 spTree 찾기
        let spTree = null;
        const allElements = xmlDoc.getElementsByTagName('*');
        for (let elem of allElements) {
            const tagName = elem.tagName || '';
            if (tagName.includes('spTree') || tagName === 'spTree') {
                spTree = elem;
                break;
            }
        }
        
        if (!spTree) {
            spTree = xmlDoc.documentElement;
        }

        // 각 shape에서 텍스트 추출
        const childNodes = Array.from(spTree.childNodes);
        for (let node of childNodes) {
            if (node.nodeType !== 1) continue;
            
            const tagName = node.tagName || '';
            if (tagName.includes('sp') || tagName.includes('pic') || tagName.includes('graphicFrame')) {
                const shapeText = this.extractTextFromShape(node);
                if (shapeText && shapeText.trim()) {
                    const normalized = this.normalizeText(shapeText.trim());
                    
                    // 완전히 동일한 텍스트 체크
                    if (seenTexts.has(normalized)) {
                        continue;
                    }
                    
                    // 긴 텍스트(30자 이상)의 경우 부분 중복 체크
                    if (normalized.length >= 30) {
                        let isDuplicate = false;
                        for (const existingText of seenPartialTexts.values()) {
                            // 85% 이상 유사하면 중복으로 간주
                            const similarity = this.calculateTextSimilarity(normalized, existingText);
                            if (similarity > 0.85) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        if (isDuplicate) {
                            continue;
                        }
                        seenPartialTexts.set(normalized.substring(0, Math.min(50, normalized.length)), normalized);
                    }
                    
                    seenTexts.add(normalized);
                    texts.push(shapeText.trim()); // 원본 텍스트 저장 (정규화 전)
                }
            }
        }

        return texts.filter(text => text.length > 0);
    }

    extractTextFromShape(shape) {
        // graphicFrame (테이블) 처리
        const tagName = shape.tagName || '';
        if (tagName.includes('graphicFrame')) {
            const tableText = this.extractTextFromTable(shape);
            return tableText;
        } else {
            // 일반 shape에서 모든 텍스트를 추출
            const shapeText = this.extractAllTextFromElement(shape);
            return shapeText;
        }
    }

    extractAllTextFromElement(element) {
        const lines = [];
        const seenLines = new Set(); // 중복 체크용
        
        // a:txBody 또는 p:txBody 찾기
        let txBody = null;
        const allElements = element.getElementsByTagName('*');
        for (let node of allElements) {
            const tagName = node.tagName || '';
            if (tagName.includes('txBody') || tagName === 'txBody') {
                txBody = node;
                break;
            }
        }
        
        if (txBody) {
            // txBody 내의 모든 a:p (단락) 찾기
            const childNodes = Array.from(txBody.childNodes);
            for (let node of childNodes) {
                if (node.nodeType !== 1) continue;
                const tagName = node.tagName || '';
                if (tagName.endsWith(':p') || tagName === 'p') {
                    const paraText = this.extractTextFromParagraph(node);
                    if (paraText && paraText.trim()) {
                        const normalized = paraText.trim();
                        // 중복 체크
                        if (!seenLines.has(normalized)) {
                            seenLines.add(normalized);
                            lines.push(normalized);
                        }
                    }
                }
            }
        } else {
            // txBody가 없으면 직접 a:t 태그에서 텍스트 추출
            const textNodes = element.getElementsByTagName('*');
            const texts = [];
            for (let node of textNodes) {
                const tagName = node.tagName || '';
                if (tagName.endsWith(':t') || tagName === 't') {
                    const text = node.textContent ? node.textContent.trim() : '';
                    if (text) {
                        texts.push(text);
                    }
                }
            }
            if (texts.length > 0) {
                const combined = texts.join(' ');
                if (!seenLines.has(combined)) {
                    seenLines.add(combined);
                    lines.push(combined);
                }
            }
        }
        
        return lines.join('\n');
    }

    extractTextFromParagraph(paragraph) {
        const texts = [];
        const childNodes = Array.from(paragraph.childNodes);
        
        for (let node of childNodes) {
            if (node.nodeType !== 1) continue;
            const tagName = node.tagName || '';
            
            // a:r (run) 또는 a:t (text) 찾기
            if (tagName.endsWith(':r') || tagName === 'r') {
                const tElements = node.getElementsByTagName('*');
                for (let tElem of tElements) {
                    const tTagName = tElem.tagName || '';
                    if (tTagName.endsWith(':t') || tTagName === 't') {
                        const text = tElem.textContent || '';
                        if (text) {
                            texts.push(text);
                        }
                    }
                }
            } else if (tagName.endsWith(':t') || tagName === 't') {
                const text = node.textContent || '';
                if (text) {
                    texts.push(text);
                }
            }
        }
        
        return texts.join('');
    }

    extractTextFromTable(shape) {
        const tableTexts = [];
        const tables = shape.getElementsByTagName('*');
        
        for (let table of tables) {
            const tableTagName = table.tagName || '';
            if (tableTagName.includes('tbl') || tableTagName === 'tbl') {
                // 테이블의 각 행에서 텍스트 추출
                const rows = table.getElementsByTagName('*');
                for (let row of rows) {
                    const rowTagName = row.tagName || '';
                    if (rowTagName.includes('tr') || rowTagName === 'tr') {
                        const rowTexts = [];
                        const cells = row.getElementsByTagName('*');
                        for (let cell of cells) {
                            const cellTagName = cell.tagName || '';
                            if (cellTagName.includes('tc') || cellTagName === 'tc') {
                                const cellText = this.extractAllTextFromElement(cell);
                                if (cellText && cellText.trim()) {
                                    rowTexts.push(cellText.trim());
                                }
                            }
                        }
                        if (rowTexts.length > 0) {
                            tableTexts.push(rowTexts.join(' | '));
                        }
                    }
                }
            }
        }
        
        return tableTexts.join('\n');
    }

    extractTextFromWordXML(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const texts = [];

        // 모든 텍스트 요소 찾기 (w:t)
        const textElements = xmlDoc.getElementsByTagName('*');
        for (let elem of textElements) {
            const tagName = elem.tagName || '';
            if (tagName.includes('t') && (tagName.endsWith('t') || tagName.includes(':t'))) {
                const text = elem.textContent || '';
                if (text.trim()) {
                    texts.push(text.trim());
                }
            }
        }

        // 문단 구분을 위해 줄바꿈 추가
        const paragraphs = [];
        let currentParagraph = [];
        
        for (let text of texts) {
            if (text) {
                currentParagraph.push(text);
            } else if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
        }
        
        if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
        }

        return paragraphs;
    }

    async checkSpelling() {
        if (!this.extractedText || !this.extractedText.trim()) {
            alert('먼저 텍스트를 추출해주세요.');
            return;
        }

        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey || !apiKey.trim()) {
            alert('Claude API 키가 필요합니다. API 키를 설정해주세요.');
            return;
        }

        const checkSpellingBtn = document.getElementById('checkSpellingBtn');
        const spellingResultSection = document.getElementById('spellingResultSection');
        const spellingResult = document.getElementById('spellingResult');
        const loadingInfo = document.getElementById('loadingInfo');

        try {
            if (checkSpellingBtn) checkSpellingBtn.disabled = true;
            if (loadingInfo) {
                loadingInfo.style.display = 'block';
                const loadingMessage = document.getElementById('loadingMessage');
                if (loadingMessage) {
                    loadingMessage.textContent = 'AI가 오탈자를 점검하는 중...';
                }
            }

            // 텍스트가 너무 길면 분할 처리
            const maxLength = 100000; // API 제한을 고려한 최대 길이
            let textToCheck = this.extractedText;
            
            if (textToCheck.length > maxLength) {
                textToCheck = textToCheck.substring(0, maxLength) + '\n\n[주의: 텍스트가 너무 길어 일부만 점검되었습니다.]';
            }

            const prompt = `다음 텍스트에서 오탈자와 문제점을 찾아서 알려주세요.

텍스트:
${textToCheck}

다음 항목들을 점검해주세요:
1. 맞춤법 및 띄어쓰기 오류
2. 번역 누락 (번역되지 않은 부분, 불완전한 번역)
3. 일관성 문제 (용어 일관성, 문체 일관성)
4. 문장부호 오류 (한국어 텍스트에서 전각 기호 사용 - 예: ，。！？ 등은 반각으로 수정 필요)

각 문제에 대해 다음 형식으로 답변해주세요:
- 발견된 부분을 인용
- 어떤 문제인지 설명
- 수정 제안

문제가 없으면 "문제가 발견되지 않았습니다."라고 답변해주세요.`;

            // 현재 호스트와 포트를 사용하여 API 호출
            const apiUrl = window.location.origin + '/api/claude';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4000,
                    temperature: 0.3,
                    system: 'You are a helpful assistant that checks for spelling, grammar, and typographical errors in Korean and Japanese text.',
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                let errorMessage = `API 오류: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error?.message) {
                        errorMessage = errorData.error.message;
                    } else if (errorData.error) {
                        errorMessage = JSON.stringify(errorData.error);
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 기본 메시지 사용
                    if (response.status === 405) {
                        errorMessage = '서버가 POST 요청을 허용하지 않습니다. Python 서버(server.py)가 포트 3000에서 실행 중인지 확인해주세요.';
                    } else if (response.status === 404) {
                        errorMessage = 'API 엔드포인트를 찾을 수 없습니다. Python 서버(server.py)가 실행 중인지 확인해주세요.';
                    }
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const resultText = data.content?.[0]?.text || '오탈자 점검 결과를 가져올 수 없습니다.';

            if (spellingResult) {
                // 결과를 포맷팅하여 표시
                const formattedResult = this.formatSpellingResult(resultText);
                spellingResult.innerHTML = formattedResult;
            }
            if (spellingResultSection) {
                spellingResultSection.style.display = 'block';
                // 결과 섹션으로 스크롤
                spellingResultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

        } catch (error) {
            console.error('오탈자 점검 오류:', error);
            alert(`오탈자 점검 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            if (checkSpellingBtn) checkSpellingBtn.disabled = false;
            if (loadingInfo) loadingInfo.style.display = 'none';
        }
    }

    clearAll() {
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const extractBtn = document.getElementById('extractBtn');
        const clearBtn = document.getElementById('clearBtn');
        const checkSpellingBtn = document.getElementById('checkSpellingBtn');
        const extractedTextSection = document.getElementById('extractedTextSection');
        const spellingResultSection = document.getElementById('spellingResultSection');
        const loadingInfo = document.getElementById('loadingInfo');

        this.currentFile = null;
        this.extractedText = null;
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (extractBtn) extractBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (checkSpellingBtn) checkSpellingBtn.disabled = true;
        if (extractedTextSection) extractedTextSection.classList.remove('show');
        if (spellingResultSection) spellingResultSection.style.display = 'none';
        if (loadingInfo) loadingInfo.style.display = 'none';
    }

    removeDuplicates(texts) {
        // 정확히 같은 텍스트 제거
        const seen = new Set();
        const unique = [];
        
        for (const text of texts) {
            const normalized = text.trim();
            if (normalized && !seen.has(normalized)) {
                seen.add(normalized);
                unique.push(text);
            }
        }
        
        return unique;
    }

    removeAllDuplicates(text) {
        // 여러 단계의 중복 제거 수행
        let result = text;
        
        // 1단계: 연속된 동일한 줄 제거
        result = this.removeConsecutiveDuplicates(result);
        
        // 2단계: 슬라이드 단위로 중복 제거
        result = this.removeDuplicateSlides(result);
        
        // 3단계: 긴 텍스트 블록의 중복 제거 (50자 이상)
        result = this.removeLongDuplicateBlocks(result);
        
        // 4단계: 부분적으로 중복되는 긴 텍스트 제거
        result = this.removePartialDuplicates(result);
        
        return result;
    }

    removeDuplicateSlides(text) {
        // 슬라이드 단위로 중복 제거 (슬라이드 헤더 없이 처리)
        const lines = text.split('\n');
        const result = [];
        const slideBlocks = [];
        let currentBlock = [];
        
        // 슬라이드별로 블록 분리 (빈 줄 기준)
        for (const line of lines) {
            const trimmed = line.trim();
            
            // 빈 줄이면 블록 구분
            if (trimmed === '' && currentBlock.length > 0) {
                const blockContent = currentBlock.join('\n').trim();
                if (blockContent) {
                    slideBlocks.push(blockContent);
                }
                currentBlock = [];
            } else if (trimmed !== '') {
                currentBlock.push(line);
            }
        }
        
        // 마지막 블록 추가
        if (currentBlock.length > 0) {
            const blockContent = currentBlock.join('\n').trim();
            if (blockContent) {
                slideBlocks.push(blockContent);
            }
        }
        
        // 중복 슬라이드 제거
        const seenContents = new Set();
        for (const slideContent of slideBlocks) {
            const normalized = this.normalizeText(slideContent);
            
            // 완전히 동일한 슬라이드 체크
            if (seenContents.has(normalized)) {
                continue;
            }
            
            // 부분 중복 체크 (90% 이상 유사)
            let isDuplicate = false;
            for (const existing of seenContents) {
                if (normalized.length > 100 && existing.length > 100) {
                    const similarity = this.calculateTextSimilarity(normalized, existing);
                    if (similarity > 0.9) {
                        isDuplicate = true;
                        break;
                    }
                }
            }
            
            if (!isDuplicate) {
                seenContents.add(normalized);
                if (slideContent) {
                    result.push(...slideContent.split('\n'));
                }
                result.push(''); // 빈 줄 추가
            }
        }
        
        return result.join('\n');
    }

    removeConsecutiveDuplicates(text) {
        // 연속된 동일한 줄 제거
        const lines = text.split('\n');
        const result = [];
        let lastLine = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            // 빈 줄이거나 이전 줄과 다르면 추가
            if (trimmed === '' || trimmed !== lastLine.trim()) {
                result.push(line);
                lastLine = line;
            }
        }
        
        return result.join('\n');
    }

    removeLongDuplicateBlocks(text) {
        // 50자 이상인 텍스트 블록의 중복 제거
        const lines = text.split('\n');
        const seen = new Set();
        const result = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            // 슬라이드 헤더는 그대로 유지
            if (trimmed.startsWith('[슬라이드')) {
                result.push(line);
                continue;
            }
            
            // 긴 텍스트(50자 이상)는 중복 체크
            if (trimmed.length >= 50) {
                if (!seen.has(trimmed)) {
                    seen.add(trimmed);
                    result.push(line);
                }
            } else {
                // 짧은 텍스트는 그대로 추가
                result.push(line);
            }
        }
        
        return result.join('\n');
    }

    removePartialDuplicates(text) {
        // 부분적으로 중복되는 긴 텍스트 제거
        const lines = text.split('\n');
        const result = [];
        const seenBlocks = new Map(); // 텍스트의 첫 100자를 키로 사용
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // 빈 줄은 그대로 유지
            if (trimmed === '') {
                result.push(line);
                continue;
            }
            
            // 긴 텍스트(50자 이상)에 대해 부분 중복 체크
            if (trimmed.length >= 50) {
                const normalized = this.normalizeText(trimmed);
                const key = normalized.substring(0, Math.min(100, normalized.length));
                
                let isDuplicate = false;
                if (seenBlocks.has(key)) {
                    const existing = seenBlocks.get(key);
                    // 85% 이상 유사하면 중복으로 간주
                    const similarity = this.calculateTextSimilarity(normalized, existing);
                    if (similarity > 0.85) {
                        isDuplicate = true;
                    }
                }
                
                if (!isDuplicate) {
                    // 모든 기존 항목과 비교
                    for (const [existingKey, existingText] of seenBlocks.entries()) {
                        if (normalized.length > 50 && existingText.length > 50) {
                            const similarity = this.calculateTextSimilarity(normalized, existingText);
                            if (similarity > 0.85) {
                                isDuplicate = true;
                                break;
                            }
                        }
                    }
                }
                
                if (isDuplicate) {
                    // 중복이므로 스킵
                    continue;
                }
                
                seenBlocks.set(key, normalized);
            }
            
            result.push(line);
        }
        
        return result.join('\n');
    }

    normalizeText(text) {
        // 텍스트 정규화: 공백 정리, 특수문자 제거
        return text
            .replace(/\s+/g, ' ') // 여러 공백을 하나로
            .replace(/\n\s*\n/g, '\n') // 빈 줄 정리
            .trim();
    }

    calculateTextSimilarity(text1, text2) {
        // 두 텍스트의 유사도 계산 (더 정확한 방법)
        const normalized1 = this.normalizeText(text1);
        const normalized2 = this.normalizeText(text2);
        
        if (normalized1 === normalized2) return 1.0;
        
        const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
        const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
        
        if (longer.length === 0) return 1.0;
        
        // 공통 단어 비율 계산
        const words1 = new Set(normalized1.split(/\s+/).filter(w => w.length > 0));
        const words2 = new Set(normalized2.split(/\s+/).filter(w => w.length > 0));
        
        let commonWords = 0;
        for (const word of words1) {
            if (words2.has(word)) {
                commonWords++;
            }
        }
        
        const totalWords = Math.max(words1.size, words2.size);
        const wordSimilarity = totalWords > 0 ? commonWords / totalWords : 0;
        
        // 문자열 유사도도 계산
        let commonChars = 0;
        const minLength = Math.min(normalized1.length, normalized2.length);
        for (let i = 0; i < minLength; i++) {
            if (normalized1[i] === normalized2[i]) {
                commonChars++;
            }
        }
        const charSimilarity = longer.length > 0 ? commonChars / longer.length : 0;
        
        // 두 유사도의 평균 사용
        return (wordSimilarity * 0.7 + charSimilarity * 0.3);
    }

    calculateSimilarity(text1, text2) {
        // 기존 함수 호환성을 위해 유지
        return this.calculateTextSimilarity(text1, text2);
    }

    removeConsecutiveLongBlocks(text) {
        // 연속된 긴 텍스트 블록의 중복 제거
        const lines = text.split('\n');
        const result = [];
        const recentBlocks = []; // 최근 블록들 저장 (최대 10개)
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // 빈 줄은 그대로 유지
            if (trimmed === '') {
                result.push(line);
                continue;
            }
            
            // 긴 텍스트(100자 이상)에 대해 최근 블록들과 비교
            if (trimmed.length >= 100) {
                const normalized = this.normalizeText(trimmed);
                let isDuplicate = false;
                
                // 최근 블록들과 비교
                for (const recentBlock of recentBlocks) {
                    if (recentBlock.length >= 100) {
                        const similarity = this.calculateTextSimilarity(normalized, recentBlock);
                        if (similarity > 0.9) {
                            isDuplicate = true;
                            break;
                        }
                    }
                }
                
                if (!isDuplicate) {
                    result.push(line);
                    // 최근 블록에 추가 (최대 10개 유지)
                    recentBlocks.push(normalized);
                    if (recentBlocks.length > 10) {
                        recentBlocks.shift();
                    }
                }
            } else {
                result.push(line);
            }
        }
        
        return result.join('\n');
    }

    formatSpellingResult(text) {
        // 결과 텍스트를 HTML로 포맷팅
        let html = text;
        
        // 줄바꿈 처리
        html = html.replace(/\n/g, '<br>');
        
        // 인용 부분 강조 (따옴표로 둘러싸인 부분)
        html = html.replace(/["'"]([^"'"]+)["']/g, '<span style="background: #fff3cd; padding: 2px 4px; border-radius: 3px; font-family: monospace;">"$1"</span>');
        
        // 번호가 있는 항목 강조 (1., 2., 3., 4. 등)
        html = html.replace(/(\d+\.\s+[^\n<]+)/g, '<strong style="color: #2a2a2a;">$1</strong>');
        
        // "문제가 발견되지 않았습니다" 강조
        html = html.replace(/문제가\s*발견되지\s*않았습니다/gi, '<span style="color: #27ae60; font-weight: 600;">문제가 발견되지 않았습니다</span>');
        
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 초기화
const reviewExtractor = new ReviewExtractor();
