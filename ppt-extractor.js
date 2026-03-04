// 병렬 텍스트 추출기
class PPTExtractor {
    constructor() {
        this.koreanFileData = null;
        this.japaneseFileData = null;
        this.koreanFileType = null;
        this.japaneseFileType = null;
        this.extractedData = null;
        this.extractedKoreanTexts = []; // 추출된 한국어 텍스트 (매칭 전)
        this.extractedJapaneseTexts = []; // 추출된 일본어 텍스트 (매칭 전)
        this.selectedExtractedIndices = new Set(); // 선택된 추출 항목 인덱스
        this.currentExtractedPage = 1; // 현재 페이지
        this.extractedItemsPerPage = 20; // 페이지당 항목 수
        
        // 드래그 앤 드롭 관련 변수
        this.draggedRowIndex = null;
        this.dragOverRowIndex = null;
        this.isDragging = false;
        this.draggedCellType = null; // 'korean', 'japanese', 또는 null (행 전체)
        
        // DOM이 로드된 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('PPTExtractor 초기화 시작');
        
        const koreanInput = document.getElementById('koreanPptInput');
        const japaneseInput = document.getElementById('japanesePptInput');
        const extractBtn = document.getElementById('extractPptBtn');
        const addToCorpusBtn = document.getElementById('addToCorpusBtn');
        const clearExtractorBtn = document.getElementById('clearExtractorBtn');

        console.log('요소 찾기 결과:', {
            koreanInput: !!koreanInput,
            japaneseInput: !!japaneseInput,
            extractBtn: !!extractBtn,
            addToCorpusBtn: !!addToCorpusBtn,
            clearExtractorBtn: !!clearExtractorBtn
        });

        if (koreanInput) {
            koreanInput.addEventListener('change', async (e) => {
                console.log('한국어 파일 선택 이벤트 발생', e.target.files);
                await this.handleFileSelect(e, 'korean');
            });
            // input 이벤트도 추가 (일부 브라우저에서 change가 발생하지 않을 수 있음)
            koreanInput.addEventListener('input', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    console.log('한국어 파일 input 이벤트 발생', e.target.files);
                    await this.handleFileSelect(e, 'korean');
                }
            });
        } else {
            console.error('koreanPptInput을 찾을 수 없습니다.');
        }
        
        if (japaneseInput) {
            japaneseInput.addEventListener('change', async (e) => {
                console.log('일본어 파일 선택 이벤트 발생', e.target.files);
                await this.handleFileSelect(e, 'japanese');
            });
            // input 이벤트도 추가
            japaneseInput.addEventListener('input', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    console.log('일본어 파일 input 이벤트 발생', e.target.files);
                    await this.handleFileSelect(e, 'japanese');
                }
            });
        } else {
            console.error('japanesePptInput을 찾을 수 없습니다.');
        }
        
        if (extractBtn) {
            extractBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('추출 버튼 클릭됨');
                await this.extractAndMatchByPosition();
            });
        } else {
            console.error('extractPptBtn을 찾을 수 없습니다.');
        }
        
        // API 키 관리
        const apiKeySection = document.getElementById('apiKeySection');
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        const apiKeyInput = document.getElementById('claudeApiKeyInput');
        
        // API 키 저장 함수
        const saveApiKey = async (apiKey) => {
            // LocalStorage에 즉시 저장
            localStorage.setItem('claude_api_key', apiKey);
            
            // Firestore에도 저장
            try {
                if (window.FirestoreHelper) {
                    await FirestoreHelper.save('settings', 'claude_api_key', {
                        apiKey: apiKey
                    });
                }
            } catch (error) {
                console.error('Firestore에 API 키 저장 실패:', error);
            }
        };
        
        // API 키 로드 함수
        const loadApiKey = async () => {
            try {
                // Firestore에서 먼저 시도
                if (window.FirestoreHelper) {
                    const data = await FirestoreHelper.load('settings', 'claude_api_key');
                    if (data && data.apiKey) {
                        const apiKey = data.apiKey;
                        localStorage.setItem('claude_api_key', apiKey);
                        return apiKey;
                    }
                }
            } catch (error) {
                console.log('Firestore에서 API 키 로드 실패, LocalStorage 사용:', error);
            }
            
            // LocalStorage에서 로드
            return localStorage.getItem('claude_api_key');
        };
        
        // API 키 상태 표시 업데이트 함수
        const updateApiKeyStatus = () => {
            const apiKey = localStorage.getItem('claude_api_key');
            const statusText = document.getElementById('apiKeyStatus');
            
            // API 키가 있으면 섹션 숨기기, 없으면 표시
            if (apiKeySection) {
                if (apiKey && apiKey.trim()) {
                    apiKeySection.style.display = 'none';
                    apiKeySection.classList.remove('show');
                } else {
                    apiKeySection.style.display = 'block';
                    apiKeySection.classList.add('show');
                }
            }
            
            if (statusText) {
                if (apiKey && apiKey.trim()) {
                    statusText.textContent = '✅ API 키가 저장되어 있습니다. AI 기능을 사용할 수 있습니다.';
                    statusText.style.color = '#27ae60';
                } else {
                    statusText.textContent = '⚠️ API 키가 없습니다. 위치 기준 매칭만 사용됩니다.';
                    statusText.style.color = '#f39c12';
                }
            }
        };
        
        if (saveApiKeyBtn && apiKeyInput) {
            saveApiKeyBtn.addEventListener('click', async () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    await saveApiKey(apiKey);
                    updateApiKeyStatus();
                    alert('✅ API 키가 저장되었습니다. 이제 AI 기능을 사용할 수 있습니다.');
                } else {
                    alert('API 키를 입력해주세요.');
                }
            });
        }
        
        if (clearApiKeyBtn) {
            clearApiKeyBtn.addEventListener('click', async () => {
                localStorage.removeItem('claude_api_key');
                // Firestore에서도 삭제
                try {
                    if (window.FirestoreHelper) {
                        await FirestoreHelper.save('settings', 'claude_api_key', {
                            apiKey: ''
                        });
                    }
                } catch (error) {
                    console.error('Firestore에서 API 키 삭제 실패:', error);
                }
                if (apiKeyInput) apiKeyInput.value = '';
                updateApiKeyStatus();
                alert('API 키가 삭제되었습니다.');
            });
        }
        
        // API 키 섹션 토글 버튼 추가 (필요시 표시)
        const toggleApiKeySection = () => {
            if (apiKeySection) {
                const currentDisplay = apiKeySection.style.display;
                if (currentDisplay === 'none' || !apiKeySection.classList.contains('show')) {
                    apiKeySection.style.display = 'block';
                    apiKeySection.classList.add('show');
                } else {
                    const apiKey = localStorage.getItem('claude_api_key');
                    if (apiKey && apiKey.trim()) {
                        apiKeySection.style.display = 'none';
                        apiKeySection.classList.remove('show');
                    }
                }
            }
        };
        
        // 저장된 API 키 로드
        if (apiKeyInput) {
            loadApiKey().then(savedKey => {
                if (savedKey) {
                    apiKeyInput.value = savedKey;
                }
                // 초기 상태 표시
                updateApiKeyStatus();
            }).catch(err => {
                console.error('API 키 로드 실패:', err);
                updateApiKeyStatus();
            });
        }
        
        if (addToCorpusBtn) {
            addToCorpusBtn.addEventListener('click', () => this.addToCorpus());
        } else {
            console.warn('addToCorpusBtn을 찾을 수 없습니다. (아직 생성되지 않았을 수 있음)');
        }
        
        if (clearExtractorBtn) {
            clearExtractorBtn.addEventListener('click', () => this.clear());
        } else {
            console.warn('clearExtractorBtn을 찾을 수 없습니다.');
        }
        
        // 초기 버튼 상태 업데이트
        this.updateExtractButton();
        
        // 이미 선택된 파일이 있는지 확인하고 처리
        this.checkExistingFiles();
        
        console.log('PPTExtractor 초기화 완료');
    }
    
    // 이미 선택된 파일 확인 및 처리
    async checkExistingFiles() {
        const koreanInput = document.getElementById('koreanPptInput');
        const japaneseInput = document.getElementById('japanesePptInput');
        
        // 한국어 파일 확인
        if (koreanInput && koreanInput.files && koreanInput.files.length > 0) {
            console.log('이미 선택된 한국어 파일 발견:', koreanInput.files[0].name);
            const event = { target: koreanInput };
            await this.handleFileSelect(event, 'korean');
        }
        
        // 일본어 파일 확인
        if (japaneseInput && japaneseInput.files && japaneseInput.files.length > 0) {
            console.log('이미 선택된 일본어 파일 발견:', japaneseInput.files[0].name);
            const event = { target: japaneseInput };
            await this.handleFileSelect(event, 'japanese');
        }
    }

    async handleFileSelect(event, type) {
        console.log(`=== handleFileSelect 호출됨 (${type}) ===`, {
            event: event,
            target: event.target,
            files: event.target.files,
            fileCount: event.target.files ? event.target.files.length : 0
        });
        
        const file = event.target.files[0];
        if (!file) {
            console.log(`❌ 파일이 선택되지 않음 (${type})`);
            if (type === 'korean') {
                this.koreanFileData = null;
                this.koreanFileType = null;
            } else {
                this.japaneseFileData = null;
                this.japaneseFileType = null;
            }
            this.updateExtractButton();
            return;
        }
        
        console.log(`✅ 파일 선택 확인됨 (${type}):`, {
            name: file.name,
            size: file.size,
            type: file.type
        });
        
        console.log('파일 선택됨:', file.name, file.size, file.type);

        const statusDiv = document.getElementById(`${type}PptStatus`);
        if (statusDiv) {
            statusDiv.textContent = `⏳ 파일 읽는 중: ${file.name}...`;
            statusDiv.style.color = '#666';
        }

        try {
            console.log(`파일 선택됨 (${type}):`, file.name, file.type);
            
            const fileType = this.getFileType(file.name);
            console.log(`파일 타입: ${fileType}`);
            
            if (fileType === 'unknown') {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }
            
            // 파일 읽기 시작
            if (statusDiv) {
                statusDiv.textContent = `⏳ 파일 읽는 중: ${file.name}...`;
                statusDiv.style.color = '#f39c12';
            }
            
            const data = await this.readFile(file, fileType);
            
            console.log(`파일 읽기 완료 (${type}):`, {
                fileType: fileType,
                dataLength: data ? data.length : 0,
                data: data,
                isArray: Array.isArray(data)
            });
            
            // 데이터가 배열인지 확인 (빈 배열도 허용)
            if (!data || !Array.isArray(data)) {
                throw new Error('파일에서 데이터를 읽을 수 없습니다. 파일 형식을 확인해주세요.');
            }
            
            // 빈 배열인 경우에도 빈 데이터로 처리
            if (data.length === 0) {
                console.warn('파일이 비어있습니다.');
            }
            
            // 데이터 저장
            if (type === 'korean') {
                this.koreanFileData = data;
                this.koreanFileType = fileType;
                console.log('한국어 파일 데이터 저장 완료:', {
                    dataLength: data.length,
                    data: data
                });
            } else {
                this.japaneseFileData = data;
                this.japaneseFileType = fileType;
                console.log('일본어 파일 데이터 저장 완료:', {
                    dataLength: data.length,
                    data: data
                });
            }

            if (statusDiv) {
                statusDiv.textContent = `✅ 파일 읽기 완료: ${file.name} (${data.length}개 블록)`;
                statusDiv.style.color = '#27ae60';
            }

            // 버튼 상태 즉시 업데이트
            this.updateExtractButton();
            
            // 약간의 지연 후 다시 한 번 확인 (비동기 처리 완료 보장)
            setTimeout(() => {
                this.updateExtractButton();
                console.log('버튼 상태 재확인 완료');
            }, 100);
            
            // 추가 확인 (데이터가 제대로 저장되었는지)
            console.log('파일 데이터 저장 후 상태:', {
                type: type,
                koreanFileData: !!this.koreanFileData,
                japaneseFileData: !!this.japaneseFileData,
                koreanFileDataLength: this.koreanFileData ? this.koreanFileData.length : 0,
                japaneseFileDataLength: this.japaneseFileData ? this.japaneseFileData.length : 0,
                koreanFileDataType: this.koreanFileData ? (Array.isArray(this.koreanFileData) ? 'array' : typeof this.koreanFileData) : 'null',
                japaneseFileDataType: this.japaneseFileData ? (Array.isArray(this.japaneseFileData) ? 'array' : typeof this.japaneseFileData) : 'null'
            });
        } catch (error) {
            console.error('파일 읽기 오류:', error);
            console.error('오류 스택:', error.stack);
            if (statusDiv) {
                statusDiv.textContent = `❌ 오류: ${error.message || '파일을 읽을 수 없습니다.'}`;
                statusDiv.style.color = '#e74c3c';
            }
            if (type === 'korean') {
                this.koreanFileData = null;
                this.koreanFileType = null;
            } else {
                this.japaneseFileData = null;
                this.japaneseFileType = null;
            }
            this.updateExtractButton();
            
            // 사용자에게 알림
            alert(`파일 읽기 오류: ${error.message || '파일을 읽을 수 없습니다.'}\n\n콘솔을 확인해주세요. (F12)`);
        }
    }


    getFileType(fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        if (ext === 'pptx') return 'pptx';
        if (ext === 'txt') return 'txt';
        if (ext === 'csv') return 'csv';
        if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
        return 'unknown';
    }

    async readFile(file, fileType) {
        switch (fileType) {
            case 'pptx':
                return await this.readPPTX(file);
            case 'txt':
                return await this.readTXT(file);
            case 'csv':
                return await this.readCSV(file);
            case 'xlsx':
                return await this.readXLSX(file);
            default:
                throw new Error('지원하지 않는 파일 형식입니다.');
        }
    }

    async readPPTX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const slidesData = [];

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
                        const textBlocks = this.extractTextFromXML(xmlContent);
                        slidesData.push({
                            slide_num: i + 1,
                            texts: textBlocks // 위치 정보를 포함한 객체 배열
                        });
                    }

                    resolve(slidesData);
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
        const textBlocksWithPosition = [];

        // 슬라이드의 spTree 찾기 (shape들이 순서대로 있는 곳)
        let spTree = null;
        
        // p:spTree 찾기
        const allElements = xmlDoc.getElementsByTagName('*');
        for (let elem of allElements) {
            const tagName = elem.tagName || '';
            if (tagName.includes('spTree') || tagName === 'spTree') {
                spTree = elem;
                break;
            }
        }
        
        // spTree를 찾지 못하면 documentElement 사용
        if (!spTree) {
            spTree = xmlDoc.documentElement;
        }

        // spTree의 직접 자식 요소들을 순서대로 순회
        const childNodes = Array.from(spTree.childNodes);
        
        for (let node of childNodes) {
            if (node.nodeType !== 1) continue; // Element node만 처리
            
            const tagName = node.tagName || '';
            
            // Shape 타입 확인 (p:sp, p:cxnSp, p:pic, p:grpSp, p:graphicFrame)
            if (tagName.includes('sp') || tagName.includes('pic') || tagName.includes('graphicFrame')) {
                // 위치 정보 추출
                const position = this.extractShapePosition(node);
                
                // 각 shape를 하나의 개체로 인식하고, 그 안의 모든 텍스트를 추출
                // AI를 사용하여 텍스트 상자 내 줄바꿈 판단
                const shapeText = this.extractTextFromShapeAsOneObject(node);
                if (shapeText && shapeText.trim()) {
                    // 위치 정보와 함께 텍스트 저장 (AI 처리는 나중에)
                    textBlocksWithPosition.push({
                        text: shapeText.trim(), // 전체 텍스트를 하나로 저장
                        x: position.x,
                        y: position.y,
                        order: position.order,
                        rawText: shapeText // 원본 텍스트 (AI 처리용)
                    });
                }
            }
        }

        // 위치 기준으로 정렬 (Y 좌표 우선, 그 다음 X 좌표)
        textBlocksWithPosition.sort((a, b) => {
            // Y 좌표가 같으면 X 좌표로 정렬
            if (Math.abs(a.y - b.y) < 100) { // 100 EMU (약 0.01cm) 이내면 같은 줄로 간주
                return a.x - b.x;
            }
            // Y 좌표로 정렬 (위에서 아래)
            return a.y - b.y;
        });

        console.log(`추출된 텍스트 박스 수: ${textBlocksWithPosition.length}`);
        if (textBlocksWithPosition.length === 0) {
            console.log('텍스트를 찾을 수 없습니다. XML 샘플:', xmlContent.substring(0, 500));
        }
        
        // 위치 정보를 포함한 객체 배열 반환
        return textBlocksWithPosition;
    }
    
    // Shape의 위치 정보 추출
    extractShapePosition(shape) {
        let x = 0;
        let y = 0;
        let order = 0;
        
        // p:xfrm 또는 a:xfrm에서 위치 정보 찾기
        const xfrmElements = shape.getElementsByTagName('*');
        for (let elem of xfrmElements) {
            const tagName = elem.tagName || '';
            if (tagName.includes('xfrm') || tagName === 'xfrm') {
                // a:off (offset) 또는 p:off에서 위치 찾기
                const offElements = elem.getElementsByTagName('*');
                for (let off of offElements) {
                    const offTagName = off.tagName || '';
                    if (offTagName.includes('off') || offTagName === 'off') {
                        const xAttr = off.getAttribute('x');
                        const yAttr = off.getAttribute('y');
                        if (xAttr) x = parseInt(xAttr) || 0;
                        if (yAttr) y = parseInt(yAttr) || 0;
                    }
                }
            }
        }
        
        // 위치 정보를 찾지 못하면 DOM 순서 사용
        if (x === 0 && y === 0) {
            let parent = shape.parentNode;
            if (parent) {
                const siblings = Array.from(parent.childNodes).filter(n => n.nodeType === 1);
                order = siblings.indexOf(shape);
            }
        }
        
        return { x, y, order };
    }

    // shape를 하나의 개체로 인식하고, 그 안의 모든 텍스트를 하나의 문자열로 반환
    extractTextFromShapeAsOneObject(shape) {
        // graphicFrame (테이블) 처리
        const tagName = shape.tagName || '';
        if (tagName.includes('graphicFrame')) {
            // 테이블의 경우 각 셀의 텍스트를 수집
            const tableTexts = [];
            const tables = shape.getElementsByTagName('*');
            for (let table of tables) {
                const tableTagName = table.tagName || '';
                if (tableTagName.includes('tbl') || tableTagName === 'tbl') {
                    // 테이블의 각 셀에서 텍스트 추출
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
                                tableTexts.push(rowTexts.join('\n')); // 셀 내부는 엔터로, 행은 별도 항목으로
                            }
                        }
                    }
                }
            }
            return tableTexts.join('\n');
        } else {
            // 일반 shape에서 모든 텍스트를 하나의 문자열로 추출
            return this.extractAllTextFromElement(shape);
        }
    }
    
    // 요소 내의 모든 텍스트를 추출하되, 각 단락(a:p)을 별도 줄로 처리
    // 이렇게 하면 실제 엔터와 시각적 개행을 구분할 수 있음
    extractAllTextFromElement(element) {
        const lines = [];
        
        // a:txBody 찾기
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
            // 각 a:p는 하나의 줄로 처리 (실제 엔터 입력)
            const childNodes = Array.from(txBody.childNodes);
            for (let node of childNodes) {
                if (node.nodeType !== 1) continue;
                const tagName = node.tagName || '';
                if (tagName.endsWith(':p') || tagName === 'p') {
                    const paraText = this.extractTextFromParagraph(node);
                    if (paraText && paraText.trim()) {
                        // 각 단락을 별도 줄로 추가
                        // 단락 내부의 띄어쓰기는 보존 (앞뒤 공백만 제거)
                        lines.push(paraText.trim());
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
                // 모든 텍스트를 하나의 줄로 처리
                lines.push(texts.join(' '));
            }
        }
        
        // 각 줄을 엔터로 연결하여 반환
        // 이후 이 문자열을 split('\n')으로 나누면 각 단락이 별도 항목이 됨
        return lines.join('\n');
    }
    
    // 기존 함수는 호환성을 위해 유지 (사용하지 않음)
    extractTextFromShape(shape) {
        // shape 내의 모든 텍스트를 찾기 (개행 단위로 분리)
        const textBlocks = [];
        
        // graphicFrame (테이블) 처리
        const tagName = shape.tagName || '';
        if (tagName.includes('graphicFrame')) {
            const tables = shape.getElementsByTagName('*');
            for (let table of tables) {
                const tableTagName = table.tagName || '';
                if (tableTagName.includes('tbl') || tableTagName === 'tbl') {
                    // 테이블의 각 셀에서 텍스트 추출 (셀 단위로)
                    const rows = table.getElementsByTagName('*');
                    for (let row of rows) {
                        const rowTagName = row.tagName || '';
                        if (rowTagName.includes('tr') || rowTagName === 'tr') {
                            const cells = row.getElementsByTagName('*');
                            for (let cell of cells) {
                                const cellTagName = cell.tagName || '';
                                if (cellTagName.includes('tc') || cellTagName === 'tc') {
                                    // 셀 내의 각 단락(paragraph)을 별도 블록으로 처리
                                    const cellTexts = this.extractTextsByParagraph(cell);
                                    textBlocks.push(...cellTexts);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // 일반 shape에서 텍스트 추출 (단락 단위로)
            const shapeTexts = this.extractTextsByParagraph(shape);
            textBlocks.push(...shapeTexts);
        }
        
        return textBlocks.filter(text => text && text.trim().length > 0);
    }

    // 단락(paragraph) 단위로 텍스트 추출
    extractTextsByParagraph(element) {
        const textBlocks = [];
        
        // a:txBody (텍스트 본문) 찾기
        let txBody = null;
        const allElements = element.getElementsByTagName('*');
        for (let node of allElements) {
            const tagName = node.tagName || '';
            if (tagName.includes('txBody') || tagName === 'txBody') {
                txBody = node;
                break;
            }
        }
        
        // txBody가 있으면 그 안의 직접 자식 a:p 태그들을 찾기
        if (txBody) {
            const childNodes = Array.from(txBody.childNodes);
            for (let node of childNodes) {
                if (node.nodeType !== 1) continue; // Element node만
                const tagName = node.tagName || '';
                if (tagName.endsWith(':p') || tagName === 'p') {
                    // 각 단락(paragraph)의 텍스트 추출
                    const paraText = this.extractTextFromParagraph(node);
                    if (paraText && paraText.trim()) {
                        textBlocks.push(paraText.trim());
                    }
                }
            }
        } else {
            // txBody가 없으면 직접 a:p 태그 찾기 (직접 자식만)
            const childNodes = Array.from(element.childNodes);
            for (let node of childNodes) {
                if (node.nodeType !== 1) continue;
                const tagName = node.tagName || '';
                if (tagName.endsWith(':p') || tagName === 'p') {
                    const paraText = this.extractTextFromParagraph(node);
                    if (paraText && paraText.trim()) {
                        textBlocks.push(paraText.trim());
                    }
                }
            }
            
            // a:p가 없으면 전체 요소에서 텍스트 추출
            if (textBlocks.length === 0) {
                const text = this.extractTextFromElement(element);
                if (text && text.trim()) {
                    // 개행 문자로 분리
                    const lines = text.split(/\r?\n/).filter(line => line.trim());
                    if (lines.length > 0) {
                        textBlocks.push(...lines);
                    } else {
                        textBlocks.push(text.trim());
                    }
                }
            }
        }
        
        return textBlocks;
    }

    // 단락(paragraph) 내의 텍스트 추출
    extractTextFromParagraph(paragraph) {
        // paragraph의 직접 자식인 a:r (run) 태그들을 순서대로 찾기
        const runs = [];
        const childNodes = Array.from(paragraph.childNodes);
        for (let node of childNodes) {
            if (node.nodeType !== 1) continue; // Element node만
            const tagName = node.tagName || '';
            if (tagName.endsWith(':r') || tagName === 'r') {
                runs.push(node);
            }
        }
        
        // 각 run에서 텍스트 추출 (띄어쓰기 보존)
        const texts = [];
        for (let i = 0; i < runs.length; i++) {
            const run = runs[i];
            // run 내의 a:t (text) 태그 찾기
            const textNodes = run.getElementsByTagName('*');
            let runText = '';
            for (let node of textNodes) {
                const tagName = node.tagName || '';
                if (tagName.endsWith(':t') || tagName === 't') {
                    // textContent를 사용하여 공백 보존 (trim하지 않음)
                    const text = node.textContent || '';
                    runText += text;
                }
            }
            if (runText) {
                texts.push(runText);
            }
        }
        
        // 단락의 전체 textContent를 사용하여 띄어쓰기 완벽 보존
        // textContent는 자동으로 공백을 보존합니다
        const fullText = paragraph.textContent || '';
        if (fullText) {
            return fullText;
        }
        
        // textContent가 없으면 수집한 텍스트들을 공백으로 연결
        return texts.join(' ');
    }

    extractTextFromElement(element) {
        // 요소의 전체 textContent를 사용하여 띄어쓰기 보존
        const fullText = element.textContent || '';
        if (fullText) {
            return fullText;
        }
        
        // textContent가 없으면 a:t 태그에서 직접 추출
        const textNodes = element.getElementsByTagName('*');
        const texts = [];
        
        for (let node of textNodes) {
            const tagName = node.tagName || '';
            // a:t 태그 찾기 (텍스트 노드) - 네임스페이스 무시
            if (tagName.endsWith(':t') || tagName === 't') {
                // trim하지 않고 원본 공백 보존
                const text = node.textContent || '';
                if (text) {
                    texts.push(text);
                }
            }
        }
        
        return texts.length > 0 ? texts.join('') : null;
    }

    async readTXT(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    if (!text) {
                        resolve([{ slide_num: 1, texts: [] }]);
                        return;
                    }
                    
                    // 줄 단위로 분리하고 빈 줄 제거
                    const lines = text.split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                    
                    // 각 줄을 하나의 텍스트 블록으로 처리 (위치 정보 없음)
                    const data = [{
                        slide_num: 1,
                        texts: lines.map((line, index) => ({
                            text: line,
                            x: 0,
                            y: index * 10000, // 순서대로 배치
                            order: index
                        }))
                    }];
                    
                    console.log('TXT 파일 읽기 완료:', { linesCount: lines.length });
                    resolve(data);
                } catch (error) {
                    console.error('TXT 파일 읽기 오류:', error);
                    reject(error);
                }
            };
            reader.onerror = (e) => {
                console.error('FileReader 오류:', e);
                reject(new Error('파일 읽기 실패'));
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    async readCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim());
                    
                    // 첫 줄이 헤더인지 확인
                    const firstLine = lines[0].split(',');
                    let startIndex = 0;
                    let koreanCol = 0;
                    let japaneseCol = 1;
                    
                    // 헤더가 있는 경우 (한국어, 일본어 등의 컬럼명)
                    if (firstLine[0].toLowerCase().includes('한국어') || 
                        firstLine[0].toLowerCase().includes('korean') ||
                        firstLine[0].toLowerCase().includes('ko')) {
                        startIndex = 1;
                        // 일본어 컬럼 찾기
                        for (let i = 1; i < firstLine.length; i++) {
                            if (firstLine[i].toLowerCase().includes('일본어') ||
                                firstLine[i].toLowerCase().includes('japanese') ||
                                firstLine[i].toLowerCase().includes('ja')) {
                                japaneseCol = i;
                                break;
                            }
                        }
                    }
                    
                    const texts = [];
                    for (let i = startIndex; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
                        if (cols[koreanCol] || cols[japaneseCol]) {
                            texts.push({
                                text: cols[koreanCol] || '',
                                x: 0,
                                y: (i - startIndex) * 10000,
                                order: i - startIndex
                            });
                        }
                    }
                    
                    const data = [{
                        slide_num: 1,
                        texts: texts
                    }];
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async readXLSX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    if (jsonData.length === 0) {
                        resolve([{ slide_num: 1, texts: [] }]);
                        return;
                    }
                    
                    // 첫 줄이 헤더인지 확인
                    const firstRow = jsonData[0];
                    let startIndex = 0;
                    let koreanCol = 0;
                    let japaneseCol = 1;
                    
                    if (firstRow && typeof firstRow[0] === 'string') {
                        const firstCell = firstRow[0].toLowerCase();
                        if (firstCell.includes('한국어') || firstCell.includes('korean') || firstCell.includes('ko')) {
                            startIndex = 1;
                            // 일본어 컬럼 찾기
                            for (let i = 1; i < firstRow.length; i++) {
                                if (firstRow[i] && typeof firstRow[i] === 'string') {
                                    const cell = firstRow[i].toLowerCase();
                                    if (cell.includes('일본어') || cell.includes('japanese') || cell.includes('ja')) {
                                        japaneseCol = i;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    const texts = [];
                    for (let i = startIndex; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && (row[koreanCol] || row[japaneseCol])) {
                            texts.push({
                                text: String(row[koreanCol] || '').trim(),
                                x: 0,
                                y: (i - startIndex) * 10000,
                                order: i - startIndex
                            });
                        }
                    }
                    
                    const data = [{
                        slide_num: 1,
                        texts: texts
                    }];
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsArrayBuffer(file);
        });
    }

    updateExtractButton() {
        const extractBtn = document.getElementById('extractPptBtn');
        if (!extractBtn) {
            console.error('extractPptBtn을 찾을 수 없습니다.');
            return;
        }
        
        // 데이터가 존재하는지 확인 (null이 아니고 undefined가 아닌 경우)
        // 빈 배열도 유효한 데이터로 간주
        const hasKorean = this.koreanFileData !== null && this.koreanFileData !== undefined;
        const hasJapanese = this.japaneseFileData !== null && this.japaneseFileData !== undefined;
        const isReady = hasKorean && hasJapanese;
        
        console.log('버튼 상태 업데이트:', {
            isReady: isReady,
            hasKorean: hasKorean,
            hasJapanese: hasJapanese,
            koreanFileData: this.koreanFileData,
            japaneseFileData: this.japaneseFileData,
            koreanFileDataLength: this.koreanFileData ? (Array.isArray(this.koreanFileData) ? this.koreanFileData.length : 'not array') : 0,
            japaneseFileDataLength: this.japaneseFileData ? (Array.isArray(this.japaneseFileData) ? this.japaneseFileData.length : 'not array') : 0,
            koreanFileDataType: this.koreanFileData ? (Array.isArray(this.koreanFileData) ? 'array' : typeof this.koreanFileData) : 'null',
            japaneseFileDataType: this.japaneseFileData ? (Array.isArray(this.japaneseFileData) ? 'array' : typeof this.japaneseFileData) : 'null'
        });
        
        // disabled 속성을 직접 제거/추가
        if (isReady) {
            // 버튼 활성화
            extractBtn.disabled = false;
            extractBtn.removeAttribute('disabled');
            extractBtn.style.cursor = 'pointer';
            extractBtn.style.opacity = '1';
            extractBtn.style.pointerEvents = 'auto';
            extractBtn.classList.remove('disabled');
            
            console.log('✅ 버튼 활성화됨');
        } else {
            // 버튼 비활성화
            extractBtn.disabled = true;
            extractBtn.setAttribute('disabled', 'disabled');
            extractBtn.style.cursor = 'not-allowed';
            extractBtn.style.opacity = '0.6';
            extractBtn.style.pointerEvents = 'none';
            extractBtn.classList.add('disabled');
            
            console.log('❌ 버튼 비활성화됨 - 이유:', {
                hasKorean: hasKorean,
                hasJapanese: hasJapanese
            });
        }
        
        // DOM에 반영되었는지 확인
        const isActuallyDisabled = extractBtn.disabled || extractBtn.hasAttribute('disabled');
        console.log('버튼 실제 상태:', {
            disabled: isActuallyDisabled,
            shouldBeDisabled: !isReady,
            matches: isActuallyDisabled === !isReady
        });
    }

    // 텍스트만 추출 (매칭 없이)
    // 위치 기반으로 텍스트 추출 및 매칭 (통합 함수)
    async extractAndMatchByPosition() {
        if (!this.koreanFileData || !this.japaneseFileData) {
            alert('한국어와 일본어 파일을 모두 선택해주세요.');
            return;
        }

        // 결과 영역을 먼저 표시
        const resultDiv = document.getElementById('pptExtractResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
        }

        // 진행 상태 표시
        const infoDiv = document.getElementById('pptExtractInfo');
        const extractedCorpusTable = document.getElementById('extractedCorpusTable');

        if (infoDiv) {
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div>
                        <strong style="color: #1a1a1a;">⏳ 위치 기반 매칭 중...</strong>
                    </div>
                </div>
            `;
        }

        try {
            const maxSlides = Math.max(this.koreanFileData.length, this.japaneseFileData.length);
            const koreanTexts = [];
            const japaneseTexts = [];

            // 위치 정보를 포함한 텍스트 추출
            for (let i = 0; i < maxSlides; i++) {
                const koSlide = this.koreanFileData[i] || { slide_num: i + 1, texts: [] };
                const jaSlide = this.japaneseFileData[i] || { slide_num: i + 1, texts: [] };
                
                // 한국어 텍스트 추출 (위치 정보 포함)
                for (const item of koSlide.texts) {
                    if (typeof item === 'object' && item.text && !this.isOnlyNumbers(item.text)) {
                        koreanTexts.push({
                            text: item.text,
                            x: item.x || 0,
                            y: item.y || 0,
                            slide_num: i + 1
                        });
                    } else if (typeof item === 'string' && item && !this.isOnlyNumbers(item)) {
                        koreanTexts.push({
                            text: item,
                            x: 0,
                            y: 0,
                            slide_num: i + 1
                        });
                    }
                }
                
                // 일본어 텍스트 추출 (위치 정보 포함)
                for (const item of jaSlide.texts) {
                    if (typeof item === 'object' && item.text && !this.isOnlyNumbers(item.text)) {
                        japaneseTexts.push({
                            text: item.text,
                            x: item.x || 0,
                            y: item.y || 0,
                            slide_num: i + 1
                        });
                    } else if (typeof item === 'string' && item && !this.isOnlyNumbers(item)) {
                        japaneseTexts.push({
                            text: item,
                            x: 0,
                            y: 0,
                            slide_num: i + 1
                        });
                    }
                }
                
                if (infoDiv && i % 5 === 0) {
                    infoDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                            <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <div>
                                <strong style="color: #1a1a1a;">⏳ 위치 기반 매칭 중...</strong><br>
                                <small style="color: #666;">슬라이드 ${i + 1}/${maxSlides}</small>
                            </div>
                        </div>
                    `;
                }
            }

            // 원본 텍스트 저장 (2차 매칭용)
            this.originalKoreanTexts = koreanTexts.map(item => typeof item === 'string' ? item : (item?.text || ''));
            this.originalJapaneseTexts = japaneseTexts.map(item => typeof item === 'string' ? item : (item?.text || ''));

            // 위치 기반 매칭 수행
            const matchedPairs = this.matchByPosition(koreanTexts, japaneseTexts);

            // 문장 단위로 분할
            const parallelRows = [];
            for (const pair of matchedPairs) {
                const koText = pair.korean || '';
                const jaText = pair.japanese || '';
                
                // 빈 텍스트는 건너뛰기
                if (!koText && !jaText) continue;
                
                // 문장 분할 시도
                const koSentences = koText ? this.splitIntoSentences(koText) : [];
                const jaSentences = jaText ? this.splitIntoSentences(jaText) : [];
                
                // 문장 분할 결과가 있으면 사용, 없으면 원본 텍스트 사용
                if (koSentences.length > 0 || jaSentences.length > 0) {
                    const maxSentences = Math.max(koSentences.length, jaSentences.length, 1);
                    for (let j = 0; j < maxSentences; j++) {
                        const koSentence = koSentences[j] || (j === 0 ? koText : '');
                        const jaSentence = jaSentences[j] || (j === 0 ? jaText : '');
                        if (koSentence || jaSentence) {
                            parallelRows.push({
                                '한국어': koSentence,
                                '일본어': jaSentence
                            });
                        }
                    }
                } else {
                    // 문장 분할 실패 시 원본 텍스트 사용
                    parallelRows.push({
                        '한국어': koText || '',
                        '일본어': jaText || ''
                    });
                }
            }

            // 빈칸 확인 (한국어만 있거나 일본어만 있는 항목)
            const hasEmptyCells = parallelRows.some(row => (!row['한국어'] || !row['일본어']) && (row['한국어'] || row['일본어']));

            // 결과 저장 및 표시
            this.extractedData = parallelRows;
            this.currentExtractedPage = 1;
            this.selectedExtractedIndices.clear();
            this.showResult(parallelRows);

            if (extractedCorpusTable) {
                extractedCorpusTable.style.display = 'block';
            }

            // 1차 매칭 결과 표시 및 2차 매칭 버튼 추가
            if (infoDiv) {
                const emptyCount = parallelRows.filter(row => (!row['한국어'] || !row['일본어']) && (row['한국어'] || row['일본어'])).length;
                let statusHtml = `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #e8f5e9; border-radius: 8px; border: 1px solid #a5d6a7;">
                        <div style="font-size: 20px;">✅</div>
                        <div style="flex: 1;">
                            <strong style="color: #1a1a1a;">1차 매칭 결과 (위치 기반)</strong><br>
                            <small style="color: #666;">총 ${parallelRows.length}개 항목 매칭됨`;
                
                if (hasEmptyCells) {
                    statusHtml += ` | 빈칸 ${emptyCount}개 발견</small>`;
                } else {
                    statusHtml += `</small>`;
                }
                
                statusHtml += `</div>`;
                
                statusHtml += `</div>`;
                infoDiv.innerHTML = statusHtml;
            }

        } catch (error) {
            console.error('매칭 오류:', error);
            if (infoDiv) {
                infoDiv.innerHTML = `<strong>❌ 오류 발생</strong><br><small>${error.message || '알 수 없는 오류가 발생했습니다.'}</small>`;
            }
            alert(`매칭 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
        }
    }

    // 2차 매칭 기능 제거됨
    /*
    async performSecondaryMatching() {
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey || !apiKey.trim()) {
            alert('Claude API 키가 필요합니다. 설정에서 API 키를 입력해주세요.');
            return;
        }

        // API URL 확인 (Cloudflare Workers 사용)
        const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';

        const infoDiv = document.getElementById('pptExtractInfo');
        if (!infoDiv) return;

        // 현재 결과에서 매칭되지 않은 텍스트 추출
        const unmatchedKorean = [];
        const unmatchedJapanese = [];
        const matchedIndices = new Set();

        // 빈칸이 있는 행 찾기
        for (let i = 0; i < this.extractedData.length; i++) {
            const row = this.extractedData[i];
            const hasKorean = row['한국어'] && row['한국어'].trim();
            const hasJapanese = row['일본어'] && row['일본어'].trim();

            if (hasKorean && !hasJapanese) {
                unmatchedKorean.push({ index: i, text: row['한국어'].trim() });
            } else if (!hasKorean && hasJapanese) {
                unmatchedJapanese.push({ index: i, text: row['일본어'].trim() });
            } else if (hasKorean && hasJapanese) {
                matchedIndices.add(i);
            }
        }

        if (unmatchedKorean.length === 0 && unmatchedJapanese.length === 0) {
            alert('매칭되지 않은 텍스트가 없습니다.');
            return;
        }

        // 진행 상태 표시
        infoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <div>
                    <strong style="color: #1a1a1a;">⏳ AI 2차 매칭 중...</strong><br>
                    <small style="color: #666;">한국어 ${unmatchedKorean.length}개, 일본어 ${unmatchedJapanese.length}개 매칭 중...</small>
                </div>
            </div>
        `;

        try {
            // Claude API로 매칭 수행
            const koreanList = unmatchedKorean.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n');
            const japaneseList = unmatchedJapanese.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n');

            const prompt = `당신은 한일 번역 전문가입니다. 아래 매칭되지 않은 한국어와 일본어 텍스트를 의미가 대응되는 쌍으로 매칭해주세요.

<작업 지침>
1. 의미가 대응되는 한국어와 일본어를 정확히 매칭하세요
2. 모든 텍스트를 빠짐없이 매칭하세요 (빈 칸이 없도록)
3. 매칭이 불가능한 경우도 있을 수 있으니, 가능한 것만 매칭하세요
</작업 지침>

<매칭되지 않은 한국어 텍스트>
${koreanList || '(없음)'}
</매칭되지 않은 한국어 텍스트>

<매칭되지 않은 일본어 텍스트>
${japaneseList || '(없음)'}
</매칭되지 않은 일본어 텍스트>

위 텍스트들을 분석하여 매칭 결과를 다음 JSON 형식으로 출력해주세요:

{
  "matches": [
    {
      "korean_index": 1,
      "japanese_index": 1,
      "korean_text": "한국어 텍스트",
      "japanese_text": "일본어 텍스트"
    },
    ...
  ]
}

각 매칭은 의미가 대응되는 한국어와 일본어 쌍입니다. 한국어 번호와 일본어 번호를 정확히 매칭해주세요.`;

            const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 8000,
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('API 응답 형식 오류');
            }

            const aiResponse = data.content[0].text.trim();
            console.log('AI 2차 매칭 응답:', aiResponse);

            // JSON 추출
            let jsonText = aiResponse;
            const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1];
            } else {
                const firstBrace = jsonText.indexOf('{');
                const lastBrace = jsonText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonText = jsonText.substring(firstBrace, lastBrace + 1);
                }
            }

            const matchResult = JSON.parse(jsonText);
            const matches = matchResult.matches || [];

            // 매칭 결과를 기존 데이터에 병합
            const usedKoreanIndices = new Set();
            const usedJapaneseIndices = new Set();
            const updatedData = [...this.extractedData];

            // AI가 매칭한 결과 처리
            for (const match of matches) {
                const koIdx = match.korean_index - 1;
                const jaIdx = match.japanese_index - 1;

                if (koIdx >= 0 && koIdx < unmatchedKorean.length &&
                    jaIdx >= 0 && jaIdx < unmatchedJapanese.length) {
                    const koItem = unmatchedKorean[koIdx];
                    const jaItem = unmatchedJapanese[jaIdx];

                    if (koItem && jaItem) {
                        // 한국어만 있는 행에 일본어 추가
                        const koRowIndex = koItem.index;
                        if (updatedData[koRowIndex] && !updatedData[koRowIndex]['일본어']) {
                            updatedData[koRowIndex]['일본어'] = jaItem.text;
                        }
                        // 일본어만 있는 행에 한국어 추가
                        const jaRowIndex = jaItem.index;
                        if (updatedData[jaRowIndex] && !updatedData[jaRowIndex]['한국어']) {
                            updatedData[jaRowIndex]['한국어'] = koItem.text;
                        }
                        usedKoreanIndices.add(koIdx);
                        usedJapaneseIndices.add(jaIdx);
                    }
                }
            }

            // 매칭되지 않은 항목은 그대로 유지
            // (이미 updatedData에 반영되어 있음)

            // 결과 저장 및 표시
            this.extractedData = updatedData;
            this.currentExtractedPage = 1;
            this.selectedExtractedIndices.clear();
            this.showResult(updatedData);

            // 완료 메시지 표시
            const matchedCount = matches.length;
            const remainingEmpty = updatedData.filter(row => (!row['한국어'] || !row['일본어']) && (row['한국어'] || row['일본어'])).length;

            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #e8f5e9; border-radius: 8px; border: 1px solid #a5d6a7;">
                    <div style="font-size: 20px;">✅</div>
                    <div style="flex: 1;">
                        <strong style="color: #1a1a1a;">2차 매칭 완료 (AI 기반)</strong><br>
                        <small style="color: #666;">${matchedCount}개 항목 추가 매칭됨`;
            
            if (remainingEmpty > 0) {
                infoDiv.innerHTML += ` | 빈칸 ${remainingEmpty}개 남음</small>`;
            } else {
                infoDiv.innerHTML += `</small>`;
            }
            
            infoDiv.innerHTML += `</div></div>`;

        } catch (error) {
            console.error('2차 매칭 오류:', error);
            let errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
            
            // 네트워크 오류인 경우
            if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
                errorMessage = 'API에 연결할 수 없습니다.\n\n가능한 원인:\n1. 네트워크 연결 문제\n2. Cloudflare Workers 서비스 문제\n3. 방화벽 또는 보안 설정\n\n인터넷 연결을 확인하고 다시 시도해주세요.';
            }
            
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div style="padding: 15px; background: #ffebee; border-radius: 8px; border: 1px solid #f44336;">
                        <strong style="color: #c62828;">❌ 2차 매칭 실패</strong><br>
                        <small style="color: #666;">${errorMessage}</small>
                    </div>
                `;
            }
            alert(`2차 매칭 중 오류가 발생했습니다: ${errorMessage}`);
        }
    }
    */

    // 기존 extractTexts 함수는 위치 기반 매칭으로 대체됨
    async extractTexts() {
        // 위치 기반 매칭 사용
        await this.extractAndMatchByPosition();
    }

    // CSV/XLSX 파일인 경우 이미 쌍으로 되어 있으므로 별도 처리
    async extractStructuredTexts() {
        const parallelRows = [];
        const maxSlides = Math.max(this.koreanFileData.length, this.japaneseFileData.length);
        const isStructuredFormat = this.koreanFileType === 'csv' || this.koreanFileType === 'xlsx' || 
                                   this.japaneseFileType === 'csv' || this.japaneseFileType === 'xlsx';

        if (!isStructuredFormat) return null;

        try {
            for (let i = 0; i < maxSlides; i++) {
                const koSlide = this.koreanFileData[i] || { slide_num: i + 1, texts: [] };
                const jaSlide = this.japaneseFileData[i] || { slide_num: i + 1, texts: [] };
                
                const maxTexts = Math.max(koSlide.texts.length, jaSlide.texts.length);
                
                for (let j = 0; j < maxTexts; j++) {
                    const koBlock = koSlide.texts[j];
                    const jaBlock = jaSlide.texts[j];
                    const koText = typeof koBlock === 'string' ? koBlock : (koBlock?.text || '');
                    const jaText = typeof jaBlock === 'string' ? jaBlock : (jaBlock?.text || '');
                    
                    // 단순 숫자만 있는 경우 제외
                    if (this.isOnlyNumbers(koText) || this.isOnlyNumbers(jaText)) {
                        continue;
                    }
                    
                    if (koText || jaText) {
                        parallelRows.push({
                            '한국어': koText,
                            '일본어': jaText
                        });
                    }
                }
            }
            
            return parallelRows;
        } catch (error) {
            console.error('구조화된 텍스트 추출 오류:', error);
            return null;
        }
    }

    // 기존 로직 (하위 호환성용 - 사용하지 않음)
    async extractTextsOld() {
        if (!this.koreanFileData || !this.japaneseFileData) {
            alert('한국어와 일본어 파일을 모두 선택해주세요.');
            return;
        }

        // 결과 영역을 먼저 표시
        const resultDiv = document.getElementById('pptExtractResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
        }

        // 진행 상태 표시
        const infoDiv = document.getElementById('pptExtractInfo');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div>
                        <strong style="color: #1a1a1a;">⏳ 텍스트 추출 및 매칭 중...</strong><br>
                        <small style="color: #666;">1단계: 위치 기준 매칭 → 2단계: AI 의미 확인 → 3단계: 문장 분할</small>
                    </div>
                </div>
            `;
        }

        const parallelRows = [];
        const maxSlides = Math.max(this.koreanFileData.length, this.japaneseFileData.length);

        // CSV/XLSX 파일인 경우 이미 쌍으로 되어 있으므로 별도 처리
        const isStructuredFormat = this.koreanFileType === 'csv' || this.koreanFileType === 'xlsx' || 
                                   this.japaneseFileType === 'csv' || this.japaneseFileType === 'xlsx';

        try {
        for (let i = 0; i < maxSlides; i++) {
            const koSlide = this.koreanFileData[i] || { slide_num: i + 1, texts: [] };
            const jaSlide = this.japaneseFileData[i] || { slide_num: i + 1, texts: [] };
            
            if (isStructuredFormat) {
                // 구조화된 형식은 인덱스 기준으로 매칭 (이미 쌍으로 되어 있음)
                const maxTexts = Math.max(koSlide.texts.length, jaSlide.texts.length);
                
                if (infoDiv) {
                    infoDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                            <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <div>
                                <strong style="color: #1a1a1a;">⏳ 텍스트 처리 중...</strong><br>
                                <small style="color: #666;">슬라이드 ${i + 1}/${maxSlides} | 항목 처리 중...</small>
                            </div>
                        </div>
                    `;
                }
                
                for (let j = 0; j < maxTexts; j++) {
                    const koBlock = koSlide.texts[j];
                    const jaBlock = jaSlide.texts[j];
                    const koText = typeof koBlock === 'string' ? koBlock : (koBlock?.text || '');
                    const jaText = typeof jaBlock === 'string' ? jaBlock : (jaBlock?.text || '');
                    
                    // 단순 숫자만 있는 경우 제외
                    if (this.isOnlyNumbers(koText) || this.isOnlyNumbers(jaText)) {
                        continue;
                    }
                    
                    if (koText || jaText) {
                        parallelRows.push({
                            '한국어': koText,
                            '일본어': jaText
                        });
                    }
                }
            } else {
                // 1단계: AI 의미 기반 매칭
                if (infoDiv) {
                    infoDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                            <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <div>
                                <strong style="color: #1a1a1a;">⏳ AI 의미 기반 매칭 중...</strong><br>
                                <small style="color: #666;">슬라이드 ${i + 1}/${maxSlides}</small>
                            </div>
                        </div>
                    `;
                }
                
                // 한국어와 일본어 텍스트 추출
                const koTexts = koSlide.texts.map(item => typeof item === 'string' ? item : (item?.text || '')).filter(text => text && !this.isOnlyNumbers(text));
                const jaTexts = jaSlide.texts.map(item => typeof item === 'string' ? item : (item?.text || '')).filter(text => text && !this.isOnlyNumbers(text));
                
                const usedJapaneseIndices = new Set();
                const matchedPairs = [];
                
                // 각 한국어 텍스트에 대해 가장 의미적으로 유사한 일본어 텍스트 찾기
                for (let koIdx = 0; koIdx < koTexts.length; koIdx++) {
                    const koText = koTexts[koIdx];
                    if (!koText) continue;
                    
                    // 진행 상태 업데이트
                    if (infoDiv && koIdx % 3 === 0) {
                        infoDiv.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                                <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <div>
                                    <strong style="color: #1a1a1a;">⏳ AI 의미 기반 매칭 중...</strong><br>
                                    <small style="color: #666;">슬라이드 ${i + 1}/${maxSlides} | 한국어 ${koIdx + 1}/${koTexts.length} 처리 중...</small>
                                </div>
                            </div>
                        `;
                    }
                    
                    let bestMatch = null;
                    let bestMatchIndex = -1;
                    let bestSimilarity = 0;
                    
                    // 모든 일본어 텍스트와 비교하여 가장 유사한 것 찾기
                    for (let jaIdx = 0; jaIdx < jaTexts.length; jaIdx++) {
                        if (usedJapaneseIndices.has(jaIdx)) continue;
                        
                        const jaText = jaTexts[jaIdx];
                        if (!jaText) continue;
                        
                        // AI로 의미 유사도 계산
                        let similarity = 0;
                        try {
                            similarity = await this.calculateSemanticSimilarity(koText, jaText);
                        } catch (error) {
                            console.error('의미 유사도 계산 오류:', error);
                            similarity = 0;
                        }
                        
                        if (similarity > bestSimilarity) {
                            bestSimilarity = similarity;
                            bestMatch = jaText;
                            bestMatchIndex = jaIdx;
                        }
                    }
                    
                    // 유사도가 0.5 이상인 경우만 매칭
                    if (bestMatch && bestSimilarity >= 0.5) {
                        matchedPairs.push({
                            korean: koText,
                            japanese: bestMatch,
                            similarity: bestSimilarity
                        });
                        usedJapaneseIndices.add(bestMatchIndex);
                    } else {
                        // 매칭 실패: 한국어만 추가
                        matchedPairs.push({
                            korean: koText,
                            japanese: '',
                            similarity: bestSimilarity
                        });
                    }
                }
                
                // 매칭되지 않은 일본어 텍스트 추가
                for (let jaIdx = 0; jaIdx < jaTexts.length; jaIdx++) {
                    if (!usedJapaneseIndices.has(jaIdx)) {
                        matchedPairs.push({
                            korean: '',
                            japanese: jaTexts[jaIdx],
                            similarity: 0
                        });
                    }
                }
                
                // 매칭된 쌍을 문장 단위로 분할하여 추가
                for (const pair of matchedPairs) {
                    // 문장 단위로 분할
                    const koSentences = this.splitIntoSentences(pair.korean || '');
                    const jaSentences = this.splitIntoSentences(pair.japanese || '');
                    
                    // 문장이 분할된 경우 각 문장을 개별 항목으로 추가
                    if (koSentences.length > 1 || jaSentences.length > 1) {
                        const maxSentences = Math.max(koSentences.length, jaSentences.length);
                        
                        for (let s = 0; s < maxSentences; s++) {
                            const koSentence = koSentences[s] || '';
                            const jaSentence = jaSentences[s] || '';
                            
                            // 빈 문장 제외
                            if (koSentence || jaSentence) {
                                parallelRows.push({
                                    '한국어': koSentence,
                                    '일본어': jaSentence
                                });
                            }
                        }
                    } else {
                        // 문장이 분할되지 않은 경우 (원본 유지)
                        if (pair.korean || pair.japanese) {
                            parallelRows.push({
                                '한국어': pair.korean || '',
                                '일본어': pair.japanese || ''
                            });
                        }
                    }
                }
            }
        }

        // 이 함수는 더 이상 사용되지 않음 (extractTextsOnly + matchTexts로 대체됨)
        // 하위 호환성을 위해 유지
        this.extractedData = parallelRows;
        this.currentExtractedPage = 1;
        this.selectedExtractedIndices.clear();
        this.showResult(parallelRows);
        } catch (error) {
            console.error('텍스트 추출 오류:', error);
            if (infoDiv) {
                infoDiv.innerHTML = `<strong>❌ 오류 발생</strong><br><small>${error.message || '알 수 없는 오류가 발생했습니다.'}</small>`;
            }
            alert(`텍스트 추출 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}\n\n브라우저 콘솔을 확인해주세요.`);
        }
    }

    // 앵커(영문 고유명사, 숫자) 추출
    extractAnchors(text) {
        const anchors = [];
        
        // 영문 고유명사 (대문자로 시작하는 영문 단어, 연속된 대문자)
        const properNounPattern = /\b[A-Z][a-zA-Z]+\b/g;
        const properNounMatches = text.match(properNounPattern);
        if (properNounMatches) {
            anchors.push(...properNounMatches.map(m => m.toLowerCase()));
        }
        
        // 연속된 대문자 (약어 등)
        const acronymPattern = /\b[A-Z]{2,}\b/g;
        const acronymMatches = text.match(acronymPattern);
        if (acronymMatches) {
            anchors.push(...acronymMatches.map(m => m.toLowerCase()));
        }
        
        // 숫자 (정수, 소수, 날짜 등)
        const numberPattern = /\b\d+\.?\d*\b/g;
        const numberMatches = text.match(numberPattern);
        if (numberMatches) {
            anchors.push(...numberMatches);
        }
        
        return [...new Set(anchors)]; // 중복 제거
    }

    // 앵커 기반 + 의미적 유사도 + 위치 정보 매칭
    async matchByAnchorsAndSemantics(koreanTexts, japaneseTexts) {
        const pairs = [];
        
        // 텍스트와 위치 정보 추출
        const koItems = koreanTexts.map(item => ({
            text: typeof item === 'string' ? item : (item?.text || ''),
            x: typeof item === 'object' ? (item.x || 0) : 0,
            y: typeof item === 'object' ? (item.y || 0) : 0,
            index: koreanTexts.indexOf(item)
        }));
        
        const jaItems = japaneseTexts.map(item => ({
            text: typeof item === 'string' ? item : (item?.text || ''),
            x: typeof item === 'object' ? (item.x || 0) : 0,
            y: typeof item === 'object' ? (item.y || 0) : 0,
            index: japaneseTexts.indexOf(item)
        }));
        
        // 각 텍스트에서 앵커 추출
        const koAnchors = koItems.map(item => ({ ...item, anchors: this.extractAnchors(item.text) }));
        const jaAnchors = jaItems.map(item => ({ ...item, anchors: this.extractAnchors(item.text) }));
        
        const usedJapaneseIndices = new Set();
        
        // 1단계: 앵커 + 위치 정보로 매칭 (모든 항목에 대해 시도)
        for (let i = 0; i < koAnchors.length; i++) {
            const koItem = koAnchors[i];
            if (!koItem.text) continue;
            
            let bestMatch = null;
            let bestMatchIndex = -1;
            let bestScore = -1;
            
            for (let j = 0; j < jaAnchors.length; j++) {
                if (usedJapaneseIndices.has(j)) continue;
                
                const jaItem = jaAnchors[j];
                if (!jaItem.text) continue;
                
                // 공통 앵커 개수 계산
                const commonAnchors = koItem.anchors.filter(anchor => 
                    jaItem.anchors.includes(anchor)
                ).length;
                
                // 위치 기반 점수 계산 (거리가 가까울수록 높은 점수)
                let positionScore = 0;
                if (koItem.x !== 0 || koItem.y !== 0 || jaItem.x !== 0 || jaItem.y !== 0) {
                    const distance = Math.sqrt(Math.pow(koItem.x - jaItem.x, 2) + Math.pow(koItem.y - jaItem.y, 2));
                    const yDiff = Math.abs(koItem.y - jaItem.y);
                    
                    // Y 좌표 차이가 작고 거리가 가까울수록 높은 점수
                    if (yDiff < 100000) { // 같은 줄로 간주 (범위 확대)
                        positionScore = 1 / (1 + distance / 20000); // 거리 역수 (최대 1.0)
                    } else {
                        positionScore = 0.1 / (1 + yDiff / 200000); // 다른 줄이어도 약간의 점수
                    }
                } else {
                    // 위치 정보가 없으면 인덱스 차이로 점수 계산
                    const indexDiff = Math.abs(koItem.index - jaItem.index);
                    positionScore = 1 / (1 + indexDiff * 0.3); // 가중치 조정
                }
                
                // 앵커 점수 (공통 앵커가 많을수록 높은 점수)
                let anchorScore = 0;
                if (commonAnchors > 0) {
                    anchorScore = Math.min(commonAnchors / Math.max(koItem.anchors.length, jaItem.anchors.length, 1), 1.0);
                } else if (koItem.anchors.length === 0 && jaItem.anchors.length === 0) {
                    // 둘 다 앵커가 없으면 중립 점수
                    anchorScore = 0.3;
                }
                
                // 종합 점수 (앵커가 있으면 앵커 우선, 없으면 위치 우선)
                let totalScore = 0;
                if (anchorScore > 0) {
                    totalScore = anchorScore * 0.7 + positionScore * 0.3;
                } else {
                    totalScore = positionScore * 0.8 + 0.2; // 위치 기반 매칭
                }
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMatch = jaItem.text;
                    bestMatchIndex = j;
                }
            }
            
            // 임계값을 높여서 더 정확한 매칭만 허용
            if (bestMatchIndex >= 0 && bestScore > 0.3) {
                usedJapaneseIndices.add(bestMatchIndex);
                pairs.push({ korean: koItem.text, japanese: bestMatch });
            }
        }
        
        // 2단계: 앵커 매칭이 안 된 텍스트들은 의미적 유사도 + 위치로 매칭
        const unmatchedKo = [];
        const unmatchedJa = [];
        
        for (let i = 0; i < koAnchors.length; i++) {
            if (!pairs.some(p => p.korean === koAnchors[i].text)) {
                unmatchedKo.push(koAnchors[i]);
            }
        }
        
        for (let j = 0; j < jaAnchors.length; j++) {
            if (!usedJapaneseIndices.has(j)) {
                unmatchedJa.push(jaAnchors[j]);
            }
        }
        
        // 의미적 유사도 + 위치 정보로 매칭
        for (const koItem of unmatchedKo) {
            if (!koItem.text) continue;
            
            let bestMatch = null;
            let bestMatchIndex = -1;
            let bestScore = 0;
            
            let bestSemanticSimilarity = 0;
            
            for (let j = 0; j < unmatchedJa.length; j++) {
                if (unmatchedJa[j] === null) continue; // 이미 매칭됨
                
                const jaItem = unmatchedJa[j];
                if (!jaItem.text) continue;
                
                // 의미적 유사도 계산
                let semanticSimilarity = 0;
                try {
                    semanticSimilarity = await this.calculateSemanticSimilarity(koItem.text, jaItem.text);
                } catch (error) {
                    console.error('의미 유사도 계산 오류:', error);
                    semanticSimilarity = 0;
                }
                
                // 위치 기반 점수 계산
                let positionScore = 0;
                if (koItem.x !== 0 || koItem.y !== 0 || jaItem.x !== 0 || jaItem.y !== 0) {
                    const distance = Math.sqrt(Math.pow(koItem.x - jaItem.x, 2) + Math.pow(koItem.y - jaItem.y, 2));
                    const yDiff = Math.abs(koItem.y - jaItem.y);
                    
                    if (yDiff < 50000) {
                        positionScore = 1 / (1 + distance / 10000);
                    }
                } else {
                    const indexDiff = Math.abs(koItem.index - jaItem.index);
                    positionScore = 1 / (1 + indexDiff * 0.5);
                }
                
                // 종합 점수 (의미적 유사도 60%, 위치 40%) - 의미를 더 중시
                const totalScore = semanticSimilarity * 0.6 + positionScore * 0.4;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMatch = jaItem.text;
                    bestMatchIndex = j;
                    bestSemanticSimilarity = semanticSimilarity;
                }
            }
            
            // AI 검증을 통과한 매칭만 허용 (의미적 유사도가 0.6 이상이어야 함)
            if (bestMatch && bestScore > 0.3 && bestSemanticSimilarity >= 0.6) {
                pairs.push({ korean: koItem.text, japanese: bestMatch });
                unmatchedJa[bestMatchIndex] = null; // 매칭 완료 표시
            }
        }
        
        // 3단계: 여전히 매칭 안 된 항목들은 위치 기반으로 최종 매칭 시도
        const remainingKo = unmatchedKo.filter((item) => !pairs.some(p => p.korean === item.text));
        const remainingJa = unmatchedJa.filter(item => item !== null);
        
        for (const koItem of remainingKo) {
            if (!koItem.text) continue;
            
            let bestMatch = null;
            let bestMatchIndex = -1;
            let bestScore = -1;
            
            for (let j = 0; j < remainingJa.length; j++) {
                if (remainingJa[j] === null) continue;
                
                const jaItem = remainingJa[j];
                if (!jaItem.text) continue;
                
                // 위치 기반 점수 계산
                let positionScore = 0;
                if (koItem.x !== 0 || koItem.y !== 0 || jaItem.x !== 0 || jaItem.y !== 0) {
                    const distance = Math.sqrt(Math.pow(koItem.x - jaItem.x, 2) + Math.pow(koItem.y - jaItem.y, 2));
                    const yDiff = Math.abs(koItem.y - jaItem.y);
                    
                    if (yDiff < 150000) { // 범위 확대
                        positionScore = 1 / (1 + distance / 50000);
                    } else {
                        positionScore = 0.2 / (1 + yDiff / 300000);
                    }
                } else {
                    const indexDiff = Math.abs(koItem.index - jaItem.index);
                    positionScore = 1 / (1 + indexDiff * 0.5);
                }
                
                if (positionScore > bestScore) {
                    bestScore = positionScore;
                    bestMatch = jaItem.text;
                    bestMatchIndex = j;
                }
            }
            
            // 3단계에서는 위치 기반 매칭만 시도하되, AI 검증은 나중에 수행
            // 임계값을 높여서 더 정확한 위치 매칭만 허용
            if (bestMatch && bestScore > 0.3) {
                pairs.push({ korean: koItem.text, japanese: bestMatch });
                remainingJa[bestMatchIndex] = null;
            } else {
                pairs.push({ korean: koItem.text, japanese: '' });
            }
        }
        
        // 매칭되지 않은 일본어 텍스트 추가
        for (const jaItem of remainingJa) {
            if (jaItem && jaItem.text) {
                pairs.push({ korean: '', japanese: jaItem.text });
            }
        }
        
        return pairs;
    }

    // 의미적 유사도 계산 (Claude API 사용)
    async calculateSemanticSimilarity(koreanText, japaneseText) {
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            // API 키가 없으면 간단한 텍스트 유사도 사용
            return this.simpleTextSimilarity(koreanText, japaneseText);
        }
        
        try {
            const prompt = `당신은 한일 번역 전문가입니다. 다음 한국어 텍스트와 일본어 텍스트의 의미를 각각 깊이 있게 분석하고, 두 텍스트가 같은 의미를 나타내는지 평가해주세요.

한국어 텍스트: ${koreanText}
일본어 텍스트: ${japaneseText}

<작업 지침>
1. 한국어 텍스트의 의미를 정확히 파악하세요 (제목, 부제목, 본문, 표 데이터 등 모든 요소 포함)
2. 일본어 텍스트의 의미를 정확히 파악하세요
3. 두 텍스트가 의미상 대응되는지, 번역 관계인지, 같은 내용을 다루는지 평가하세요
4. 인명, 회사명 등 고유명사가 일치하는지 확인하세요
5. 숫자가 포함된 경우 숫자가 일치하는지 확인하세요
6. 문맥과 의도를 고려하여 평가하세요
</작업 지침>

의미적 유사도를 0.0에서 1.0 사이의 숫자로 평가해주세요.
- 1.0: 완전히 같은 의미 (번역 관계이거나 동일한 내용)
- 0.7-0.9: 매우 유사한 의미 (주요 내용이 일치)
- 0.5-0.6: 어느 정도 관련 있지만 다른 내용
- 0.0-0.4: 전혀 다른 의미

숫자만 응답해주세요 (예: 0.85)`;

            // 프록시 서버를 통해 API 호출 (CORS 우회)
            const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 50,
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();
            
            // API 응답 구조 확인
            if (!data || !data.content || !data.content[0] || !data.content[0].text) {
                console.warn('API 응답 형식이 예상과 다릅니다:', data);
                return 0.5; // 기본값 반환
            }
            
            const aiResponse = data.content[0].text.trim();
            
            // 숫자 추출
            const similarityMatch = aiResponse.match(/[\d.]+/);
            if (similarityMatch) {
                const similarity = parseFloat(similarityMatch[0]);
                // 0.0 ~ 1.0 범위로 제한
                return Math.max(0, Math.min(1, similarity));
            }
            
            // 숫자를 찾을 수 없으면 기본값 사용
            return 0.5;
        } catch (error) {
            console.error('의미적 유사도 계산 오류:', error);
            // 오류 발생 시 기본값 사용 (0.5로 설정하여 원본 유지)
            return 0.5;
        }
    }

    // 텍스트에서 숫자 추출 (콤마, 퍼센트 등 제거 후 숫자만)
    extractNumbers(text) {
        if (!text) return [];
        // 숫자, 콤마, 소수점, 퍼센트 기호 추출
        const numberMatches = text.match(/[\d,]+\.?\d*/g);
        if (!numberMatches) return [];
        
        // 콤마와 퍼센트 제거 후 숫자만 추출
        return numberMatches.map(match => {
            // 콤마 제거
            const cleaned = match.replace(/,/g, '');
            // 퍼센트 기호 제거
            const numStr = cleaned.replace(/%/g, '');
            return parseFloat(numStr) || 0;
        }).filter(num => num > 0 || num === 0); // 0도 포함
    }

    // 숫자가 포함된 텍스트인지 확인
    hasNumbers(text) {
        if (!text) return false;
        return /[\d,]+\.?\d*/.test(text);
    }

    // 두 텍스트의 숫자가 정확히 일치하는지 확인
    numbersMatch(text1, text2) {
        const nums1 = this.extractNumbers(text1);
        const nums2 = this.extractNumbers(text2);
        
        // 둘 다 숫자가 없으면 true (숫자 매칭 불필요)
        if (nums1.length === 0 && nums2.length === 0) return true;
        
        // 하나만 숫자가 있으면 false
        if (nums1.length === 0 || nums2.length === 0) return false;
        
        // 숫자 개수가 다르면 false
        if (nums1.length !== nums2.length) return false;
        
        // 모든 숫자가 정확히 일치하는지 확인
        for (let i = 0; i < nums1.length; i++) {
            if (Math.abs(nums1[i] - nums2[i]) > 0.0001) { // 소수점 오차 고려
                return false;
            }
        }
        
        return true;
    }

    // 배치 방식으로 텍스트 매칭 (전체 텍스트를 한 번에 AI에게 제공)
    async batchMatchTexts(koreanTexts, japaneseTexts, infoDiv) {
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            // API 키가 없으면 기존 방식 사용
            return this.simpleMatchTexts(koreanTexts, japaneseTexts);
        }

        // 진행 상태 업데이트
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div>
                        <strong style="color: #1a1a1a;">⏳ AI 의미 기반 매칭 중...</strong><br>
                        <small style="color: #666;">전체 텍스트 분석 중...</small>
                    </div>
                </div>
            `;
        }

        // 한국어와 일본어 텍스트를 번호와 함께 정리
        const koreanList = koreanTexts
            .map((text, idx) => ({ idx: idx + 1, text: text || '' }))
            .filter(item => item.text.trim());
        
        const japaneseList = japaneseTexts
            .map((text, idx) => ({ idx: idx + 1, text: text || '' }))
            .filter(item => item.text.trim());

        // 전체 텍스트를 한 번에 AI에게 제공하는 프롬프트
        const koreanTextBlock = koreanList.map(item => `${item.idx}. ${item.text}`).join('\n');
        const japaneseTextBlock = japaneseList.map(item => `${item.idx}. ${item.text}`).join('\n');

        const prompt = `당신은 한일 번역 전문가입니다. 아래 한국어와 일본어 병렬 텍스트를 문장/구 단위로 정확히 매칭해서 표로 출력해주세요.

