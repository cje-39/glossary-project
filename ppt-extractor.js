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
            koreanInput.addEventListener('change', (e) => {
                console.log('한국어 파일 선택 이벤트 발생');
                this.handleFileSelect(e, 'korean');
            });
        } else {
            console.error('koreanPptInput을 찾을 수 없습니다.');
        }
        
        if (japaneseInput) {
            japaneseInput.addEventListener('change', (e) => {
                console.log('일본어 파일 선택 이벤트 발생');
                this.handleFileSelect(e, 'japanese');
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
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        const apiKeyInput = document.getElementById('claudeApiKeyInput');
        
        // API 키 상태 표시 업데이트 함수
        const updateApiKeyStatus = () => {
            const apiKey = localStorage.getItem('claude_api_key');
            const statusText = document.getElementById('apiKeyStatus');
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
            saveApiKeyBtn.addEventListener('click', () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    localStorage.setItem('claude_api_key', apiKey);
                    updateApiKeyStatus();
                    alert('✅ API 키가 저장되었습니다. 이제 AI 기능을 사용할 수 있습니다.');
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
        
        console.log('PPTExtractor 초기화 완료');
    }

    async handleFileSelect(event, type) {
        console.log(`handleFileSelect 호출됨 (${type})`, event);
        
        const file = event.target.files[0];
        if (!file) {
            console.log('파일이 선택되지 않음');
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
        
        console.log('파일 선택됨:', file.name, file.size, file.type);

        const statusDiv = document.getElementById(`${type}PptStatus`);
        if (statusDiv) {
            statusDiv.textContent = `파일 선택됨: ${file.name}`;
            statusDiv.style.color = '#666';
        }

        try {
            console.log(`파일 선택됨 (${type}):`, file.name, file.type);
            
            const fileType = this.getFileType(file.name);
            console.log(`파일 타입: ${fileType}`);
            
            if (fileType === 'unknown') {
                throw new Error('지원하지 않는 파일 형식입니다.');
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
            
            if (type === 'korean') {
                this.koreanFileData = data;
                this.koreanFileType = fileType;
            } else {
                this.japaneseFileData = data;
                this.japaneseFileType = fileType;
            }

            if (statusDiv) {
                statusDiv.textContent = `✅ 파일 읽기 완료: ${file.name} (${data.length}개 블록)`;
                statusDiv.style.color = '#27ae60';
            }

            // 버튼 상태 즉시 업데이트
            this.updateExtractButton();
            
            // 추가 확인 (데이터가 제대로 저장되었는지)
            console.log('파일 데이터 저장 후 상태:', {
                type: type,
                koreanFileData: !!this.koreanFileData,
                japaneseFileData: !!this.japaneseFileData,
                koreanFileDataLength: this.koreanFileData ? this.koreanFileData.length : 0,
                japaneseFileDataLength: this.japaneseFileData ? this.japaneseFileData.length : 0
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
        
        // 간단한 조건: 데이터가 존재하는지만 확인
        const hasKorean = !!this.koreanFileData;
        const hasJapanese = !!this.japaneseFileData;
        const isReady = hasKorean && hasJapanese;
        
        // disabled 속성을 직접 제거/추가
        if (isReady) {
            extractBtn.disabled = false;
            extractBtn.removeAttribute('disabled');
        } else {
            extractBtn.disabled = true;
            extractBtn.setAttribute('disabled', 'disabled');
        }
        
        console.log('버튼 상태 업데이트:', {
            isReady: isReady,
            hasKorean: hasKorean,
            hasJapanese: hasJapanese,
            koreanFileData: this.koreanFileData,
            japaneseFileData: this.japaneseFileData,
            koreanFileDataLength: this.koreanFileData ? this.koreanFileData.length : 0,
            japaneseFileDataLength: this.japaneseFileData ? this.japaneseFileData.length : 0
        });
        
        // 버튼 스타일 업데이트
        if (isReady) {
            extractBtn.style.cursor = 'pointer';
            extractBtn.style.opacity = '1';
        } else {
            extractBtn.style.cursor = 'not-allowed';
            extractBtn.style.opacity = '0.6';
        }
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

            // 결과 저장 및 표시
            this.extractedData = parallelRows;
            this.currentExtractedPage = 1;
            this.selectedExtractedIndices.clear();
            this.showResult(parallelRows);

            if (extractedCorpusTable) {
                extractedCorpusTable.style.display = 'block';
            }

            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: #e8f5e9; border-radius: 8px; border: 1px solid #a5d6a7;">
                        <div style="font-size: 20px;">✅</div>
                        <div>
                            <strong style="color: #1a1a1a;">위치 기반 매칭 완료</strong><br>
                            <small style="color: #666;">총 ${parallelRows.length}개 항목 매칭됨</small>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('매칭 오류:', error);
            if (infoDiv) {
                infoDiv.innerHTML = `<strong>❌ 오류 발생</strong><br><small>${error.message || '알 수 없는 오류가 발생했습니다.'}</small>`;
            }
            alert(`매칭 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
        }
    }

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
            const response = await fetch('/api/claude', {
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
            const response = await fetch('/api/claude', {
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

    // 위치 기준으로 텍스트 매칭 (레거시, 호환성 유지)
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
        
        // 위치 기준 매칭
        // 각 한국어 텍스트에 대해 가장 가까운 일본어 텍스트 찾기
        const usedJapaneseIndices = new Set();
        
        for (const koBlock of koreanTexts) {
            const koText = typeof koBlock === 'string' ? koBlock : (koBlock?.text || '');
            const koX = typeof koBlock === 'object' && koBlock.x !== undefined ? koBlock.x : 0;
            const koY = typeof koBlock === 'object' && koBlock.y !== undefined ? koBlock.y : 0;
            
            if (!koText || !koText.trim()) continue;
            
            // 가장 가까운 일본어 텍스트 찾기
            let closestJa = null;
            let closestDistance = Infinity;
            let closestIndex = -1;
            
            for (let j = 0; j < japaneseTexts.length; j++) {
                if (usedJapaneseIndices.has(j)) continue;
                
                const jaBlock = japaneseTexts[j];
                const jaText = typeof jaBlock === 'string' ? jaBlock : (jaBlock?.text || '');
                if (!jaText || !jaText.trim()) continue;
                
                const jaX = typeof jaBlock === 'object' && jaBlock.x !== undefined ? jaBlock.x : 0;
                const jaY = typeof jaBlock === 'object' && jaBlock.y !== undefined ? jaBlock.y : 0;
                
                // 거리 계산 (유클리드 거리)
                const distance = Math.sqrt(Math.pow(koX - jaX, 2) + Math.pow(koY - jaY, 2));
                
                // Y 좌표 차이가 크면 매칭하지 않음 (같은 줄에 있는 것으로 간주)
                const yDiff = Math.abs(koY - jaY);
                // Y 차이 임계값을 더 크게 설정 (슬라이드 전체에서 매칭 가능하도록)
                if (yDiff > 200000) continue; // 200000 EMU = 약 20cm 이상 차이나면 다른 줄로 간주
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestJa = jaText;
                    closestIndex = j;
                }
            }
            
            // 매칭된 일본어가 있으면 사용 표시
            if (closestIndex >= 0) {
                usedJapaneseIndices.add(closestIndex);
            }
            
            pairs.push({
                korean: koText,
                japanese: closestJa || ''
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
                        ? 'width: 100%; padding: 5px 8px; border: 2px solid #ff9800; border-radius: 4px; font-size: 13px; background-color: #fff3cd;' 
                        : 'width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;';
                    const jpnInputStyle = isEmptyJpn 
                        ? 'width: 100%; padding: 5px 8px; border: 2px solid #ff9800; border-radius: 4px; font-size: 13px; background-color: #fff3cd;' 
                        : 'width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;';
                    
                    return `
                        <tr data-row-index="${actualIndex}" style="${rowStyle}">
                            <td>
                                <input type="checkbox" 
                                       class="extracted-row-checkbox" 
                                       data-index="${actualIndex}" 
                                       ${isChecked ? 'checked' : ''} 
                                       onchange="if(window.pptExtractor) window.pptExtractor.toggleSelectExtracted(${actualIndex}, this.checked)">
                            </td>
                            <td>${actualIndex + 1}</td>
                            <td>
                                <input type="text" 
                                       class="extracted-kor-input" 
                                       data-index="${actualIndex}"
                                       value="${korValue}" 
                                       style="${korInputStyle}"
                                       oninput="if(window.pptExtractor) window.pptExtractor.updateExtractedCell(${actualIndex}, '한국어', this.value)">
                            </td>
                            <td>
                                <input type="text" 
                                       class="extracted-jpn-input" 
                                       data-index="${actualIndex}"
                                       value="${jpnValue}" 
                                       style="${jpnInputStyle}"
                                       oninput="if(window.pptExtractor) window.pptExtractor.updateExtractedCell(${actualIndex}, '일본어', this.value)">
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
        const deleteBtn = document.getElementById('deleteSelectedExtractedBtn');
        const hasSelection = this.selectedExtractedIndices.size > 0;
        
        if (deleteBtn) {
            deleteBtn.style.display = hasSelection ? 'block' : 'none';
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
        
        // 코퍼스 매니저가 있으면 데이터 새로고침
        if (typeof corpusManager !== 'undefined') {
            corpusManager.loadData().then(() => {
                return corpusManager.loadFileGroups();
            }).then(() => {
                corpusManager.renderFileList();
                corpusManager.filterTerms();
                corpusManager.render();
                
                // 파일 목록 섹션으로 스크롤
                const fileListSection = document.getElementById('fileListSection');
                if (fileListSection) {
                    fileListSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        } else {
            // 없으면 페이지 새로고침
            window.location.reload();
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
}

// 페이지 로드 시 초기화
let pptExtractor;
document.addEventListener('DOMContentLoaded', () => {
    pptExtractor = new PPTExtractor();
    window.pptExtractor = pptExtractor; // 전역 접근을 위해 window에 할당
});