<작업 지침>
1. 한국어 원문과 일본어 원문을 한 줄씩 대조하며 읽으세요
2. 의미가 대응되는 부분끼리 매칭하세요 (문장, 구, 단어 단위 모두 가능)
3. 순서대로 위에서부터 아래로 매칭하세요
4. 제목, 부제목, 본문, 표 데이터 등 모든 요소를 빠짐없이 매칭하세요
5. 인명, 회사명 등 고유명사는 특히 주의해서 정확히 매칭하세요
6. 숫자가 포함된 경우 숫자가 일치하는 항목을 우선적으로 매칭하세요
7. 모든 한국어 항목과 일본어 항목을 빠짐없이 매칭하세요 (빈 칸이 없도록)
</작업 지침>

<한국어 텍스트>
${koreanTextBlock}
</한국어 텍스트>

<일본어 텍스트>
${japaneseTextBlock}
</일본어 텍스트>

위 텍스트들을 분석하여 매칭 결과를 다음 JSON 형식으로 출력해주세요:

{
  "matches": [
    {
      "korean_index": 1,
      "japanese_index": 1,
      "korean_text": "한국어 텍스트",
      "japanese_text": "일본어 텍스트"
    },
    ...
  ]
}

각 매칭은 의미가 대응되는 한국어와 일본어 쌍입니다. 한국어 번호와 일본어 번호를 정확히 매칭해주세요.`;

        try {
            // 프록시 서버를 통해 API 호출 (CORS 우회)
            const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 8000,
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('API 응답 형식 오류');
            }

            const aiResponse = data.content[0].text.trim();
            console.log('AI 매칭 응답:', aiResponse);

            // JSON 추출 (코드 블록이 있으면 제거)
            let jsonText = aiResponse;
            const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1];
            } else {
                // 코드 블록이 없으면 첫 번째 { 부터 마지막 } 까지 추출
                const firstBrace = jsonText.indexOf('{');
                const lastBrace = jsonText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonText = jsonText.substring(firstBrace, lastBrace + 1);
                }
            }

            const matchResult = JSON.parse(jsonText);
            const matches = matchResult.matches || [];

            // 매칭 결과를 results 형식으로 변환
            const results = [];
            const usedKoreanIndices = new Set();
            const usedJapaneseIndices = new Set();

            // AI가 매칭한 결과 처리
            for (const match of matches) {
                const koIdx = match.korean_index - 1; // 0-based index
                const jaIdx = match.japanese_index - 1; // 0-based index
                
                if (koIdx >= 0 && koIdx < koreanTexts.length && 
                    jaIdx >= 0 && jaIdx < japaneseTexts.length) {
                    const koText = koreanTexts[koIdx];
                    const jaText = japaneseTexts[jaIdx];
                    
                    if (koText && koText.trim() && jaText && jaText.trim()) {
                        results.push({
                            korean: koText,
                            japanese: jaText,
                            japaneseIndex: jaIdx,
                            similarity: 1.0 // AI가 매칭한 것이므로 높은 유사도
                        });
                        usedKoreanIndices.add(koIdx);
                        usedJapaneseIndices.add(jaIdx);
                    }
                }
            }

            // 매칭되지 않은 한국어 항목 추가
            for (let koIdx = 0; koIdx < koreanTexts.length; koIdx++) {
                if (!usedKoreanIndices.has(koIdx) && koreanTexts[koIdx] && koreanTexts[koIdx].trim()) {
                    // 사용 가능한 일본어 찾기
                    let matched = false;
                    for (let jaIdx = 0; jaIdx < japaneseTexts.length; jaIdx++) {
                        if (!usedJapaneseIndices.has(jaIdx) && japaneseTexts[jaIdx] && japaneseTexts[jaIdx].trim()) {
                            results.push({
                                korean: koreanTexts[koIdx],
                                japanese: japaneseTexts[jaIdx],
                                japaneseIndex: jaIdx,
                                similarity: 0.5 // 강제 매칭
                            });
                            usedJapaneseIndices.add(jaIdx);
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        results.push({
                            korean: koreanTexts[koIdx],
                            japanese: '',
                            japaneseIndex: -1,
                            similarity: 0
                        });
                    }
                }
            }

            // 매칭되지 않은 일본어 항목 추가
            for (let jaIdx = 0; jaIdx < japaneseTexts.length; jaIdx++) {
                if (!usedJapaneseIndices.has(jaIdx) && japaneseTexts[jaIdx] && japaneseTexts[jaIdx].trim()) {
                    // 빈 칸이 있는 한국어 항목 찾기
                    const emptyKo = results.find(r => r.korean && !r.japanese);
                    if (emptyKo) {
                        emptyKo.japanese = japaneseTexts[jaIdx];
                        emptyKo.japaneseIndex = jaIdx;
                        emptyKo.similarity = 0.5;
                    } else {
                        results.push({
                            korean: '',
                            japanese: japaneseTexts[jaIdx],
                            japaneseIndex: jaIdx,
                            similarity: 0
                        });
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('AI 매칭 오류:', error);
            // 오류 발생 시 기존 방식으로 폴백
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
                        <strong style="color: #856404;">⚠️ AI 매칭 실패, 기본 매칭 방식 사용 중...</strong>
                    </div>
                `;
            }
            return this.simpleMatchTexts(koreanTexts, japaneseTexts);
        }
    }

    // API 키가 없을 때 사용하는 간단한 매칭
    simpleMatchTexts(koreanTexts, japaneseTexts) {
        const results = [];
        const usedJapaneseIndices = new Set();
        
        for (let koIdx = 0; koIdx < koreanTexts.length; koIdx++) {
            const koText = koreanTexts[koIdx];
            if (!koText || !koText.trim()) continue;
            
            let bestMatch = null;
            let bestMatchIndex = -1;
            let bestSimilarity = 0;
            
            for (let jaIdx = 0; jaIdx < japaneseTexts.length; jaIdx++) {
                if (usedJapaneseIndices.has(jaIdx)) continue;
                
                const jaText = japaneseTexts[jaIdx];
                if (!jaText || !jaText.trim()) continue;
                
                const similarity = this.simpleTextSimilarity(koText, jaText);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = jaText;
                    bestMatchIndex = jaIdx;
                }
            }
            
            if (bestMatch && bestSimilarity >= 0.3) {
                results.push({
                    korean: koText,
                    japanese: bestMatch,
                    japaneseIndex: bestMatchIndex,
                    similarity: bestSimilarity
                });
                usedJapaneseIndices.add(bestMatchIndex);
            } else {
                results.push({
                    korean: koText,
                    japanese: '',
                    japaneseIndex: -1,
                    similarity: bestSimilarity
                });
            }
        }
        
        // 매칭되지 않은 일본어 텍스트 추가
        for (let jaIdx = 0; jaIdx < japaneseTexts.length; jaIdx++) {
            if (!usedJapaneseIndices.has(jaIdx) && japaneseTexts[jaIdx] && japaneseTexts[jaIdx].trim()) {
                results.push({
                    korean: '',
                    japanese: japaneseTexts[jaIdx],
                    japaneseIndex: jaIdx,
                    similarity: 0
                });
            }
        }
        
        return results;
    }

    // 간단한 텍스트 유사도 (API 키가 없을 때 사용)
    simpleTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        // 공통 단어 비율 계산
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(w => words2.includes(w));
        const totalWords = new Set([...words1, ...words2]).size;
        
        return totalWords > 0 ? commonWords.length / totalWords : 0;
    }

    // 위치 기준으로 텍스트 매칭 (개선: 위치, 길이, 숫자/영문 일치도 종합 고려)
    matchByPosition(koreanTexts, japaneseTexts) {
        const pairs = [];
        
        // 한국어 텍스트가 위치 정보를 포함하는지 확인
        const koHasPosition = koreanTexts.length > 0 && typeof koreanTexts[0] === 'object' && koreanTexts[0].text !== undefined;
        const jaHasPosition = japaneseTexts.length > 0 && typeof japaneseTexts[0] === 'object' && japaneseTexts[0].text !== undefined;
        
        if (!koHasPosition && !jaHasPosition) {
            // 위치 정보가 없으면 기존 방식 (인덱스 기준)
            const maxTexts = Math.max(koreanTexts.length, japaneseTexts.length);
            for (let j = 0; j < maxTexts; j++) {
                const koText = typeof koreanTexts[j] === 'string' ? koreanTexts[j] : (koreanTexts[j]?.text || '');
                const jaText = typeof japaneseTexts[j] === 'string' ? japaneseTexts[j] : (japaneseTexts[j]?.text || '');
                if (koText || jaText) {
                    pairs.push({ korean: koText, japanese: jaText });
                }
            }
            return pairs;
        }
        
        // 종합 점수 기반 매칭
        // 각 한국어 텍스트에 대해 가장 적합한 일본어 텍스트 찾기
        const usedJapaneseIndices = new Set();
        
        for (const koBlock of koreanTexts) {
            const koText = typeof koBlock === 'string' ? koBlock : (koBlock?.text || '');
            const koX = typeof koBlock === 'object' && koBlock.x !== undefined ? koBlock.x : 0;
            const koY = typeof koBlock === 'object' && koBlock.y !== undefined ? koBlock.y : 0;
            
            if (!koText || !koText.trim()) continue;
            
            // 가장 적합한 일본어 텍스트 찾기 (종합 점수 기반)
            let bestJa = null;
            let bestScore = -1;
            let bestIndex = -1;
            
            for (let j = 0; j < japaneseTexts.length; j++) {
                if (usedJapaneseIndices.has(j)) continue;
                
                const jaBlock = japaneseTexts[j];
                const jaText = typeof jaBlock === 'string' ? jaBlock : (jaBlock?.text || '');
                if (!jaText || !jaText.trim()) continue;
                
                const jaX = typeof jaBlock === 'object' && jaBlock.x !== undefined ? jaBlock.x : 0;
                const jaY = typeof jaBlock === 'object' && jaBlock.y !== undefined ? jaBlock.y : 0;
                
                // 1. 위치 점수 계산 (0~1, 가까울수록 높음)
                let positionScore = 0;
                if (koX !== 0 || koY !== 0 || jaX !== 0 || jaY !== 0) {
                    const distance = Math.sqrt(Math.pow(koX - jaX, 2) + Math.pow(koY - jaY, 2));
                    const yDiff = Math.abs(koY - jaY);
                    
                    // Y 좌표 차이가 크면 매칭하지 않음 (같은 줄에 있는 것으로 간주)
                    if (yDiff > 200000) continue; // 200000 EMU = 약 20cm 이상 차이나면 다른 줄로 간주
                    
                    // 거리가 가까울수록 높은 점수 (최대 거리 500000 EMU 기준)
                    positionScore = Math.max(0, 1 - (distance / 500000));
                } else {
                    // 위치 정보가 없으면 인덱스 기반 점수
                    const indexDiff = Math.abs(koreanTexts.indexOf(koBlock) - j);
                    positionScore = Math.max(0, 1 - (indexDiff * 0.1));
                }
                
                // 2. 텍스트 길이 점수 계산 (0~1, 비슷할수록 높음)
                const koLength = koText.length;
                const jaLength = jaText.length;
                const lengthDiff = Math.abs(koLength - jaLength);
                const maxLength = Math.max(koLength, jaLength, 1);
                const lengthScore = Math.max(0, 1 - (lengthDiff / maxLength));
                
                // 3. 숫자 일치도 점수 계산 (0~1)
                let numberScore = 0;
                if (this.numbersMatch(koText, jaText)) {
                    numberScore = 1;
                } else {
                    const koNums = this.extractNumbers(koText);
                    const jaNums = this.extractNumbers(jaText);
                    if (koNums.length > 0 && jaNums.length > 0) {
                        // 숫자가 일부 일치하는 경우
                        const commonNums = koNums.filter(n => jaNums.includes(n));
                        numberScore = commonNums.length / Math.max(koNums.length, jaNums.length);
                    }
                }
                
                // 4. 영문 일치도 점수 계산 (0~1)
                let englishScore = 0;
                const koEnglish = this.extractEnglish(koText);
                const jaEnglish = this.extractEnglish(jaText);
                if (koEnglish.length > 0 && jaEnglish.length > 0) {
                    // 대소문자 무시하고 비교
                    const koLower = koEnglish.map(e => e.toLowerCase());
                    const jaLower = jaEnglish.map(e => e.toLowerCase());
                    const commonEnglish = koLower.filter(e => jaLower.includes(e));
                    englishScore = commonEnglish.length / Math.max(koEnglish.length, jaEnglish.length);
                } else if (koEnglish.length === 0 && jaEnglish.length === 0) {
                    // 둘 다 영문이 없으면 중립 점수
                    englishScore = 0.5;
                }
                
                // 종합 점수 계산 (가중 평균)
                // 위치: 40%, 길이: 20%, 숫자: 25%, 영문: 15%
                const totalScore = 
                    positionScore * 0.4 +
                    lengthScore * 0.2 +
                    numberScore * 0.25 +
                    englishScore * 0.15;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestJa = jaText;
                    bestIndex = j;
                }
            }
            
            // 매칭된 일본어가 있으면 사용 표시 (임계값 0.3 이상)
            if (bestIndex >= 0 && bestScore >= 0.3) {
                usedJapaneseIndices.add(bestIndex);
            }
            
            pairs.push({
                korean: koText,
                japanese: bestJa || ''
            });
        }
        
        // 매칭되지 않은 일본어 텍스트 추가
        for (let j = 0; j < japaneseTexts.length; j++) {
            if (!usedJapaneseIndices.has(j)) {
                const jaBlock = japaneseTexts[j];
                const jaText = typeof jaBlock === 'string' ? jaBlock : (jaBlock?.text || '');
                if (jaText && jaText.trim()) {
                    pairs.push({ korean: '', japanese: jaText });
                }
            }
        }
        
        return pairs;
    }
    
    // 영문 추출 함수
    extractEnglish(text) {
        if (!text || typeof text !== 'string') return [];
        // 영문 단어 추출 (연속된 영문자)
        const matches = text.match(/[A-Za-z]+/g);
        return matches || [];
    }

    // 단순 숫자만 있는 텍스트인지 확인
    // 문장 단위로 분할
    splitIntoSentences(text) {
        if (!text || typeof text !== 'string') return [];
        
        // 텍스트를 정리
        let cleaned = text.trim();
        if (!cleaned) return [];
        
        // 문장 끝 구분자로 분할 (. ! ? 등)
        // 하지만 약어나 숫자 뒤의 점은 제외
        const sentences = [];
        
        // 간단한 문장 분할: 마침표, 느낌표, 물음표로 분할
        // 하지만 연속된 공백이나 줄바꿈도 고려
        const parts = cleaned.split(/([.!?。！？]\s+|[.!?。！？]$|\n+)/);
        
        let currentSentence = '';
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.match(/^[.!?。！？]/)) {
                // 문장 끝 구분자
                currentSentence += part;
                if (currentSentence.trim()) {
                    sentences.push(currentSentence.trim());
                }
                currentSentence = '';
            } else if (part.match(/^\n+$/)) {
                // 줄바꿈만 있는 경우
                if (currentSentence.trim()) {
                    sentences.push(currentSentence.trim());
                }
                currentSentence = '';
            } else {
                currentSentence += part;
            }
        }
        
        // 마지막 문장 추가
        if (currentSentence.trim()) {
            sentences.push(currentSentence.trim());
        }
        
        // 빈 문장 제거 및 최소 길이 필터링
        return sentences.filter(s => s.length > 1);
    }

    isOnlyNumbers(text) {
        if (!text || !text.trim()) return false;
        // 숫자, 공백, 구두점(., ,, :, ;, -, /, %, 등)만 있는지 확인
        const cleaned = text.trim().replace(/[\s.,:;/\-()%]/g, '');
        return /^\d+$/.test(cleaned) && cleaned.length > 0;
    }

    // 문장 단위로 분할 버튼 클릭 시 호출
    splitExtractedIntoSentences() {
        if (!this.extractedData || this.extractedData.length === 0) {
            alert('분할할 데이터가 없습니다.');
            return;
        }

        const infoDiv = document.getElementById('pptExtractInfo');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top: 3px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div>
                        <strong style="color: #1a1a1a;">⏳ 문장 단위 분할 중...</strong>
                    </div>
                </div>
            `;
        }

        const splitData = [];
        
        for (const pair of this.extractedData) {
            // 문장 단위로 분할
            const koSentences = this.splitIntoSentences(pair['한국어'] || '');
            const jaSentences = this.splitIntoSentences(pair['일본어'] || '');
            
            // 문장이 분할된 경우 각 문장을 개별 항목으로 추가
            if (koSentences.length > 1 || jaSentences.length > 1) {
                const maxSentences = Math.max(koSentences.length, jaSentences.length);
                
                for (let s = 0; s < maxSentences; s++) {
                    const koSentence = koSentences[s] || '';
                    const jaSentence = jaSentences[s] || '';
                    
                    // 빈 문장 제외
                    if (koSentence || jaSentence) {
                        splitData.push({
                            '한국어': koSentence,
                            '일본어': jaSentence
                        });
                    }
                }
            } else {
                // 문장이 분할되지 않은 경우 (원본 유지)
                if (pair['한국어'] || pair['일본어']) {
                    splitData.push({
                        '한국어': pair['한국어'] || '',
                        '일본어': pair['일본어'] || ''
                    });
                }
            }
        }

        // 분할된 데이터로 업데이트
        this.extractedData = splitData;
        this.currentExtractedPage = 1; // 첫 페이지로 리셋
        this.selectedExtractedIndices.clear(); // 선택 초기화
        
        // 결과 다시 표시
        this.showResult(splitData);
        
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #e8f5e9; border-radius: 8px; border: 1px solid #a5d6a7;">
                    <div style="font-size: 20px;">✅</div>
                    <div>
                        <strong style="color: #1a1a1a;">문장 단위 분할 완료!</strong><br>
                        <small style="color: #666;">총 ${splitData.length}개의 문장 쌍으로 분할되었습니다.</small>
                    </div>
                </div>
            `;
        }
    }


    showResult(data) {
        const resultDiv = document.getElementById('pptExtractResult');
        const infoDiv = document.getElementById('pptExtractInfo');
        const tableBody = document.getElementById('extractedTableBody');

        if (resultDiv) {
            resultDiv.style.display = 'block';
        }

        if (infoDiv) {
            const koreanType = this.koreanFileType || '파일';
            const japaneseType = this.japaneseFileType || '파일';
            infoDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #e8f5e9; border-radius: 8px; border: 1px solid #a5d6a7;">
                    <div style="font-size: 20px;">✅</div>
                    <div>
                        <strong style="color: #1a1a1a;">추출 완료!</strong><br>
                        <small style="color: #666;">총 ${data.length}개의 텍스트 쌍이 추출되었습니다. (한국어 ${koreanType.toUpperCase()} 블록: ${this.koreanFileData.length}개, 일본어 ${japaneseType.toUpperCase()} 블록: ${this.japaneseFileData.length}개)</small>
                    </div>
                </div>
            `;
        }

        // 추출된 데이터를 테이블로 표시 (페이지네이션 적용)
        if (tableBody) {
            if (data.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <p>추출된 데이터가 없습니다.</p>
                        </td>
                    </tr>
                `;
            } else {
                // 페이지네이션 계산
                const startIndex = (this.currentExtractedPage - 1) * this.extractedItemsPerPage;
                const endIndex = startIndex + this.extractedItemsPerPage;
                const pageData = data.slice(startIndex, endIndex);
                
                tableBody.innerHTML = pageData.map((row, pageIndex) => {
                    const actualIndex = startIndex + pageIndex; // 실제 데이터 인덱스
                    // korean/japanese 또는 한국어/일본어 키 모두 지원
                    const korValue = this.escapeHtml(row.korean || row.한국어 || '');
                    const jpnValue = this.escapeHtml(row.japanese || row.일본어 || '');
                    const isChecked = this.selectedExtractedIndices.has(actualIndex);
                    
                    // 빈 칸 체크
                    const isEmptyKor = !korValue || korValue.trim() === '';
                    const isEmptyJpn = !jpnValue || jpnValue.trim() === '';
                    const hasEmptyCell = isEmptyKor || isEmptyJpn;
                    
                    // 빈 칸이 있으면 행 배경색 변경
                    const rowStyle = hasEmptyCell ? 'background-color: #fff3cd;' : '';
                    const korInputStyle = isEmptyKor 
                        ? 'width: 100%; padding: 5px 8px; border: 2px solid #ff9800; border-radius: 4px; font-size: 13px; background-color: #fff3cd; min-height: 36px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; overflow: visible; resize: none; height: auto;' 
                        : 'width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px; min-height: 36px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; overflow: visible; resize: none; height: auto;';
                    const jpnInputStyle = isEmptyJpn 
                        ? 'width: 100%; padding: 5px 8px; border: 2px solid #ff9800; border-radius: 4px; font-size: 13px; background-color: #fff3cd; min-height: 36px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; overflow: visible; resize: none; height: auto;' 
                        : 'width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px; min-height: 36px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; overflow: visible; resize: none; height: auto;';
                    
                    return `
                        <tr data-row-index="${actualIndex}" 
                            draggable="true" 
                            class="draggable-row"
                            style="${rowStyle} cursor: move; user-select: none;"
                            ondragstart="if(window.pptExtractor) window.pptExtractor.handleRowDragStart(event, ${actualIndex})"
                            ondragover="if(window.pptExtractor) window.pptExtractor.handleDragOver(event)"
                            ondrop="if(window.pptExtractor) window.pptExtractor.handleRowDrop(event, ${actualIndex})"
                            ondragend="if(window.pptExtractor) window.pptExtractor.handleDragEnd(event)"
                            ondragenter="if(window.pptExtractor) window.pptExtractor.handleRowDragEnter(event, ${actualIndex})"
                            ondragleave="if(window.pptExtractor) window.pptExtractor.handleDragLeave(event)">
                            <td style="pointer-events: auto;">
                                <input type="checkbox" 
                                       class="extracted-row-checkbox" 
                                       data-index="${actualIndex}" 
                                       ${isChecked ? 'checked' : ''} 
                                       onclick="event.stopPropagation();"
                                       onchange="if(window.pptExtractor) window.pptExtractor.toggleSelectExtracted(${actualIndex}, this.checked)">
                            </td>
                            <td style="cursor: move;">${actualIndex + 1}</td>
                            <td class="cell-drop-zone" 
                                data-row-index="${actualIndex}" 
                                data-cell-type="korean"
                                ondragover="if(window.pptExtractor) { event.preventDefault(); window.pptExtractor.handleDragOver(event); }"
                                ondrop="if(window.pptExtractor) window.pptExtractor.handleCellDrop(event, ${actualIndex}, 'korean')"
                                ondragenter="if(window.pptExtractor) window.pptExtractor.handleCellDragEnter(event, ${actualIndex}, 'korean')"
                                ondragleave="if(window.pptExtractor) window.pptExtractor.handleCellDragLeave(event)"
                                style="padding: 12px; cursor: move; min-height: 50px;">
                                <textarea 
                                       class="extracted-kor-input draggable-cell" 
                                       data-index="${actualIndex}"
                                       data-cell-type="korean"
                                       style="${korInputStyle} cursor: move; width: 100%; min-height: 36px; box-sizing: border-box; font-family: inherit; line-height: 1.4;"
                                       oninput="if(window.pptExtractor) { window.pptExtractor.updateExtractedCell(${actualIndex}, '한국어', this.value); this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; }"
                                       onload="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"
                                       draggable="true"
                                       ondragstart="if(window.pptExtractor) window.pptExtractor.handleCellDragStart(event, ${actualIndex}, 'korean')"
                                       ondragend="if(window.pptExtractor) window.pptExtractor.handleDragEnd(event)">${korValue}</textarea>
                            </td>
                            <td class="cell-drop-zone" 
                                data-row-index="${actualIndex}" 
                                data-cell-type="japanese"
                                ondragover="if(window.pptExtractor) { event.preventDefault(); window.pptExtractor.handleDragOver(event); }"
                                ondrop="if(window.pptExtractor) window.pptExtractor.handleCellDrop(event, ${actualIndex}, 'japanese')"
                                ondragenter="if(window.pptExtractor) window.pptExtractor.handleCellDragEnter(event, ${actualIndex}, 'japanese')"
                                ondragleave="if(window.pptExtractor) window.pptExtractor.handleCellDragLeave(event)"
                                style="padding: 12px; cursor: move; min-height: 50px;">
                                <textarea 
                                       class="extracted-jpn-input draggable-cell" 
                                       data-index="${actualIndex}"
                                       data-cell-type="japanese"
                                       style="${jpnInputStyle} cursor: move; width: 100%; min-height: 36px; box-sizing: border-box; font-family: inherit; line-height: 1.4;"
                                       oninput="if(window.pptExtractor) { window.pptExtractor.updateExtractedCell(${actualIndex}, '일본어', this.value); this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; }"
                                       onload="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"
                                       draggable="true"
                                       ondragstart="if(window.pptExtractor) window.pptExtractor.handleCellDragStart(event, ${actualIndex}, 'japanese')"
                                       ondragend="if(window.pptExtractor) window.pptExtractor.handleDragEnd(event)">${jpnValue}</textarea>
                            </td>
                            <td>
                                <button class="btn btn-danger btn-small" onclick="if(window.pptExtractor) window.pptExtractor.deleteRow(${actualIndex})" style="padding: 6px 12px; font-size: 12px;">삭제</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
            
            // 선택된 항목 개수 업데이트
            this.updateExtractedSelectedCount();
            
            // 전체 선택 체크박스 상태 업데이트
            this.updateSelectAllExtractedCheckbox();
            
            // 페이지네이션 정보 업데이트
            this.updateExtractedPagination(data.length);
            
            // textarea 높이 자동 조절 (스크롤 없이 전체 내용 표시)
            setTimeout(() => {
                const textareas = document.querySelectorAll('.extracted-kor-input, .extracted-jpn-input');
                textareas.forEach(textarea => {
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                });
            }, 100);
        }
    }

    // 추출된 셀 값 업데이트 (자동 저장 및 하이라이트 업데이트)
    updateExtractedCell(index, field, value) {
        if (!this.extractedData || index < 0 || index >= this.extractedData.length) {
            return;
        }

        // 데이터 업데이트 (자동 저장)
        const row = this.extractedData[index];
        if (field === '한국어') {
            row.한국어 = value;
        } else if (field === '일본어') {
            row.일본어 = value;
        }

        // 하이라이트 업데이트를 위해 현재 행만 다시 렌더링
        const rowElement = document.querySelector(`tr[data-row-index="${index}"]`);
        if (rowElement) {
            const korInput = rowElement.querySelector('.extracted-kor-input');
            const jpnInput = rowElement.querySelector('.extracted-jpn-input');
            
            if (korInput && jpnInput) {
                const korValue = row.한국어 || '';
                const jpnValue = row.일본어 || '';
                const isEmptyKor = !korValue || korValue.trim() === '';
                const isEmptyJpn = !jpnValue || jpnValue.trim() === '';
                const hasEmptyCell = isEmptyKor || isEmptyJpn;
                
                // 행 배경색 업데이트
                rowElement.style.backgroundColor = hasEmptyCell ? '#fff3cd' : '';
                
                // 입력 필드 스타일 업데이트
                korInput.style.border = isEmptyKor ? '2px solid #ff9800' : '1px solid #e0e0e0';
                korInput.style.backgroundColor = isEmptyKor ? '#fff3cd' : '';
                
                jpnInput.style.border = isEmptyJpn ? '2px solid #ff9800' : '1px solid #e0e0e0';
                jpnInput.style.backgroundColor = isEmptyJpn ? '#fff3cd' : '';
            }
        }
    }

    // 추출된 셀 값 업데이트 (자동 저장 및 하이라이트 업데이트)
    updateExtractedCell(index, field, value) {
        if (!this.extractedData || index < 0 || index >= this.extractedData.length) {
            return;
        }

        // 데이터 업데이트 (자동 저장)
        const row = this.extractedData[index];
        if (field === '한국어') {
            row.한국어 = value;
        } else if (field === '일본어') {
            row.일본어 = value;
        }

        // 하이라이트 업데이트를 위해 현재 행만 다시 렌더링
        const rowElement = document.querySelector(`tr[data-row-index="${index}"]`);
        if (rowElement) {
            const korInput = rowElement.querySelector('.extracted-kor-input');
            const jpnInput = rowElement.querySelector('.extracted-jpn-input');
            
            if (korInput && jpnInput) {
                const korValue = row.한국어 || '';
                const jpnValue = row.일본어 || '';
                const isEmptyKor = !korValue || korValue.trim() === '';
                const isEmptyJpn = !jpnValue || jpnValue.trim() === '';
                const hasEmptyCell = isEmptyKor || isEmptyJpn;
                
                // 행 배경색 업데이트
                rowElement.style.backgroundColor = hasEmptyCell ? '#fff3cd' : '';
                
                // 입력 필드 스타일 업데이트
                korInput.style.border = isEmptyKor ? '2px solid #ff9800' : '1px solid #e0e0e0';
                korInput.style.backgroundColor = isEmptyKor ? '#fff3cd' : '';
                
                jpnInput.style.border = isEmptyJpn ? '2px solid #ff9800' : '1px solid #e0e0e0';
                jpnInput.style.backgroundColor = isEmptyJpn ? '#fff3cd' : '';
            }
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    deleteRow(index) {
        if (!this.extractedData || !Array.isArray(this.extractedData)) {
            console.error('extractedData가 없거나 배열이 아닙니다.');
            return;
        }
        
        const numIndex = typeof index === 'string' ? parseInt(index, 10) : index;
        
        if (confirm('이 행을 삭제하시겠습니까?')) {
            if (numIndex >= 0 && numIndex < this.extractedData.length) {
                this.extractedData.splice(numIndex, 1);
                // 선택된 인덱스 업데이트 (삭제된 인덱스 이후의 인덱스들을 1씩 감소)
                const newSelectedIndices = new Set();
                this.selectedExtractedIndices.forEach(selectedIndex => {
                    if (selectedIndex < numIndex) {
                        newSelectedIndices.add(selectedIndex);
                    } else if (selectedIndex > numIndex) {
                        newSelectedIndices.add(selectedIndex - 1);
                    }
                });
                this.selectedExtractedIndices = newSelectedIndices;
                
                // 페이지 조정 (현재 페이지에 데이터가 없으면 이전 페이지로)
                const maxPage = Math.ceil(this.extractedData.length / this.extractedItemsPerPage);
                if (this.currentExtractedPage > maxPage && maxPage > 0) {
                    this.currentExtractedPage = maxPage;
                }
                
                this.showResult(this.extractedData);
            } else {
                console.error('유효하지 않은 인덱스:', numIndex);
                alert('삭제할 수 없습니다. 페이지를 새로고침해주세요.');
            }
        }
    }

    // 추출된 항목 선택/해제
    toggleSelectExtracted(index, checked) {
        if (checked) {
            this.selectedExtractedIndices.add(index);
        } else {
            this.selectedExtractedIndices.delete(index);
        }
        this.updateExtractedSelectedCount();
        this.updateSelectAllExtractedCheckbox();
        this.updateDeleteSelectedButton();
    }

    // 전체 선택/해제 (현재 페이지의 항목만)
    toggleSelectAllExtracted(checked) {
        if (!this.extractedData || !Array.isArray(this.extractedData)) {
            return;
        }
        
        // 현재 페이지의 인덱스 범위 계산
        const startIndex = (this.currentExtractedPage - 1) * this.extractedItemsPerPage;
        const endIndex = Math.min(startIndex + this.extractedItemsPerPage, this.extractedData.length);
        
        if (checked) {
            // 현재 페이지의 모든 인덱스 선택
            for (let i = startIndex; i < endIndex; i++) {
                this.selectedExtractedIndices.add(i);
            }
        } else {
            // 현재 페이지의 선택만 해제
            for (let i = startIndex; i < endIndex; i++) {
                this.selectedExtractedIndices.delete(i);
            }
        }
        
        // 체크박스 상태 업데이트
        const checkboxes = document.querySelectorAll('.extracted-row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        
        this.updateExtractedSelectedCount();
        this.updateDeleteSelectedButton();
        this.updateSelectAllExtractedCheckbox();
    }

    // 전체 선택 체크박스 상태 업데이트 (현재 페이지 기준)
    updateSelectAllExtractedCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllExtractedCheckbox');
        if (!selectAllCheckbox || !this.extractedData || this.extractedData.length === 0) {
            return;
        }
        
        // 현재 페이지의 인덱스 범위 계산
        const startIndex = (this.currentExtractedPage - 1) * this.extractedItemsPerPage;
        const endIndex = Math.min(startIndex + this.extractedItemsPerPage, this.extractedData.length);
        const pageItemCount = endIndex - startIndex;
        
        if (pageItemCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        
        // 현재 페이지에서 선택된 항목 수 계산
        let checkedCount = 0;
        for (let i = startIndex; i < endIndex; i++) {
            if (this.selectedExtractedIndices.has(i)) {
                checkedCount++;
            }
        }
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === pageItemCount) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    // 선택된 항목 개수 업데이트
    updateExtractedSelectedCount() {
        const selectedCountDiv = document.getElementById('extractedSelectedCount');
        const count = this.selectedExtractedIndices.size;
        
        if (selectedCountDiv) {
            if (count > 0) {
                selectedCountDiv.textContent = `선택됨: ${count}개`;
                selectedCountDiv.style.color = '#27ae60';
            } else {
                selectedCountDiv.textContent = '';
            }
        }
    }

    // 삭제 버튼 표시/숨김 업데이트
    updateDeleteSelectedButton() {
        const hasSelection = this.selectedExtractedIndices.size > 0;
        const deleteBtn = document.getElementById('deleteSelectedExtractedBtn');
        const korUpBtn = document.getElementById('extractedKorUpBtn');
        const korDownBtn = document.getElementById('extractedKorDownBtn');
        const jpnUpBtn = document.getElementById('extractedJpnUpBtn');
        const jpnDownBtn = document.getElementById('extractedJpnDownBtn');
        
        if (deleteBtn) {
            deleteBtn.style.display = hasSelection ? 'block' : 'none';
        }
        if (korUpBtn) {
            korUpBtn.style.display = hasSelection ? 'block' : 'none';
        }
        if (korDownBtn) {
            korDownBtn.style.display = hasSelection ? 'block' : 'none';
        }
        if (jpnUpBtn) {
            jpnUpBtn.style.display = hasSelection ? 'block' : 'none';
        }
        if (jpnDownBtn) {
            jpnDownBtn.style.display = hasSelection ? 'block' : 'none';
        }
    }

    // 선택된 항목 삭제
    deleteSelectedRows() {
        if (this.selectedExtractedIndices.size === 0) {
            alert('삭제할 항목을 선택해주세요.');
            return;
        }
        
        if (!confirm(`선택한 ${this.selectedExtractedIndices.size}개의 항목을 삭제하시겠습니까?`)) {
            return;
        }
        
        // 선택된 인덱스를 내림차순으로 정렬하여 뒤에서부터 삭제 (인덱스 변경 방지)
        const sortedIndices = Array.from(this.selectedExtractedIndices).sort((a, b) => b - a);
        
        sortedIndices.forEach(index => {
            if (index >= 0 && index < this.extractedData.length) {
                this.extractedData.splice(index, 1);
            }
        });
        
        // 선택 초기화
        this.selectedExtractedIndices.clear();
        
        // 페이지 조정 (현재 페이지에 데이터가 없으면 이전 페이지로)
        const maxPage = Math.ceil(this.extractedData.length / this.extractedItemsPerPage);
        if (this.currentExtractedPage > maxPage && maxPage > 0) {
            this.currentExtractedPage = maxPage;
        }
        
        // 테이블 다시 렌더링
        this.showResult(this.extractedData);
    }

    // 선택된 항목의 KOR 값 올리기 (한 칸 위로)
    moveSelectedKorUp() {
        console.log('[moveSelectedKorUp] 함수 호출됨');
        if (this.selectedExtractedIndices.size === 0 || !this.extractedData) {
            console.log('[moveSelectedKorUp] 선택된 항목이 없거나 데이터가 없음');
            return;
        }
        
        const sortedIndices = Array.from(this.selectedExtractedIndices).sort((a, b) => a - b);
        console.log('[moveSelectedKorUp] 선택된 인덱스:', sortedIndices);
        
        sortedIndices.forEach(index => {
            if (index > 0 && this.extractedData[index] && this.extractedData[index - 1]) {
                // 위 행의 KOR 값과 현재 행의 KOR 값 교환
                const temp = this.extractedData[index].korean;
                this.extractedData[index].korean = this.extractedData[index - 1].korean;
                this.extractedData[index - 1].korean = temp;
                console.log(`[moveSelectedKorUp] 인덱스 ${index}와 ${index - 1}의 KOR 값 교환`);
            }
        });
        
        this.showResult(this.extractedData);
    }

    // 선택된 항목의 KOR 값 내리기 (한 칸 아래로)
    moveSelectedKorDown() {
        console.log('[moveSelectedKorDown] 함수 호출됨');
        if (this.selectedExtractedIndices.size === 0 || !this.extractedData) {
            console.log('[moveSelectedKorDown] 선택된 항목이 없거나 데이터가 없음');
            return;
        }
        
        const sortedIndices = Array.from(this.selectedExtractedIndices).sort((a, b) => b - a);
        console.log('[moveSelectedKorDown] 선택된 인덱스:', sortedIndices);
        
        sortedIndices.forEach(index => {
            if (index < this.extractedData.length - 1 && this.extractedData[index] && this.extractedData[index + 1]) {
                // 아래 행의 KOR 값과 현재 행의 KOR 값 교환
                const temp = this.extractedData[index].korean;
                this.extractedData[index].korean = this.extractedData[index + 1].korean;
                this.extractedData[index + 1].korean = temp;
                console.log(`[moveSelectedKorDown] 인덱스 ${index}와 ${index + 1}의 KOR 값 교환`);
            }
        });
        
        this.showResult(this.extractedData);
    }

    // 선택된 항목의 JPN 값 올리기 (한 칸 위로)
    moveSelectedJpnUp() {
        console.log('[moveSelectedJpnUp] 함수 호출됨');
        if (this.selectedExtractedIndices.size === 0 || !this.extractedData) {
            console.log('[moveSelectedJpnUp] 선택된 항목이 없거나 데이터가 없음');
            return;
        }
        
        const sortedIndices = Array.from(this.selectedExtractedIndices).sort((a, b) => a - b);
        console.log('[moveSelectedJpnUp] 선택된 인덱스:', sortedIndices);
        
        sortedIndices.forEach(index => {
            if (index > 0 && this.extractedData[index] && this.extractedData[index - 1]) {
                // 위 행의 JPN 값과 현재 행의 JPN 값 교환
                const temp = this.extractedData[index].japanese;
                this.extractedData[index].japanese = this.extractedData[index - 1].japanese;
                this.extractedData[index - 1].japanese = temp;
                console.log(`[moveSelectedJpnUp] 인덱스 ${index}와 ${index - 1}의 JPN 값 교환`);
            }
        });
        
        this.showResult(this.extractedData);
    }

    // 선택된 항목의 JPN 값 내리기 (한 칸 아래로)
    moveSelectedJpnDown() {
        console.log('[moveSelectedJpnDown] 함수 호출됨');
        if (this.selectedExtractedIndices.size === 0 || !this.extractedData) {
            console.log('[moveSelectedJpnDown] 선택된 항목이 없거나 데이터가 없음');
            return;
        }
        
        const sortedIndices = Array.from(this.selectedExtractedIndices).sort((a, b) => b - a);
        console.log('[moveSelectedJpnDown] 선택된 인덱스:', sortedIndices);
        
        sortedIndices.forEach(index => {
            if (index < this.extractedData.length - 1 && this.extractedData[index] && this.extractedData[index + 1]) {
                // 아래 행의 JPN 값과 현재 행의 JPN 값 교환
                const temp = this.extractedData[index].japanese;
                this.extractedData[index].japanese = this.extractedData[index + 1].japanese;
                this.extractedData[index + 1].japanese = temp;
                console.log(`[moveSelectedJpnDown] 인덱스 ${index}와 ${index + 1}의 JPN 값 교환`);
            }
        });
        
        this.showResult(this.extractedData);
    }

    // 페이지당 항목 수 설정
    setExtractedItemsPerPage(itemsPerPage) {
        this.extractedItemsPerPage = itemsPerPage;
        this.currentExtractedPage = 1; // 첫 페이지로 이동
        if (this.extractedData) {
            this.showResult(this.extractedData);
        }
    }

    // 이전 페이지
    prevExtractedPage() {
        if (this.currentExtractedPage > 1) {
            this.currentExtractedPage--;
            if (this.extractedData) {
                this.showResult(this.extractedData);
            }
        }
    }

    // 다음 페이지
    nextExtractedPage() {
        if (!this.extractedData) return;
        const maxPage = Math.ceil(this.extractedData.length / this.extractedItemsPerPage);
        if (this.currentExtractedPage < maxPage) {
            this.currentExtractedPage++;
            this.showResult(this.extractedData);
        }
    }

    // 페이지네이션 정보 업데이트
    updateExtractedPagination(totalItems) {
        const pageInfo = document.getElementById('extractedPageInfo');
        const prevBtn = document.getElementById('extractedPrevBtn');
        const nextBtn = document.getElementById('extractedNextBtn');
        const itemsPerPageSelect = document.getElementById('extractedItemsPerPageSelect');
        
        const maxPage = Math.ceil(totalItems / this.extractedItemsPerPage) || 1;
        
        if (pageInfo) {
            pageInfo.textContent = `${this.currentExtractedPage} / ${maxPage}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentExtractedPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentExtractedPage >= maxPage;
        }
        
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = this.extractedItemsPerPage.toString();
        }
    }

    // 한국어 전체를 한 줄씩 위로 이동
    shiftKorUp() {
        if (!this.extractedData || !Array.isArray(this.extractedData) || this.extractedData.length === 0) {
            alert('데이터가 없습니다.');
            return;
        }
        
        // 첫 번째 행의 한국어를 저장
        const firstKor = this.extractedData[0].한국어 || '';
        
        // 모든 행의 한국어를 한 줄씩 위로 이동
        for (let i = 0; i < this.extractedData.length - 1; i++) {
            this.extractedData[i].한국어 = this.extractedData[i + 1].한국어 || '';
        }
        
        // 마지막 행에 첫 번째 행의 한국어를 넣기
        this.extractedData[this.extractedData.length - 1].한국어 = firstKor;
        
        // 테이블 다시 렌더링
        this.showResult(this.extractedData);
    }

    // 한국어 전체를 한 줄씩 아래로 이동
    shiftKorDown() {
        if (!this.extractedData || !Array.isArray(this.extractedData) || this.extractedData.length === 0) {
            alert('데이터가 없습니다.');
            return;
        }
        
        // 마지막 행의 한국어를 저장
        const lastKor = this.extractedData[this.extractedData.length - 1].한국어 || '';
        
        // 모든 행의 한국어를 한 줄씩 아래로 이동
        for (let i = this.extractedData.length - 1; i > 0; i--) {
            this.extractedData[i].한국어 = this.extractedData[i - 1].한국어 || '';
        }
        
        // 첫 번째 행에 마지막 행의 한국어를 넣기
        this.extractedData[0].한국어 = lastKor;
        
        // 테이블 다시 렌더링
        this.showResult(this.extractedData);
    }

    // 일본어 전체를 한 줄씩 위로 이동
    shiftJpnUp() {
        if (!this.extractedData || !Array.isArray(this.extractedData) || this.extractedData.length === 0) {
            alert('데이터가 없습니다.');
            return;
        }
        
        // 첫 번째 행의 일본어를 저장
        const firstJpn = this.extractedData[0].일본어 || '';
        
        // 모든 행의 일본어를 한 줄씩 위로 이동
        for (let i = 0; i < this.extractedData.length - 1; i++) {
            this.extractedData[i].일본어 = this.extractedData[i + 1].일본어 || '';
        }
        
        // 마지막 행에 첫 번째 행의 일본어를 넣기
        this.extractedData[this.extractedData.length - 1].일본어 = firstJpn;
        
        // 테이블 다시 렌더링
        this.showResult(this.extractedData);
    }

    // 일본어 전체를 한 줄씩 아래로 이동
    shiftJpnDown() {
        if (!this.extractedData || !Array.isArray(this.extractedData) || this.extractedData.length === 0) {
            alert('데이터가 없습니다.');
            return;
        }
        
        // 마지막 행의 일본어를 저장
        const lastJpn = this.extractedData[this.extractedData.length - 1].일본어 || '';
        
        // 모든 행의 일본어를 한 줄씩 아래로 이동
        for (let i = this.extractedData.length - 1; i > 0; i--) {
            this.extractedData[i].일본어 = this.extractedData[i - 1].일본어 || '';
        }
        
        // 첫 번째 행에 마지막 행의 일본어를 넣기
        this.extractedData[0].일본어 = lastJpn;
        
        // 테이블 다시 렌더링
        this.showResult(this.extractedData);
    }

    downloadExcel() {
        if (!this.extractedData) {
            alert('먼저 텍스트를 추출해주세요.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(this.extractedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '병렬텍스트');

        // 열 너비 설정
        const colWidths = [
            { wch: 50 }, // 한국어
            { wch: 50 }  // 일본어
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, 'ppt_parallel_text.xlsx');
    }

    addToCorpus() {
        if (!this.extractedData || this.extractedData.length === 0) {
            alert('먼저 텍스트를 추출하고 매칭해주세요.');
            return;
        }

        // 모든 데이터를 가져오기 (페이지네이션과 무관하게 전체 데이터 사용)
        // 테이블에서 수정된 데이터가 있으면 그것을 사용하고, 없으면 원본 데이터 사용
        const korInputs = document.querySelectorAll('.extracted-kor-input');
        const jpnInputs = document.querySelectorAll('.extracted-jpn-input');
        
        // 입력 필드가 있으면 수정된 데이터 사용, 없으면 원본 데이터 사용
        let updatedData = [];
        
        if (korInputs.length > 0 && jpnInputs.length > 0) {
            // 테이블의 모든 입력 필드에서 데이터 수집
            // 페이지네이션 때문에 일부만 보일 수 있으므로, 전체 extractedData를 기반으로 업데이트
            const dataMap = new Map();
            
            // 먼저 현재 페이지의 수정된 데이터 수집
            korInputs.forEach((input, index) => {
                const rowIndex = parseInt(input.dataset.index);
                if (!isNaN(rowIndex) && rowIndex < this.extractedData.length) {
                    dataMap.set(rowIndex, {
                        '한국어': input.value.trim(),
                        '일본어': jpnInputs[index]?.value.trim() || ''
                    });
                }
            });
            
            // 전체 extractedData를 기반으로 업데이트 (수정된 것만 반영)
            updatedData = this.extractedData.map((row, index) => {
                if (dataMap.has(index)) {
                    return dataMap.get(index);
                }
                return {
                    '한국어': row.한국어 || row.korean || '',
                    '일본어': row.일본어 || row.japanese || ''
                };
            });
        } else {
            // 입력 필드가 없으면 원본 데이터 그대로 사용
            updatedData = this.extractedData.map(row => ({
                '한국어': row.한국어 || row.korean || '',
                '일본어': row.일본어 || row.japanese || ''
            }));
        }

        if (updatedData.length === 0) {
            alert('추가할 데이터가 없습니다.');
            return;
        }

        // 파일명 가져오기
        const korInputForName = document.getElementById('koreanPptInput');
        const jpnInputForName = document.getElementById('japanesePptInput');
        const koreanFileName = korInputForName?.files[0]?.name || '한국어 파일';
        const japaneseFileName = jpnInputForName?.files[0]?.name || '일본어 파일';

        // localStorage에 저장된 코퍼스 데이터 가져오기
        let corpusData = [];
        const savedData = localStorage.getItem('corpusData');
        if (savedData) {
            corpusData = JSON.parse(savedData);
        }

        // 파일 그룹 정보 가져오기
        let fileGroups = [];
        const savedFileGroups = localStorage.getItem('corpusFileGroups');
        if (savedFileGroups) {
            fileGroups = JSON.parse(savedFileGroups);
        }

        // 파일 그룹 ID 생성 (파일명 기반)
        const fileGroupId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileGroupName = `${koreanFileName} / ${japaneseFileName}`;

        // 파일 그룹 추가
        fileGroups.push({
            id: fileGroupId,
            koreanFileName: koreanFileName,
            japaneseFileName: japaneseFileName,
            name: fileGroupName,
            createdAt: new Date().toISOString(),
            itemCount: 0
        });

        let addedCount = 0;
        const maxId = corpusData.length > 0 ? Math.max(...corpusData.map(e => e.id || 0)) : 0;
        let currentId = maxId + 1;

        updatedData.forEach(row => {
            if (row.한국어 || row.일본어) {
                // 중복 체크 (같은 파일 그룹 내에서만)
                const isDuplicate = corpusData.some(
                    entry => entry.korean === row.한국어 && 
                             entry.japanese === row.일본어 &&
                             entry.fileGroupId === fileGroupId
                );
                
                if (!isDuplicate) {
                    corpusData.push({
                        id: currentId++,
                        korean: row.한국어 || '',
                        japanese: row.일본어 || '',
                        fileGroupId: fileGroupId
                    });
                    addedCount++;
                }
            }
        });

        // 파일 그룹의 항목 수 업데이트
        const fileGroup = fileGroups.find(fg => fg.id === fileGroupId);
        if (fileGroup) {
            fileGroup.itemCount = addedCount;
        }

        // localStorage에 저장
        localStorage.setItem('corpusData', JSON.stringify(corpusData));
        localStorage.setItem('corpusFileGroups', JSON.stringify(fileGroups));
        
        // Firestore에도 저장
        if (window.FirestoreHelper) {
            FirestoreHelper.save('corpus', 'data', {
                items: corpusData
            }).catch(error => {
                console.error('Firestore에 코퍼스 데이터 저장 실패:', error);
            });
            
            FirestoreHelper.save('corpus', 'fileGroups', {
                fileGroups: fileGroups
            }).catch(error => {
                console.error('Firestore에 파일 그룹 저장 실패:', error);
            });
        }

        alert(`${addedCount}개의 항목이 코퍼스에 추가되었습니다.`);
        
        // 추출 결과 섹션 숨기기
        const resultDiv = document.getElementById('pptExtractResult');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
        
        // 파일 입력 초기화
        const korInput = document.getElementById('koreanPptInput');
        const jpnInput = document.getElementById('japanesePptInput');
        if (korInput) korInput.value = '';
        if (jpnInput) jpnInput.value = '';
        
        // 상태 메시지 초기화
        const korStatus = document.getElementById('koreanPptStatus');
        const jpnStatus = document.getElementById('japanesePptStatus');
        if (korStatus) korStatus.textContent = '';
        if (jpnStatus) jpnStatus.textContent = '';
        
        // 데이터 초기화
        this.koreanFileData = null;
        this.japaneseFileData = null;
        this.koreanFileType = null;
        this.japaneseFileType = null;
        this.extractedData = null;
        this.updateExtractButton();
        
        // 코퍼스 매니저 초기화 및 데이터 새로고침
        const refreshCorpusManager = () => {
            // corpusManager가 없으면 초기화 시도
            if (typeof corpusManager === 'undefined' || !corpusManager) {
                // corpus.js가 로드되었는지 확인
                if (typeof CorpusManager !== 'undefined') {
                    corpusManager = new CorpusManager();
                    console.log('CorpusManager 초기화 완료');
                } else {
                    console.warn('CorpusManager 클래스가 아직 로드되지 않았습니다. 페이지를 새로고침합니다.');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                    return;
                }
            }
            
            console.log('코퍼스 매니저 데이터 새로고침 시작');
            corpusManager.loadData().then(() => {
                console.log('코퍼스 데이터 로드 완료');
                return corpusManager.loadFileGroups();
            }).then(() => {
                console.log('파일 그룹 로드 완료');
                corpusManager.renderFileList();
                corpusManager.filterTerms();
                corpusManager.render();
                
                console.log('코퍼스 목록 렌더링 완료');
                
                // 파일 목록 섹션으로 스크롤
                const fileListSection = document.getElementById('fileListSection');
                if (fileListSection) {
                    fileListSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }).catch(error => {
                console.error('코퍼스 매니저 새로고침 오류:', error);
                // 오류 발생 시 페이지 새로고침
                window.location.reload();
            });
        };
        
        // corpusManager가 이미 있으면 즉시 실행, 없으면 약간 대기 후 실행
        if (typeof corpusManager !== 'undefined' && corpusManager) {
            refreshCorpusManager();
        } else {
            // corpus.js가 로드될 때까지 대기
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof CorpusManager !== 'undefined' || (typeof corpusManager !== 'undefined' && corpusManager)) {
                    clearInterval(checkInterval);
                    refreshCorpusManager();
                } else if (attempts > 50) {
                    clearInterval(checkInterval);
                    console.warn('CorpusManager를 찾을 수 없습니다. 페이지를 새로고침합니다.');
                    window.location.reload();
                }
            }, 100);
        }
    }
    
    // 추출기 초기화 (Clear 버튼)
    clear() {
        // 파일 입력 필드 초기화
        const koreanInput = document.getElementById('koreanPptInput');
        const japaneseInput = document.getElementById('japanesePptInput');
        if (koreanInput) koreanInput.value = '';
        if (japaneseInput) japaneseInput.value = '';
        
        // 상태 메시지 초기화
        const koreanStatus = document.getElementById('koreanPptStatus');
        const japaneseStatus = document.getElementById('japanesePptStatus');
        if (koreanStatus) {
            koreanStatus.textContent = '';
            koreanStatus.style.color = '#666';
        }
        if (japaneseStatus) {
            japaneseStatus.textContent = '';
            japaneseStatus.style.color = '#666';
        }
        
        // 추출 결과 숨기기
        const resultDiv = document.getElementById('pptExtractResult');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
        
        // 추출된 데이터 초기화
        this.koreanFileData = null;
        this.japaneseFileData = null;
        this.koreanFileType = null;
        this.japaneseFileType = null;
        this.extractedData = null;
        
        // 버튼 상태 초기화
        this.updateExtractButton();
        
        console.log('추출기가 초기화되었습니다.');
    }
    
    // 행 드래그 시작
    handleRowDragStart(event, rowIndex) {
        // 셀 드래그가 아닌 경우에만 행 드래그 처리
        if (event.target.classList.contains('draggable-cell')) {
            return; // 셀 드래그는 handleCellDragStart에서 처리
        }
        
        this.isDragging = true;
        this.draggedRowIndex = rowIndex;
        this.draggedCellType = null; // 행 전체 드래그
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.outerHTML);
        event.target.style.opacity = '0.5';
        
        // 드래그 중인 행 표시
        const row = event.target.closest('tr');
        if (row) {
            row.classList.add('dragging');
        }
        
        console.log('행 드래그 시작:', rowIndex);
    }
    
    // 셀 드래그 시작
    handleCellDragStart(event, rowIndex, cellType) {
        event.stopPropagation(); // 행 드래그 이벤트 전파 방지
        
        this.isDragging = true;
        this.draggedRowIndex = rowIndex;
        this.draggedCellType = cellType; // 'korean' 또는 'japanese'
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cellType);
        event.target.style.opacity = '0.5';
        event.target.style.backgroundColor = '#e3f2fd';
        
        console.log('셀 드래그 시작:', { rowIndex, cellType });
    }
    
    // 드래그 오버
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }
    
    // 행 드래그 엔터
    handleRowDragEnter(event, targetIndex) {
        // 셀 드래그가 아닌 경우에만 행 드래그 처리
        if (this.draggedCellType) {
            return; // 셀 드래그는 handleCellDragEnter에서 처리
        }
        
        if (targetIndex !== this.draggedRowIndex) {
            this.dragOverRowIndex = targetIndex;
            const row = event.target.closest('tr');
            if (row) {
                row.classList.add('drag-over');
            }
        }
    }
    
    // 셀 드래그 엔터
    handleCellDragEnter(event, targetIndex, targetCellType) {
        event.stopPropagation();
        event.preventDefault();
        
        // 같은 타입의 셀에만 드롭 가능
        if (this.draggedCellType === targetCellType && targetIndex !== this.draggedRowIndex) {
            const cell = event.target.closest('td.cell-drop-zone');
            if (cell) {
                cell.classList.add('cell-drag-over');
            }
        }
    }
    
    // 셀 드래그 리브
    handleCellDragLeave(event) {
        const cell = event.target.closest('td.cell-drop-zone');
        if (cell) {
            cell.classList.remove('cell-drag-over');
        }
    }
    
    // 드래그 리브
    handleDragLeave(event) {
        const row = event.target.closest('tr');
        if (row) {
            row.classList.remove('drag-over');
        }
    }
    
    // 행 드롭 처리
    handleRowDrop(event, targetIndex) {
        // 셀 드롭이 아닌 경우에만 행 드롭 처리
        if (event.target.classList.contains('draggable-cell') || 
            event.target.closest('.cell-drop-zone')) {
            return; // 셀 드롭은 handleCellDrop에서 처리
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const draggedIndex = this.draggedRowIndex;
        const dropTargetIndex = targetIndex;
        
        if (draggedIndex === null || draggedIndex === dropTargetIndex) {
            this.resetDragState();
            return;
        }
        
        console.log('행 드롭:', { draggedIndex, dropTargetIndex, shiftKey: event.shiftKey });
        
        // Shift 키를 누른 경우 병합, 그 외에는 순서 변경
        if (event.shiftKey) {
            this.mergeRows(draggedIndex, dropTargetIndex);
        } else {
            this.swapRows(draggedIndex, dropTargetIndex);
        }
        
        this.resetDragState();
    }
    
    // 셀 드롭 처리
    handleCellDrop(event, targetIndex, targetCellType) {
        event.preventDefault();
        event.stopPropagation();
        
        const draggedIndex = this.draggedRowIndex;
        const draggedCellType = this.draggedCellType;
        
        if (draggedIndex === null || draggedCellType !== targetCellType || draggedIndex === targetIndex) {
            this.resetDragState();
            return;
        }
        
        console.log('셀 드롭 (이동):', { draggedIndex, targetIndex, draggedCellType, targetCellType });
        
        // 드래그한 셀의 내용을 드롭한 셀로 이동
        this.moveCell(draggedIndex, targetIndex, draggedCellType);
        
        this.resetDragState();
    }
    
    // 드롭 옵션 표시
    showDropOptions(draggedIndex, targetIndex) {
        const draggedRow = this.extractedData[draggedIndex];
        const targetRow = this.extractedData[targetIndex];
        
        const draggedKor = draggedRow.korean || draggedRow.한국어 || '';
        const draggedJpn = draggedRow.japanese || draggedRow.일본어 || '';
        const targetKor = targetRow.korean || targetRow.한국어 || '';
        const targetJpn = targetRow.japanese || targetRow.일본어 || '';
        
        // 옵션 모달 생성
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
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #333;">행 조정 옵션</h3>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <div style="margin-bottom: 10px;">
                        <strong>드래그한 행 (${draggedIndex + 1}번):</strong>
                        <div style="margin-top: 5px; padding: 8px; background: white; border-radius: 4px;">
                            <div><strong>KOR:</strong> ${this.escapeHtml(draggedKor)}</div>
                            <div><strong>JPN:</strong> ${this.escapeHtml(draggedJpn)}</div>
                        </div>
                    </div>
                    <div>
                        <strong>대상 행 (${targetIndex + 1}번):</strong>
                        <div style="margin-top: 5px; padding: 8px; background: white; border-radius: 4px;">
                            <div><strong>KOR:</strong> ${this.escapeHtml(targetKor)}</div>
                            <div><strong>JPN:</strong> ${this.escapeHtml(targetJpn)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="mergeOption" style="padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        🔗 병합: 두 행을 하나로 합치기
                    </button>
                    <button id="swapOption" style="padding: 12px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        🔄 순서 변경: 두 행의 위치 교체
                    </button>
                    <button id="swapMatchOption" style="padding: 12px; background: #FF9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        🔀 매칭 변경: 한국어-일본어 매칭 교체
                    </button>
                    <button id="cancelOption" style="padding: 12px; background: #999; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        취소
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 옵션 버튼 이벤트
        modal.querySelector('#mergeOption').addEventListener('click', () => {
            this.mergeRows(draggedIndex, targetIndex);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#swapOption').addEventListener('click', () => {
            this.swapRows(draggedIndex, targetIndex);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#swapMatchOption').addEventListener('click', () => {
            this.swapMatch(draggedIndex, targetIndex);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#cancelOption').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    // 행 병합
    mergeRows(index1, index2) {
        if (!this.extractedData || index1 < 0 || index2 < 0 || 
            index1 >= this.extractedData.length || index2 >= this.extractedData.length) {
            return;
        }
        
        const row1 = this.extractedData[index1];
        const row2 = this.extractedData[index2];
        
        // 두 행의 데이터 병합
        const mergedKor = (row1.korean || row1.한국어 || '') + ' ' + (row2.korean || row2.한국어 || '');
        const mergedJpn = (row1.japanese || row1.일본어 || '') + ' ' + (row2.japanese || row2.일본어 || '');
        
        // 첫 번째 행에 병합된 데이터 저장
        if (row1.korean !== undefined) {
            row1.korean = mergedKor.trim();
            row1.japanese = mergedJpn.trim();
        } else {
            row1.한국어 = mergedKor.trim();
            row1.일본어 = mergedJpn.trim();
        }
        
        // 두 번째 행 삭제
        this.extractedData.splice(index2, 1);
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('행 병합 완료:', { index1, index2 });
    }
    
    // 행 순서 변경
    swapRows(index1, index2) {
        if (!this.extractedData || index1 < 0 || index2 < 0 || 
            index1 >= this.extractedData.length || index2 >= this.extractedData.length) {
            return;
        }
        
        // 두 행의 위치 교체
        [this.extractedData[index1], this.extractedData[index2]] = 
        [this.extractedData[index2], this.extractedData[index1]];
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('행 순서 변경 완료:', { index1, index2 });
    }
    
    // 매칭 변경 (한국어-일본어 교체)
    swapMatch(index1, index2) {
        if (!this.extractedData || index1 < 0 || index2 < 0 || 
            index1 >= this.extractedData.length || index2 >= this.extractedData.length) {
            return;
        }
        
        const row1 = this.extractedData[index1];
        const row2 = this.extractedData[index2];
        
        // 한국어와 일본어 교체
        if (row1.korean !== undefined) {
            const tempKor = row1.korean;
            const tempJpn = row1.japanese;
            row1.korean = row2.korean || row2.한국어 || '';
            row1.japanese = row2.japanese || row2.일본어 || '';
            row2.korean = tempKor;
            row2.japanese = tempJpn;
        } else {
            const tempKor = row1.한국어;
            const tempJpn = row1.일본어;
            row1.한국어 = row2.korean || row2.한국어 || '';
            row1.일본어 = row2.japanese || row2.일본어 || '';
            row2.한국어 = tempKor;
            row2.일본어 = tempJpn;
        }
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('매칭 변경 완료:', { index1, index2 });
    }
    
    // 셀 드롭 옵션 표시
    showCellDropOptions(draggedIndex, targetIndex, cellType) {
        const draggedRow = this.extractedData[draggedIndex];
        const targetRow = this.extractedData[targetIndex];
        
        const cellTypeName = cellType === 'korean' ? 'KOR' : 'JPN';
        const draggedValue = cellType === 'korean' 
            ? (draggedRow.korean || draggedRow.한국어 || '')
            : (draggedRow.japanese || draggedRow.일본어 || '');
        const targetValue = cellType === 'korean'
            ? (targetRow.korean || targetRow.한국어 || '')
            : (targetRow.japanese || targetRow.일본어 || '');
        
        // 옵션 모달 생성
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
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #333;">${cellTypeName} 셀 조정 옵션</h3>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <div style="margin-bottom: 10px;">
                        <strong>드래그한 ${cellTypeName} (${draggedIndex + 1}번 행):</strong>
                        <div style="margin-top: 5px; padding: 8px; background: white; border-radius: 4px;">
                            ${this.escapeHtml(draggedValue)}
                        </div>
                    </div>
                    <div>
                        <strong>대상 ${cellTypeName} (${targetIndex + 1}번 행):</strong>
                        <div style="margin-top: 5px; padding: 8px; background: white; border-radius: 4px;">
                            ${this.escapeHtml(targetValue)}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="swapCellOption" style="padding: 12px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        🔄 교체: 두 ${cellTypeName} 셀의 내용 교체
                    </button>
                    <button id="mergeCellOption" style="padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        🔗 병합: 두 ${cellTypeName} 셀의 내용 합치기
                    </button>
                    <button id="cancelCellOption" style="padding: 12px; background: #999; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        취소
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 옵션 버튼 이벤트
        modal.querySelector('#swapCellOption').addEventListener('click', () => {
            this.swapCells(draggedIndex, targetIndex, cellType);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#mergeCellOption').addEventListener('click', () => {
            this.mergeCells(draggedIndex, targetIndex, cellType);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#cancelCellOption').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    // 셀 이동 (드래그한 셀의 내용을 드롭한 셀로 이동, 기존 텍스트는 유지)
    moveCell(fromIndex, toIndex, cellType) {
        if (!this.extractedData || fromIndex < 0 || toIndex < 0 || 
            fromIndex >= this.extractedData.length || toIndex >= this.extractedData.length) {
            return;
        }
        
        const fromRow = this.extractedData[fromIndex];
        const toRow = this.extractedData[toIndex];
        
        if (cellType === 'korean') {
            // 한국어 셀 이동
            const fromValue = fromRow.korean || fromRow.한국어 || '';
            const toValue = toRow.korean || toRow.한국어 || '';
            
            // 드롭한 셀의 기존 텍스트 + 드래그한 셀의 텍스트
            const mergedValue = (toValue + ' ' + fromValue).trim();
            
            if (toRow.korean !== undefined) {
                toRow.korean = mergedValue;
            } else {
                toRow.한국어 = mergedValue;
            }
            // 원래 셀 비우기
            if (fromRow.korean !== undefined) {
                fromRow.korean = '';
            } else {
                fromRow.한국어 = '';
            }
        } else {
            // 일본어 셀 이동
            const fromValue = fromRow.japanese || fromRow.일본어 || '';
            const toValue = toRow.japanese || toRow.일본어 || '';
            
            // 드롭한 셀의 기존 텍스트 + 드래그한 셀의 텍스트
            const mergedValue = (toValue + ' ' + fromValue).trim();
            
            if (toRow.japanese !== undefined) {
                toRow.japanese = mergedValue;
            } else {
                toRow.일본어 = mergedValue;
            }
            // 원래 셀 비우기
            if (fromRow.japanese !== undefined) {
                fromRow.japanese = '';
            } else {
                fromRow.일본어 = '';
            }
        }
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('셀 이동 완료:', { fromIndex, toIndex, cellType });
    }
    
    // 셀 교체
    swapCells(index1, index2, cellType) {
        if (!this.extractedData || index1 < 0 || index2 < 0 || 
            index1 >= this.extractedData.length || index2 >= this.extractedData.length) {
            return;
        }
        
        const row1 = this.extractedData[index1];
        const row2 = this.extractedData[index2];
        
        if (cellType === 'korean') {
            if (row1.korean !== undefined) {
                const temp = row1.korean;
                row1.korean = row2.korean || row2.한국어 || '';
                row2.korean = temp;
            } else {
                const temp = row1.한국어;
                row1.한국어 = row2.korean || row2.한국어 || '';
                row2.한국어 = temp;
            }
        } else {
            if (row1.japanese !== undefined) {
                const temp = row1.japanese;
                row1.japanese = row2.japanese || row2.일본어 || '';
                row2.japanese = temp;
            } else {
                const temp = row1.일본어;
                row1.일본어 = row2.japanese || row2.일본어 || '';
                row2.일본어 = temp;
            }
        }
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('셀 교체 완료:', { index1, index2, cellType });
    }
    
    // 셀 병합
    mergeCells(index1, index2, cellType) {
        if (!this.extractedData || index1 < 0 || index2 < 0 || 
            index1 >= this.extractedData.length || index2 >= this.extractedData.length) {
            return;
        }
        
        const row1 = this.extractedData[index1];
        const row2 = this.extractedData[index2];
        
        if (cellType === 'korean') {
            const merged = (row1.korean || row1.한국어 || '') + ' ' + (row2.korean || row2.한국어 || '');
            if (row1.korean !== undefined) {
                row1.korean = merged.trim();
            } else {
                row1.한국어 = merged.trim();
            }
        } else {
            const merged = (row1.japanese || row1.일본어 || '') + ' ' + (row2.japanese || row2.일본어 || '');
            if (row1.japanese !== undefined) {
                row1.japanese = merged.trim();
            } else {
                row1.일본어 = merged.trim();
            }
        }
        
        // 결과 다시 표시
        this.showResult(this.extractedData);
        
        console.log('셀 병합 완료:', { index1, index2, cellType });
    }
    
    // 드래그 상태 초기화
    resetDragState() {
        this.isDragging = false;
        this.draggedRowIndex = null;
        this.dragOverRowIndex = null;
        this.draggedCellType = null;
        
        // 모든 드래그 관련 클래스 제거
        const rows = document.querySelectorAll('.draggable-row');
        rows.forEach(row => {
            row.classList.remove('dragging', 'drag-over');
            row.style.opacity = '1';
        });
        
        const cells = document.querySelectorAll('.cell-drop-zone');
        cells.forEach(cell => {
            cell.classList.remove('cell-drag-over');
        });
        
        const inputs = document.querySelectorAll('.draggable-cell');
        inputs.forEach(input => {
            input.style.opacity = '1';
            input.style.backgroundColor = '';
        });
    }
    
    // 드래그 종료
    handleDragEnd(event) {
        this.resetDragState();
    }
}

// 페이지 로드 시 초기화
let pptExtractor;

// DOMContentLoaded가 이미 발생했는지 확인
function initializePPTExtractor() {
    if (!window.pptExtractor) {
        console.log('PPTExtractor 인스턴스 생성 시작');
        pptExtractor = new PPTExtractor();
        window.pptExtractor = pptExtractor; // 전역 접근을 위해 window에 할당
        console.log('PPTExtractor 인스턴스 생성 완료:', window.pptExtractor);
    } else {
        console.log('PPTExtractor가 이미 초기화되어 있습니다.');
    }
}

// DOM이 이미 로드되었는지 확인
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePPTExtractor);
} else {
    // DOM이 이미 로드되었으면 즉시 초기화
    initializePPTExtractor();
}
