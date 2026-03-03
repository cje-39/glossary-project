// 코퍼스 데이터 관리 클래스
class CorpusManager {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilter = '';
        this.selectedIds = new Set();
        this.fileGroups = [];
        this.selectedFileGroupId = null;
        this.folders = []; // 폴더 목록
        this.selectedFolderId = null; // 선택된 폴더 ID
        this.isAllExpanded = false; // "전체" 폴더가 펼쳐져 있는지 여부
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadFileGroups();
        await this.loadFolders();
        this.setupEventListeners();
        this.renderFileList();
        // 파일이 선택되지 않았으면 테이블 숨기기
        if (!this.selectedFileGroupId) {
            this.hideCorpusList();
        } else {
            this.showCorpusList();
            this.filterTerms();
            this.render();
        }
    }

    // 데이터 로드
    async loadData() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                console.log('FirestoreHelper 사용 가능, Firestore에서 코퍼스 데이터 로드 시도...');
                const data = await FirestoreHelper.load('corpus', 'data');
                console.log('Firestore에서 로드된 데이터:', data);
                if (data && data.items) {
                    this.data = data.items;
                    console.log(`Firestore에서 ${this.data.length}개의 코퍼스 항목 로드됨`);
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('corpusData', JSON.stringify(this.data));
                    this.filteredData = [...this.data];
                    
                    // 실시간 동기화 설정
                    FirestoreHelper.onSnapshot('corpus', 'data', (data) => {
                        if (data && data.items) {
                            this.data = data.items;
                            localStorage.setItem('corpusData', JSON.stringify(this.data));
                            this.filteredData = [...this.data];
                            this.renderFileList();
                            if (this.selectedFileGroup) {
                                this.renderCorpusList();
                            }
                        }
                    });
                    return;
                } else {
                    console.log('Firestore에 코퍼스 데이터가 없음');
                }
            } else {
                console.log('FirestoreHelper가 사용 불가능함');
            }
        } catch (error) {
            console.error('Firestore에서 코퍼스 데이터 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedData = localStorage.getItem('corpusData');
        if (savedData) {
            this.data = JSON.parse(savedData);
            console.log(`LocalStorage에서 ${this.data.length}개의 코퍼스 항목 로드됨`);
        } else {
            this.data = [];
            console.log('LocalStorage에도 코퍼스 데이터가 없음');
        }
        this.filteredData = [...this.data];
    }

    // 파일 그룹 로드
    async loadFileGroups() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                console.log('Firestore에서 파일 그룹 로드 시도...');
                const data = await FirestoreHelper.load('corpus', 'fileGroups');
                console.log('Firestore에서 로드된 파일 그룹:', data);
                if (data && data.fileGroups) {
                    this.fileGroups = data.fileGroups;
                    console.log(`Firestore에서 ${this.fileGroups.length}개의 파일 그룹 로드됨`);
                    // 파일 그룹별 항목 수 업데이트
                    this.fileGroups.forEach(fileGroup => {
                        const count = this.data.filter(item => item.fileGroupId === fileGroup.id).length;
                        fileGroup.itemCount = count;
                    });
                    // 파일 그룹이 있으면 자동으로 "전체" 폴더 펼치기
                    if (this.fileGroups.length > 0) {
                        this.isAllExpanded = true;
                        this.selectedFolderId = null;
                    }
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));
                    // Firestore에도 저장
                    if (window.FirestoreHelper) {
                        FirestoreHelper.save('corpus', 'fileGroups', {
                            fileGroups: this.fileGroups
                        }).catch(error => {
                            console.error('Firestore에 파일 그룹 저장 실패:', error);
                        });
                    }
                    return;
                } else {
                    console.log('Firestore에 파일 그룹 데이터가 없음');
                }
            } else {
                console.log('FirestoreHelper가 사용 불가능함 (파일 그룹)');
            }
        } catch (error) {
            console.error('Firestore에서 파일 그룹 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedFileGroups = localStorage.getItem('corpusFileGroups');
        if (savedFileGroups) {
            try {
                this.fileGroups = JSON.parse(savedFileGroups);
                // 파일 그룹별 항목 수 업데이트
                this.fileGroups.forEach(fileGroup => {
                    const count = this.data.filter(item => item.fileGroupId === fileGroup.id).length;
                    fileGroup.itemCount = count;
                });
                // 파일 그룹이 있으면 자동으로 "전체" 폴더 펼치기
                if (this.fileGroups.length > 0) {
                    this.isAllExpanded = true;
                    this.selectedFolderId = null;
                }
            } catch (e) {
                console.error('파일 그룹 로드 오류:', e);
                this.fileGroups = [];
            }
        } else {
            this.fileGroups = [];
        }
    }

    // 폴더 로드
    async loadFolders() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('corpus', 'folders');
                if (data && data.folders) {
                    this.folders = data.folders;
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('corpusFolders', JSON.stringify(this.folders));
                    
                    // 실시간 동기화 설정
                    FirestoreHelper.onSnapshot('corpus', 'folders', (data) => {
                        if (data && data.folders) {
                            this.folders = data.folders;
                            localStorage.setItem('corpusFolders', JSON.stringify(this.folders));
                            this.renderFileList();
                        }
                    });
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 폴더 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedFolders = localStorage.getItem('corpusFolders');
        if (savedFolders) {
            try {
                const parsed = JSON.parse(savedFolders);
                if (Array.isArray(parsed)) {
                    this.folders = parsed;
                    console.log('LocalStorage에서 폴더 로드 성공:', this.folders.length, '개');
                    
                    // Firestore에도 저장 (동기화)
                    if (window.FirestoreHelper && this.folders.length > 0) {
                        FirestoreHelper.save('corpus', 'folders', {
                            folders: this.folders
                        }).catch(error => {
                            console.error('Firestore에 폴더 동기화 실패:', error);
                        });
                    }
                } else {
                    console.warn('LocalStorage 폴더 데이터 형식 오류');
                    this.folders = [];
                }
            } catch (e) {
                console.error('폴더 로드 오류:', e);
                this.folders = [];
            }
        } else {
            console.log('LocalStorage에 폴더 데이터가 없음');
            this.folders = [];
        }
    }

    // 폴더 저장
    async saveFolders() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('corpusFolders', JSON.stringify(this.folders));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('corpus', 'folders', {
                    folders: this.folders
                });
            }
        } catch (error) {
            console.error('Firestore에 폴더 저장 실패:', error);
        }
    }

    // 데이터 저장
    async saveData() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('corpusData', JSON.stringify(this.data));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('corpus', 'data', {
                    items: this.data
                });
            }
        } catch (error) {
            console.error('Firestore에 코퍼스 데이터 저장 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        console.log('[setupEventListeners] 함수 시작');
        const searchInput = document.getElementById('searchInput');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const addToGlossaryBtn = document.getElementById('addToGlossaryBtn');
        const addFolderBtn = document.getElementById('addFolderBtn');
        const showAllFilesCheckbox = document.getElementById('showAllFilesCheckbox');

        const searchBtn = document.getElementById('categorySearchBtn');

        // 폴더 추가 버튼
        if (addFolderBtn) {
            addFolderBtn.addEventListener('click', () => {
                this.openFolderModal();
            });
        }

        // 폴더 없음 항목 표시 체크박스
        if (showAllFilesCheckbox) {
            showAllFilesCheckbox.addEventListener('change', () => {
                this.renderFileList();
            });
        }
        
        if (searchInput) {
            // Enter 키로 검색
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (searchBtn) {
                        searchBtn.click();
                    }
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this.currentFilter = searchInput.value;
                    this.currentPage = 1;
                    this.filterTerms();
                    // 검색어가 있으면 검색 결과만 표시, 없으면 검색 결과 숨기고 코퍼스 목록 표시
                    if (this.currentFilter && this.currentFilter.trim()) {
                        // 검색 결과는 filterTerms()에서 자동으로 표시됨
                    } else {
                        this.hideSearchResults();
                        this.render();
                    }
                }
            });
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelected();
            });
        }
        
        if (addToGlossaryBtn) {
            addToGlossaryBtn.addEventListener('click', () => {
                console.log('글로서리에 추가 버튼 클릭됨');
                this.openAddToGlossaryModal();
            });
        } else {
            console.error('addToGlossaryBtn을 찾을 수 없습니다.');
        }
        
        // KOR/JPN 올리기/내리기 버튼 이벤트 리스너
        const korUpBtn = document.getElementById('korUpBtn');
        const korDownBtn = document.getElementById('korDownBtn');
        const jpnUpBtn = document.getElementById('jpnUpBtn');
        const jpnDownBtn = document.getElementById('jpnDownBtn');
        
        if (korUpBtn) {
            korUpBtn.addEventListener('click', () => {
                this.moveSelectedKorUp();
            });
        }
        if (korDownBtn) {
            korDownBtn.addEventListener('click', () => {
                this.moveSelectedKorDown();
            });
        }
        if (jpnUpBtn) {
            jpnUpBtn.addEventListener('click', () => {
                this.moveSelectedJpnUp();
            });
        }
        if (jpnDownBtn) {
            jpnDownBtn.addEventListener('click', () => {
                this.moveSelectedJpnDown();
            });
        }

        // 체크박스 이벤트 위임 (document에 설정하여 나중에 추가된 요소에도 작동)
        console.log('[setupEventListeners] document에 체크박스 이벤트 위임 설정');
        document.addEventListener('change', (e) => {
            // 체크박스 클릭인지 확인 (tableBody 내부의 체크박스만)
            if (e.target.classList.contains('row-checkbox')) {
                const tbody = document.getElementById('tableBody');
                if (tbody && tbody.contains(e.target)) {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    const checked = e.target.checked;
                    console.log('[이벤트 위임] 체크박스 변경됨, id:', id, 'checked:', checked);
                    if (window.corpusManager) {
                        console.log('[이벤트 위임] corpusManager.toggleSelect 호출');
                        window.corpusManager.toggleSelect(id, checked);
                    } else {
                        console.error('[이벤트 위임] ❌ corpusManager를 찾을 수 없습니다!');
                    }
                }
            }
        });

        // CSV 다운로드 버튼은 각 파일 카드에 있으므로 여기서는 제거

        // 버튼 hover 효과 추가 (이미 선언된 변수 재사용)
        if (addToGlossaryBtn) {
            addToGlossaryBtn.addEventListener('mouseenter', () => {
                addToGlossaryBtn.style.background = 'linear-gradient(135deg, #3a3a3a 0%, #4a4a4a 100%)';
            });
            addToGlossaryBtn.addEventListener('mouseleave', () => {
                addToGlossaryBtn.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%)';
            });
        }
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('mouseenter', () => {
                deleteSelectedBtn.style.background = 'linear-gradient(135deg, #3a3a3a 0%, #4a4a4a 100%)';
            });
            deleteSelectedBtn.addEventListener('mouseleave', () => {
                deleteSelectedBtn.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%)';
            });
        }
        
        if (backToFileListBtn) {
            backToFileListBtn.addEventListener('mouseenter', () => {
                backToFileListBtn.style.background = 'linear-gradient(135deg, #3a3a3a 0%, #4a4a4a 100%)';
            });
            backToFileListBtn.addEventListener('mouseleave', () => {
                backToFileListBtn.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%)';
            });
        }
        
        if (backToFileListBtn) {
            backToFileListBtn.addEventListener('click', () => {
                this.selectedFileGroupId = null;
                this.hideCorpusList();
                this.renderFileList();
            });
        }
        
        // 페이지당 항목 수 선택 드롭다운
        const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
        if (itemsPerPageSelect) {
            // 현재 설정값으로 선택
            itemsPerPageSelect.value = this.itemsPerPage.toString();
            
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value, 10);
                this.currentPage = 1; // 첫 페이지로 이동
                this.render();
            });
        }

        // 항목 수정을 위한 모달 이벤트 리스너 (수정 기능은 유지)
        const entryForm = document.getElementById('entryForm');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.close');

        if (entryForm) {
            entryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEntry();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const addEntryBtn = document.getElementById('addEntryBtn');
        if (addEntryBtn) {
            addEntryBtn.addEventListener('click', () => {
                this.openModal();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.render();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const maxPage = Math.ceil(this.filteredData.length / this.itemsPerPage);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.render();
                }
            });
        }

        if (entryForm) {
            entryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEntry();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // 모달 외부 클릭 시 닫기
        const modal = document.getElementById('entryModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // 글로서리 추가 모달 이벤트 리스너
        const closeAddToGlossaryModal = document.getElementById('closeAddToGlossaryModal');
        const cancelAddToGlossaryBtn = document.getElementById('cancelAddToGlossaryBtn');
        const confirmAddToGlossaryBtn = document.getElementById('confirmAddToGlossaryBtn');
        
        if (closeAddToGlossaryModal) {
            closeAddToGlossaryModal.addEventListener('click', () => {
                this.closeAddToGlossaryModal();
            });
        }
        
        if (cancelAddToGlossaryBtn) {
            cancelAddToGlossaryBtn.addEventListener('click', () => {
                this.closeAddToGlossaryModal();
            });
        }
        
        if (confirmAddToGlossaryBtn) {
            confirmAddToGlossaryBtn.addEventListener('click', () => {
                this.addSelectedToGlossary();
            });
        }
        
        // 글로서리 추가 모달 외부 클릭 시 닫기
        const addToGlossaryModal = document.getElementById('addToGlossaryModal');
        if (addToGlossaryModal) {
            addToGlossaryModal.addEventListener('click', (e) => {
                if (e.target === addToGlossaryModal) {
                    this.closeAddToGlossaryModal();
                }
            });
        }
    }

    // 검색 필터링
    filterTerms() {
        let filtered = [...this.data];

        // 파일 그룹 필터링
        if (this.selectedFileGroupId) {
            filtered = filtered.filter(item => item.fileGroupId === this.selectedFileGroupId);
        }

        // 검색어 필터링
        if (this.currentFilter) {
            const filter = this.currentFilter.toLowerCase();
            filtered = filtered.filter(item => {
                return (item.korean && item.korean.toLowerCase().includes(filter)) ||
                       (item.japanese && item.japanese.toLowerCase().includes(filter));
            });
        }

        this.filteredData = filtered;
        
        // 검색어가 있으면 검색 결과 섹션 표시
        if (this.currentFilter && this.currentFilter.trim()) {
            this.renderSearchResults();
        } else {
            this.hideSearchResults();
        }
    }
    
    // 검색 결과 렌더링
    renderSearchResults() {
        const searchResultSection = document.getElementById('searchResultSection');
        const searchResultGrid = document.getElementById('searchResultGrid');
        const searchResultCount = document.getElementById('searchResultCount');
        
        if (!searchResultSection || !searchResultGrid || !searchResultCount) {
            return;
        }
        
        // 모든 데이터에서 검색 (파일 그룹 필터 없이)
        const filter = this.currentFilter.toLowerCase();
        const searchResults = this.data.filter(item => {
            return (item.korean && item.korean.toLowerCase().includes(filter)) ||
                   (item.japanese && item.japanese.toLowerCase().includes(filter));
        });
        
        searchResultSection.style.display = 'block';
        searchResultCount.textContent = `총 ${searchResults.length}개의 결과를 찾았습니다.`;
        
        searchResultGrid.innerHTML = '';
        
        if (searchResults.length === 0) {
            searchResultGrid.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">검색 결과가 없습니다.</p>';
            return;
        }
        
        // 검색어 하이라이트 함수
        const highlightText = (text, searchTerm) => {
            if (!text || !searchTerm) return text;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            return text.replace(regex, '<mark style="background: #FFEB3B; padding: 2px 4px; border-radius: 3px;">$1</mark>');
        };
        
        searchResults.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);';
            
            // 파일 그룹 정보 가져오기
            const fileGroup = this.fileGroups.find(fg => fg.id === item.fileGroupId);
            const fileName = fileGroup ? `${fileGroup.koreanFileName} / ${fileGroup.japaneseFileName}` : '알 수 없음';
            
            const highlightedKorean = highlightText(this.escapeHtml(item.korean || ''), this.currentFilter);
            const highlightedJapanese = highlightText(this.escapeHtml(item.japanese || ''), this.currentFilter);
            
            card.innerHTML = `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="font-size: 11px; color: #999; margin-bottom: 8px;">${this.escapeHtml(fileName)}</div>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">KOR</div>
                    <div style="font-size: 14px; color: #333; line-height: 1.6; word-break: break-word;">${highlightedKorean}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">JPN</div>
                    <div style="font-size: 14px; color: #333; line-height: 1.6; word-break: break-word;">${highlightedJapanese}</div>
                </div>
            `;
            
            searchResultGrid.appendChild(card);
        });
    }
    
    // 검색 결과 숨기기
    hideSearchResults() {
        const searchResultSection = document.getElementById('searchResultSection');
        if (searchResultSection) {
            searchResultSection.style.display = 'none';
        }
    }

    // 파일 목록 렌더링
    renderFileList() {
        const fileListGrid = document.getElementById('fileListGrid');
        const fileListSection = document.getElementById('fileListSection');
        
        if (!fileListGrid || !fileListSection) {
            console.log('fileListGrid or fileListSection not found');
            return;
        }

        console.log('renderFileList called, fileGroups:', this.fileGroups.length);

        // 폴더 목록 렌더링 (파일 그룹이 없어도 폴더 관리 섹션은 표시)
        const folderList = document.getElementById('folderList');
        if (folderList) {
            this.renderFolderList();
        }

        // 파일 그룹이 없어도 섹션은 표시 (빈 상태 메시지)
        if (this.fileGroups.length === 0) {
            fileListSection.style.display = 'block';
            fileListGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">등록된 코퍼스 파일이 없습니다.</div>';
            return;
        }

        fileListSection.style.display = 'block';
        fileListGrid.innerHTML = '';

        // 선택된 폴더에 따라 필터링
        let filteredFileGroups = this.fileGroups;
        if (this.selectedFolderId) {
            // 특정 폴더가 선택된 경우 - 해당 폴더의 파일만 표시
            filteredFileGroups = this.fileGroups.filter(fg => fg.folderId === this.selectedFolderId);
            this.renderFileGroupsInFolder(filteredFileGroups, fileListGrid);
        } else if (this.isAllExpanded) {
            // "전체"가 선택되고 펼쳐진 경우 - 모든 파일 그룹 표시
            filteredFileGroups = this.fileGroups;
            this.renderFileGroupsInFolder(filteredFileGroups, fileListGrid);
        } else {
            // "전체"가 접혀있는 경우 - 파일 목록 숨김
            filteredFileGroups = [];
            fileListGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">폴더를 선택하거나 파일을 드래그하여 폴더에 추가하세요.</div>';
        }

        // 파일 그룹이 없으면 메시지 표시
        if (filteredFileGroups.length === 0 && this.selectedFolderId !== null) {
            fileListGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">표시할 파일이 없습니다.</div>';
        }
    }

    // 폴더 목록 렌더링 (카드 형식)
    renderFolderList() {
        const folderList = document.getElementById('folderList');
        if (!folderList) return;

        folderList.innerHTML = '';
        folderList.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;';

        // "전체" 카드
        const allCard = document.createElement('div');
        const isAllSelected = this.selectedFolderId === null && this.isAllExpanded;
        allCard.style.cssText = 'padding: 20px; background: white; border-radius: 8px; border: 2px solid ' + (isAllSelected ? '#4a90e2' : '#e0e0e0') + '; cursor: pointer; transition: all 0.3s; position: relative; text-align: center;';
        allCard.innerHTML = `
            <div style="font-size: 2.5em; margin-bottom: 10px;">📂</div>
            <div style="font-size: 16px; font-weight: 600; color: #333;">전체</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">${this.fileGroups.length}개 파일</div>
        `;
        allCard.addEventListener('click', () => {
            if (this.selectedFolderId === null && this.isAllExpanded) {
                // 이미 "전체"가 선택되어 있고 펼쳐져 있으면 접기
                this.isAllExpanded = false;
                this.selectedFileGroupId = null;
                this.hideCorpusList();
            } else {
                // "전체" 펼치기
                this.selectedFolderId = null;
                this.isAllExpanded = true;
                this.selectedFileGroupId = null;
                this.hideCorpusList();
            }
            this.renderFileList();
        });
        allCard.addEventListener('mouseenter', () => {
            if (!isAllSelected) {
                allCard.style.borderColor = '#4a90e2';
                allCard.style.transform = 'translateY(-2px)';
                allCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }
        });
        allCard.addEventListener('mouseleave', () => {
            if (!isAllSelected) {
                allCard.style.borderColor = '#e0e0e0';
                allCard.style.transform = 'translateY(0)';
                allCard.style.boxShadow = 'none';
            }
        });
        folderList.appendChild(allCard);

        // 폴더 카드들
        this.folders.forEach(folder => {
            const folderCard = document.createElement('div');
            const isSelected = this.selectedFolderId === folder.id;
            const fileGroupsInFolder = this.fileGroups.filter(fg => fg.folderId === folder.id);
            const totalItems = fileGroupsInFolder.reduce((sum, fg) => sum + (fg.itemCount || 0), 0);
            
            folderCard.className = 'folder-card';
            folderCard.dataset.folderId = folder.id;
            folderCard.style.cssText = 'padding: 20px; background: white; border-radius: 8px; border: 2px solid ' + (isSelected ? '#4a90e2' : '#e0e0e0') + '; cursor: pointer; transition: all 0.3s; position: relative; text-align: center; min-height: 120px;';
            folderCard.innerHTML = `
                <button onclick="event.stopPropagation(); corpusManager.editFolder('${folder.id}')" title="수정" style="position: absolute; top: 8px; right: 32px; background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all 0.2s; filter: grayscale(100%);">✏️</button>
                <button onclick="event.stopPropagation(); corpusManager.deleteFolder('${folder.id}')" title="삭제" style="position: absolute; top: 8px; right: 8px; background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: bold;">×</button>
                <div style="font-size: 2.5em; margin-bottom: 10px;">📁</div>
                <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 5px; word-break: break-word;">${this.escapeHtml(folder.name)}</div>
                <div style="font-size: 12px; color: #999;">${fileGroupsInFolder.length}개 파일 · ${totalItems}개 항목</div>
            `;
            
            // 폴더 카드 클릭 시 해당 폴더의 파일만 표시 (토글 기능)
            folderCard.addEventListener('click', () => {
                if (this.selectedFolderId === folder.id) {
                    // 이미 선택된 폴더를 다시 클릭하면 접기
                    this.selectedFolderId = null;
                    this.isAllExpanded = false;
                } else {
                    // 폴더 선택
                    this.selectedFolderId = folder.id;
                    this.isAllExpanded = false; // "전체" 펼침 상태 해제
                }
                this.selectedFileGroupId = null; // 파일 그룹 선택 해제
                this.hideCorpusList(); // 코퍼스 목록 숨기기
                this.renderFileList();
            });
            
            // 호버 효과
            folderCard.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    folderCard.style.borderColor = '#4a90e2';
                    folderCard.style.transform = 'translateY(-2px)';
                    folderCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }
            });
            folderCard.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    folderCard.style.borderColor = '#e0e0e0';
                    folderCard.style.transform = 'translateY(0)';
                    folderCard.style.boxShadow = 'none';
                }
            });
            
            // 드롭 존 설정
            folderCard.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderCard.style.borderColor = '#4a90e2';
                folderCard.style.backgroundColor = '#f0f7ff';
                folderCard.style.transform = 'scale(1.02)';
            });
            
            folderCard.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderCard.style.borderColor = isSelected ? '#4a90e2' : '#e0e0e0';
                folderCard.style.backgroundColor = 'white';
                folderCard.style.transform = 'scale(1)';
            });
            
            folderCard.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderCard.style.borderColor = isSelected ? '#4a90e2' : '#e0e0e0';
                folderCard.style.backgroundColor = 'white';
                folderCard.style.transform = 'scale(1)';
                
                const fileGroupId = e.dataTransfer.getData('text/plain');
                if (fileGroupId) {
                    this.moveFileGroupToFolder(fileGroupId, folder.id);
                }
            });
            
            folderList.appendChild(folderCard);
        });
    }

    // 폴더 내 파일 그룹 렌더링
    renderFileGroupsInFolder(fileGroups, container) {
        if (!container) return;

        fileGroups.forEach(fileGroup => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.draggable = true;
            card.dataset.fileGroupId = fileGroup.id;
            const isSelected = this.selectedFileGroupId === fileGroup.id;
            card.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border: 2px solid ' + (isSelected ? '#FFC107' : '#e0e0e0') + '; cursor: move; transition: all 0.3s; position: relative;';
            card.innerHTML = `
                <button class="file-delete-btn" onclick="event.stopPropagation(); corpusManager.deleteFileGroup('${fileGroup.id}')" title="삭제" style="position: absolute; top: 8px; right: 8px; background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: bold;">×</button>
                <div style="font-size: 1.8em; margin-bottom: 8px; text-align: center;">📄</div>
                <div style="font-size: 13px; color: #333; margin-bottom: 6px; word-break: break-word; text-align: center;">${this.escapeHtml(fileGroup.koreanFileName)}</div>
                <div style="font-size: 13px; color: #333; margin-bottom: 6px; word-break: break-word; text-align: center;">${this.escapeHtml(fileGroup.japaneseFileName)}</div>
                <div style="font-size: 11px; color: #999; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">${fileGroup.itemCount}개 항목</div>
                <button class="file-csv-download-btn" onclick="event.stopPropagation(); corpusManager.downloadCsvForFileGroup('${fileGroup.id}')" title="CSV 다운로드" style="position: absolute; bottom: 8px; right: 8px; background: none; border: none; color: #666; cursor: pointer; font-size: 18px; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">⬇️</button>
            `;
            
            // 드래그 시작
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', fileGroup.id);
                e.dataTransfer.effectAllowed = 'move';
                card.style.opacity = '0.5';
            });
            
            // 드래그 종료
            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
            });
            
            card.addEventListener('click', () => {
                console.log('[파일 그룹 클릭] 파일 그룹 선택됨:', fileGroup.id);
                this.selectedFileGroupId = fileGroup.id;
                this.currentPage = 1;
                this.showCorpusList();
                this.filterTerms();
                this.renderFileList();
                console.log('[파일 그룹 클릭] render() 호출 전');
                this.render();
                console.log('[파일 그룹 클릭] render() 호출 후');
            });
            card.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    card.style.borderColor = '#FFC107';
                    card.style.transform = 'translateY(-2px)';
                    card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }
            });
            card.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    card.style.borderColor = '#e0e0e0';
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = 'none';
                }
            });
            
            // CSV 다운로드 버튼 hover 효과
            const csvBtn = card.querySelector('.file-csv-download-btn');
            if (csvBtn) {
                csvBtn.addEventListener('mouseenter', () => {
                    csvBtn.style.color = '#333';
                });
                csvBtn.addEventListener('mouseleave', () => {
                    csvBtn.style.color = '#666';
                });
            }
            
            container.appendChild(card);
        });
    }

    // 파일 그룹을 폴더로 이동
    moveFileGroupToFolder(fileGroupId, folderId) {
        const fileGroup = this.fileGroups.find(fg => fg.id === fileGroupId);
        if (!fileGroup) {
            alert('파일 그룹을 찾을 수 없습니다.');
            return;
        }

        const oldFolderId = fileGroup.folderId;
        fileGroup.folderId = folderId;

        // 파일 그룹 저장
        localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));
        if (window.FirestoreHelper) {
            FirestoreHelper.save('corpus', 'fileGroups', {
                fileGroups: this.fileGroups
            }).catch(error => {
                console.error('Firestore에 파일 그룹 저장 실패:', error);
            });
        }

        // 목록 새로고침
        this.renderFileList();
        
        const folder = this.folders.find(f => f.id === folderId);
        const folderName = folder ? folder.name : '알 수 없음';
        console.log(`파일 그룹 "${fileGroup.koreanFileName}"이(가) "${folderName}" 폴더로 이동되었습니다.`);
    }

    // 코퍼스 목록 표시
    showCorpusList() {
        console.log('[showCorpusList] 함수 호출됨');
        const corpusListSection = document.getElementById('corpusListSection');
        const selectedFileTitle = document.getElementById('selectedFileTitle');
        
        if (corpusListSection) {
            corpusListSection.style.display = 'block';
            console.log('[showCorpusList] corpusListSection 표시됨');
        } else {
            console.error('[showCorpusList] ❌ corpusListSection을 찾을 수 없습니다!');
        }

        if (selectedFileTitle && this.selectedFileGroupId) {
            const fileGroup = this.fileGroups.find(fg => fg.id === this.selectedFileGroupId);
            if (fileGroup) {
                selectedFileTitle.textContent = `${fileGroup.koreanFileName} / ${fileGroup.japaneseFileName}`;
            }
        }
        
        // 버튼 표시 업데이트 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
        setTimeout(() => {
            console.log('[showCorpusList] 버튼 업데이트 시작');
            this.updateDeleteSelectedButton();
        }, 100);
    }

    // 코퍼스 목록 숨기기
    hideCorpusList() {
        const corpusListSection = document.getElementById('corpusListSection');
        if (corpusListSection) {
            corpusListSection.style.display = 'none';
        }
    }

    // 파일 그룹 삭제
    deleteFileGroup(fileGroupId) {
        const fileGroup = this.fileGroups.find(fg => fg.id === fileGroupId);
        if (!fileGroup) return;

        const fileName = `${fileGroup.koreanFileName} / ${fileGroup.japaneseFileName}`;
        if (!confirm(`"${fileName}" 파일 그룹의 모든 코퍼스 데이터(${fileGroup.itemCount}개 항목)를 삭제하시겠습니까?`)) {
            return;
        }

        // 해당 파일 그룹의 모든 코퍼스 데이터 삭제
        this.data = this.data.filter(item => item.fileGroupId !== fileGroupId);
        
        // 파일 그룹 정보 삭제
        this.fileGroups = this.fileGroups.filter(fg => fg.id !== fileGroupId);
        
        // 선택된 파일 그룹이 삭제된 경우 목록으로 돌아가기
        if (this.selectedFileGroupId === fileGroupId) {
            this.selectedFileGroupId = null;
            this.hideCorpusList();
        }

        // 데이터 저장
        this.saveData();
        // 파일 그룹 저장
        localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));
        // Firestore에도 저장
        if (window.FirestoreHelper) {
            FirestoreHelper.save('corpus', 'fileGroups', {
                fileGroups: this.fileGroups
            }).catch(error => {
                console.error('Firestore에 파일 그룹 저장 실패:', error);
            });
        }

        // 목록 새로고침
        this.filterTerms();
        this.renderFileList();
        this.render();
    }

    // CSV 다운로드
    downloadCSV() {
        if (this.filteredData.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        // CSV 헤더
        const headers = ['번호', '한국어', '日本語'];
        
        // CSV 데이터 생성
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        this.filteredData.forEach((item, index) => {
            const row = [
                item.id || (index + 1),
                `"${(item.korean || '').replace(/"/g, '""')}"`,
                `"${(item.japanese || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const fileName = this.selectedFileGroupId 
            ? `corpus_${this.fileGroups.find(fg => fg.id === this.selectedFileGroupId)?.koreanFileName || 'file'}.csv`
            : 'corpus_all.csv';
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 특정 파일 그룹의 CSV 다운로드
    downloadCsvForFileGroup(fileGroupId) {
        const fileGroup = this.fileGroups.find(fg => fg.id === fileGroupId);
        if (!fileGroup) {
            alert('파일 그룹을 찾을 수 없습니다.');
            return;
        }

        // 해당 파일 그룹의 데이터만 필터링
        const fileGroupData = this.data.filter(item => item.fileGroupId === fileGroupId);
        
        if (fileGroupData.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        // CSV 헤더
        const headers = ['번호', '한국어', '日本語'];
        
        // CSV 데이터 생성
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        fileGroupData.forEach((item, index) => {
            const row = [
                item.id || (index + 1),
                `"${(item.korean || '').replace(/"/g, '""')}"`,
                `"${(item.japanese || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const fileName = `corpus_${fileGroup.koreanFileName || 'file'}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 테이블 렌더링
    render() {
        console.log('[render] render() 함수 호출됨');
        const tbody = document.getElementById('tableBody');
        if (!tbody) {
            console.error('[render] ❌ tableBody를 찾을 수 없습니다!');
            return;
        }
        console.log('[render] tableBody 찾음:', tbody);

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <p>${this.currentFilter ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageData.map((item, index) => {
                const isChecked = this.selectedIds.has(item.id);
                const korValue = this.escapeHtml(item.korean || '');
                const jpnValue = this.escapeHtml(item.japanese || '');
                const displayNumber = startIndex + index + 1; // 각 파일 그룹별로 1부터 시작하는 번호
                return `
                <tr data-id="${item.id}">
                    <td>
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td>${displayNumber}</td>
                    <td>
                        <input type="text" 
                               class="corpus-kor-input" 
                               data-id="${item.id}"
                               value="${korValue}" 
                               style="width: 100%; padding: 6px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; background: white;"
                               onblur="corpusManager.updateEntry(${item.id}, 'korean', this.value)">
                    </td>
                    <td>
                        <input type="text" 
                               class="corpus-jpn-input" 
                               data-id="${item.id}"
                               value="${jpnValue}" 
                               style="width: 100%; padding: 6px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; background: white;"
                               onblur="corpusManager.updateEntry(${item.id}, 'japanese', this.value)">
                    </td>
                    <td>
                        <button onclick="corpusManager.deleteEntry(${item.id})" style="background: #fee; border: 1px solid #fcc; color: #c33; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border-radius: 50%; font-weight: bold;" onmouseover="this.style.background='#fdd'; this.style.borderColor='#f99'; this.style.color='#a22'" onmouseout="this.style.background='#fee'; this.style.borderColor='#fcc'; this.style.color='#c33'">-</button>
                    </td>
                </tr>
                `;
            }).join('');
            
            console.log('[render] tbody.innerHTML 설정 완료, 체크박스 수:', tbody.querySelectorAll('.row-checkbox').length);
        }

        // 전체 선택 체크박스 상태 업데이트
        this.updateSelectAllCheckbox();

        // 선택된 항목 개수 및 삭제 버튼 업데이트
        this.updateSelectedCount();

        // 페이지당 항목 수 드롭다운 업데이트
        const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = this.itemsPerPage.toString();
        }
        
        // 페이지네이션 정보 업데이트
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (pageInfo) {
            const maxPage = Math.ceil(this.filteredData.length / this.itemsPerPage);
            pageInfo.textContent = `${this.currentPage} / ${maxPage || 1}`;
        }
        
        if (prevBtn && nextBtn) {
            const maxPage = Math.ceil(this.filteredData.length / this.itemsPerPage);
            prevBtn.disabled = this.currentPage === 1;
            nextBtn.disabled = this.currentPage >= maxPage;
        }
        
        // 버튼 표시 업데이트 (항상 표시)
        console.log('[render] updateDeleteSelectedButton 호출 전');
        this.updateDeleteSelectedButton();
        console.log('[render] updateDeleteSelectedButton 호출 후');
    }

    // 체크박스 선택/해제
    toggleSelect(id, checked) {
        console.log('[toggleSelect] 호출됨, id:', id, 'checked:', checked);
        if (checked) {
            this.selectedIds.add(id);
        } else {
            this.selectedIds.delete(id);
        }
        console.log('[toggleSelect] selectedIds.size:', this.selectedIds.size);
        this.updateSelectAllCheckbox();
        this.updateSelectedCount();
        console.log('[toggleSelect] updateDeleteSelectedButton 호출 전');
        this.updateDeleteSelectedButton();
        console.log('[toggleSelect] updateDeleteSelectedButton 호출 후');
    }

    // 전체 선택/해제
    toggleSelectAll(checked) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (checked) {
            pageData.forEach(item => {
                this.selectedIds.add(item.id);
            });
        } else {
            pageData.forEach(item => {
                this.selectedIds.delete(item.id);
            });
        }

        // 체크박스 상태 업데이트
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });

        this.updateSelectedCount();
        this.updateDeleteSelectedButton();
    }

    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (!selectAllCheckbox) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }

        const checkedCount = pageData.filter(item => this.selectedIds.has(item.id)).length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === pageData.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    // 선택된 항목 개수 업데이트
    updateSelectedCount() {
        const selectedCountDiv = document.getElementById('selectedCount');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        const count = this.selectedIds.size;
        
        if (selectedCountDiv) {
            if (count > 0) {
                selectedCountDiv.textContent = `선택됨: ${count}개`;
                selectedCountDiv.style.color = '#27ae60';
            } else {
                selectedCountDiv.textContent = '';
            }
        }

        // 버튼은 항상 표시되도록 함 (updateDeleteSelectedButton에서 처리)
    }

    // 선택된 항목 삭제 및 글로서리 추가 버튼 업데이트
    updateDeleteSelectedButton() {
        console.log('[updateDeleteSelectedButton] 함수 시작');
        // 버튼은 항상 표시되도록 함
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const addToGlossaryBtn = document.getElementById('addToGlossaryBtn');
        const korUpBtn = document.getElementById('korUpBtn');
        const korDownBtn = document.getElementById('korDownBtn');
        const jpnUpBtn = document.getElementById('jpnUpBtn');
        const jpnDownBtn = document.getElementById('jpnDownBtn');
        
        const hasSelection = this.selectedIds.size > 0;
        
        console.log('[updateDeleteSelectedButton] hasSelection:', hasSelection);
        console.log('[updateDeleteSelectedButton] 버튼 찾기 결과:', {
            korUpBtn: !!korUpBtn,
            korDownBtn: !!korDownBtn,
            jpnUpBtn: !!jpnUpBtn,
            jpnDownBtn: !!jpnDownBtn,
            deleteSelectedBtn: !!deleteSelectedBtn,
            addToGlossaryBtn: !!addToGlossaryBtn
        });
        
        // corpusListSection이 표시되어 있는지 확인
        const corpusListSection = document.getElementById('corpusListSection');
        console.log('[updateDeleteSelectedButton] corpusListSection:', {
            exists: !!corpusListSection,
            display: corpusListSection ? corpusListSection.style.display : 'N/A'
        });
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.style.display = 'block';
            deleteSelectedBtn.style.visibility = 'visible';
        }
        if (addToGlossaryBtn) {
            addToGlossaryBtn.style.display = 'block';
            addToGlossaryBtn.style.visibility = 'visible';
        }
        
        // KOR/JPN 버튼은 항상 표시 (선택된 항목이 있을 때만 활성화)
        if (korUpBtn) {
            korUpBtn.style.display = 'block';
            korUpBtn.style.visibility = 'visible';
            korUpBtn.style.position = 'relative';
            korUpBtn.style.zIndex = '10';
            korUpBtn.disabled = !hasSelection;
            korUpBtn.style.opacity = hasSelection ? '1' : '0.5';
            korUpBtn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
            console.log('[updateDeleteSelectedButton] korUpBtn 설정 완료, display:', korUpBtn.style.display);
        } else {
            console.error('[updateDeleteSelectedButton] ❌ korUpBtn을 찾을 수 없습니다!');
            // DOM에서 직접 찾기 시도
            const allButtons = document.querySelectorAll('button');
            console.log('[updateDeleteSelectedButton] 페이지의 모든 버튼:', Array.from(allButtons).map(btn => btn.id || btn.textContent));
        }
        if (korDownBtn) {
            korDownBtn.style.display = 'block';
            korDownBtn.style.visibility = 'visible';
            korDownBtn.style.position = 'relative';
            korDownBtn.style.zIndex = '10';
            korDownBtn.disabled = !hasSelection;
            korDownBtn.style.opacity = hasSelection ? '1' : '0.5';
            korDownBtn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
        } else {
            console.error('[updateDeleteSelectedButton] ❌ korDownBtn을 찾을 수 없습니다!');
        }
        if (jpnUpBtn) {
            jpnUpBtn.style.display = 'block';
            jpnUpBtn.style.visibility = 'visible';
            jpnUpBtn.style.position = 'relative';
            jpnUpBtn.style.zIndex = '10';
            jpnUpBtn.disabled = !hasSelection;
            jpnUpBtn.style.opacity = hasSelection ? '1' : '0.5';
            jpnUpBtn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
        } else {
            console.error('[updateDeleteSelectedButton] ❌ jpnUpBtn을 찾을 수 없습니다!');
        }
        if (jpnDownBtn) {
            jpnDownBtn.style.display = 'block';
            jpnDownBtn.style.visibility = 'visible';
            jpnDownBtn.style.position = 'relative';
            jpnDownBtn.style.zIndex = '10';
            jpnDownBtn.disabled = !hasSelection;
            jpnDownBtn.style.opacity = hasSelection ? '1' : '0.5';
            jpnDownBtn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
        } else {
            console.error('[updateDeleteSelectedButton] ❌ jpnDownBtn을 찾을 수 없습니다!');
        }
        
        console.log('[updateDeleteSelectedButton] 함수 완료');
    }
    
    // 선택된 항목의 KOR 값을 한 칸 위로 이동
    moveSelectedKorUp() {
        if (this.selectedIds.size === 0) {
            alert('이동할 항목을 선택해주세요.');
            return;
        }
        
        const selectedItems = Array.from(this.selectedIds)
            .map(id => this.filteredData.findIndex(item => item.id === id))
            .filter(index => index >= 0)
            .sort((a, b) => a - b);
        
        if (selectedItems.length === 0) return;
        
        // 가장 위에 있는 항목은 이동할 수 없음
        if (selectedItems[0] === 0) {
            alert('이미 가장 위에 있습니다.');
            return;
        }
        
        // 선택된 항목들의 KOR 값을 위로 한 칸씩 이동
        for (const index of selectedItems) {
            if (index > 0) {
                const currentItem = this.filteredData[index];
                const prevItem = this.filteredData[index - 1];
                
                // KOR 값 교환
                const tempKor = currentItem.korean;
                currentItem.korean = prevItem.korean;
                prevItem.korean = tempKor;
            }
        }
        
        this.saveData();
        this.render();
    }
    
    // 선택된 항목의 KOR 값을 한 칸 아래로 이동
    moveSelectedKorDown() {
        if (this.selectedIds.size === 0) {
            alert('이동할 항목을 선택해주세요.');
            return;
        }
        
        const selectedItems = Array.from(this.selectedIds)
            .map(id => this.filteredData.findIndex(item => item.id === id))
            .filter(index => index >= 0)
            .sort((a, b) => b - a);
        
        if (selectedItems.length === 0) return;
        
        // 가장 아래에 있는 항목은 이동할 수 없음
        if (selectedItems[0] === this.filteredData.length - 1) {
            alert('이미 가장 아래에 있습니다.');
            return;
        }
        
        // 선택된 항목들의 KOR 값을 아래로 한 칸씩 이동
        for (const index of selectedItems) {
            if (index < this.filteredData.length - 1) {
                const currentItem = this.filteredData[index];
                const nextItem = this.filteredData[index + 1];
                
                // KOR 값 교환
                const tempKor = currentItem.korean;
                currentItem.korean = nextItem.korean;
                nextItem.korean = tempKor;
            }
        }
        
        this.saveData();
        this.render();
    }
    
    // 선택된 항목의 JPN 값을 한 칸 위로 이동
    moveSelectedJpnUp() {
        if (this.selectedIds.size === 0) {
            alert('이동할 항목을 선택해주세요.');
            return;
        }
        
        const selectedItems = Array.from(this.selectedIds)
            .map(id => this.filteredData.findIndex(item => item.id === id))
            .filter(index => index >= 0)
            .sort((a, b) => a - b);
        
        if (selectedItems.length === 0) return;
        
        // 가장 위에 있는 항목은 이동할 수 없음
        if (selectedItems[0] === 0) {
            alert('이미 가장 위에 있습니다.');
            return;
        }
        
        // 선택된 항목들의 JPN 값을 위로 한 칸씩 이동
        for (const index of selectedItems) {
            if (index > 0) {
                const currentItem = this.filteredData[index];
                const prevItem = this.filteredData[index - 1];
                
                // JPN 값 교환
                const tempJpn = currentItem.japanese;
                currentItem.japanese = prevItem.japanese;
                prevItem.japanese = tempJpn;
            }
        }
        
        this.saveData();
        this.render();
    }
    
    // 선택된 항목의 JPN 값을 한 칸 아래로 이동
    moveSelectedJpnDown() {
        if (this.selectedIds.size === 0) {
            alert('이동할 항목을 선택해주세요.');
            return;
        }
        
        const selectedItems = Array.from(this.selectedIds)
            .map(id => this.filteredData.findIndex(item => item.id === id))
            .filter(index => index >= 0)
            .sort((a, b) => b - a);
        
        if (selectedItems.length === 0) return;
        
        // 가장 아래에 있는 항목은 이동할 수 없음
        if (selectedItems[0] === this.filteredData.length - 1) {
            alert('이미 가장 아래에 있습니다.');
            return;
        }
        
        // 선택된 항목들의 JPN 값을 아래로 한 칸씩 이동
        for (const index of selectedItems) {
            if (index < this.filteredData.length - 1) {
                const currentItem = this.filteredData[index];
                const nextItem = this.filteredData[index + 1];
                
                // JPN 값 교환
                const tempJpn = currentItem.japanese;
                currentItem.japanese = nextItem.japanese;
                nextItem.japanese = tempJpn;
            }
        }
        
        this.saveData();
        this.render();
    }

    // 선택된 항목 삭제
    deleteSelected() {
        if (this.selectedIds.size === 0) {
            alert('삭제할 항목을 선택해주세요.');
            return;
        }

        if (confirm(`선택한 ${this.selectedIds.size}개의 항목을 삭제하시겠습니까?`)) {
            this.data = this.data.filter(e => !this.selectedIds.has(e.id));
            this.selectedIds.clear();
            this.saveData();
            this.filterTerms();
            this.render();
        }
    }

    // 검색어 하이라이트
    highlight(text) {
        if (!this.currentFilter || !text) return text;
        const regex = new RegExp(`(${this.escapeRegex(this.currentFilter)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 정규식 특수문자 이스케이프
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 글로서리에 추가 모달 열기
    openAddToGlossaryModal() {
        if (this.selectedIds.size === 0) {
            alert('추가할 항목을 선택해주세요.');
            return;
        }
        
        const modal = document.getElementById('addToGlossaryModal');
        if (!modal) {
            console.error('addToGlossaryModal을 찾을 수 없습니다.');
            alert('모달을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        // 선택된 코퍼스 항목 표시
        const selectedItems = Array.from(this.selectedIds).map(id => {
            const item = this.filteredData.find(d => d.id === id);
            return item;
        }).filter(item => item);
        
        const selectedItemsDiv = document.getElementById('selectedCorpusItems');
        if (selectedItemsDiv) {
            if (selectedItems.length === 0) {
                selectedItemsDiv.innerHTML = '<div style="color: #999;">선택된 항목이 없습니다.</div>';
            } else {
                selectedItemsDiv.innerHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 8px; text-align: left; border: 1px solid #e0e0e0; font-weight: 600; color: #333;">KOR</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #e0e0e0; font-weight: 600; color: #333;">JPN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedItems.map((item, index) => {
                                return `<tr>
                                    <td style="padding: 8px; border: 1px solid #e0e0e0; color: #333;">${this.escapeHtml(item.korean || '')}</td>
                                    <td style="padding: 8px; border: 1px solid #e0e0e0; color: #333;">${this.escapeHtml(item.japanese || '')}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        }
        
        // 글로서리 카테고리 로드 및 체크박스 렌더링
        this.renderGlossaryCategoryCheckboxes();
        
        // 모달 표시 (CSS에 따라 flex 사용)
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        console.log('글로서리 추가 모달이 표시되었습니다. 선택된 항목 수:', selectedItems.length);
    }
    
    // 글로서리에 추가 모달 닫기
    closeAddToGlossaryModal() {
        const modal = document.getElementById('addToGlossaryModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('글로서리 추가 모달이 닫혔습니다.');
        } else {
            console.error('addToGlossaryModal을 찾을 수 없습니다.');
        }
    }
    
    // 글로서리 카테고리 체크박스 렌더링
    renderGlossaryCategoryCheckboxes() {
        const container = document.getElementById('glossaryCategoryCheckboxes');
        if (!container) return;
        
        // 글로서리 카테고리 로드
        const savedCategories = localStorage.getItem('glossaryCategories');
        let categories = [];
        if (savedCategories) {
            categories = JSON.parse(savedCategories);
        } else {
            // 기본 카테고리
            categories = ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'];
        }
        
        container.innerHTML = '';
        
        if (categories.length === 0) {
            container.innerHTML = '<div style="color: #999; padding: 10px;">카테고리가 없습니다. 글로서리 페이지에서 카테고리를 추가해주세요.</div>';
            return;
        }
        
        categories.forEach(category => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 6px;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `glossaryCategory_${category}`;
            checkbox.value = category;
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
            
            const label = document.createElement('label');
            label.htmlFor = `glossaryCategory_${category}`;
            label.textContent = category;
            label.style.cssText = 'cursor: pointer; font-size: 14px; color: #333;';
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });
    }
    
    // 선택된 코퍼스 항목을 글로서리에 추가
    addSelectedToGlossary() {
        // 선택된 카테고리 가져오기
        const categoryCheckboxes = document.querySelectorAll('#glossaryCategoryCheckboxes input[type="checkbox"]:checked');
        const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
        
        if (selectedCategories.length === 0) {
            alert('카테고리를 하나 이상 선택해주세요.');
            return;
        }
        
        // 선택된 코퍼스 항목 가져오기
        const selectedItems = Array.from(this.selectedIds).map(id => {
            return this.filteredData.find(d => d.id === id);
        }).filter(item => item);
        
        // 항목이 없으면 조용히 모달만 닫기
        if (selectedItems.length === 0) {
            this.closeAddToGlossaryModal();
            return;
        }
        
        // 글로서리 데이터 로드
        const savedGlossaryData = localStorage.getItem('glossaryData');
        let glossaryTerms = [];
        if (savedGlossaryData) {
            glossaryTerms = JSON.parse(savedGlossaryData);
        }
        
        // 최대 ID 찾기
        const maxId = glossaryTerms.length > 0 ? Math.max(...glossaryTerms.map(t => t.id || 0)) : 0;
        let currentId = maxId + 1;
        
        let addedCount = 0;
        let duplicateCount = 0;
        
        // 각 코퍼스 항목을 글로서리 용어로 변환
        selectedItems.forEach(item => {
            // 중복 체크 (한국어와 일본어가 모두 같은 경우)
            const isDuplicate = glossaryTerms.some(term => {
                const termKorean = term.korean || term.한국어 || '';
                const termJapanese = term.japanese || term.일본어 || '';
                return termKorean === item.korean && termJapanese === item.japanese;
            });
            
            if (!isDuplicate) {
                // 새 용어 추가 (글로서리 형식에 맞춤: korean, japanese 사용)
                const newTerm = {
                    id: currentId++,
                    korean: item.korean || '',
                    japanese: item.japanese || '',
                    category: selectedCategories, // 선택된 카테고리 배열
                    notes: '', // 비고 필드
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                glossaryTerms.push(newTerm);
                addedCount++;
            } else {
                duplicateCount++;
            }
        });
        
        // 글로서리 데이터 저장
        localStorage.setItem('glossaryData', JSON.stringify(glossaryTerms));
        
        // 모달 닫기
        this.closeAddToGlossaryModal();
        
        // 선택 해제 (모달 닫기 후에 해제)
        this.selectedIds.clear();
        this.updateSelectedCount();
        this.updateDeleteSelectedButton();
        this.updateSelectAllCheckbox();
        this.render();
        
        // 결과 알림 (선택 해제 후에 표시)
        let message = `${addedCount}개의 항목이 글로서리에 추가되었습니다.`;
        if (duplicateCount > 0) {
            message += `\n${duplicateCount}개의 중복 항목은 제외되었습니다.`;
        }
        alert(message);
    }

    // 모달 열기
    openModal(entryId = null) {
        const modal = document.getElementById('entryModal');
        const form = document.getElementById('entryForm');
        const title = document.getElementById('modalTitle');
        const koreanInput = document.getElementById('koreanInput');
        const japaneseInput = document.getElementById('japaneseInput');
        const entryIdInput = document.getElementById('entryId');

        this.editingId = entryId;

        if (entryId) {
            title.textContent = '항목 수정';
            const entry = this.data.find(e => e.id === entryId);
            if (entry) {
                koreanInput.value = entry.korean || '';
                japaneseInput.value = entry.japanese || '';
                entryIdInput.value = entryId;
            }
        } else {
            title.textContent = '항목 추가';
            form.reset();
            entryIdInput.value = '';
        }

        if (modal) {
            modal.style.display = 'block';
        }
    }

    // 모달 닫기
    closeModal() {
        const modal = document.getElementById('entryModal');
        if (modal) {
            modal.style.display = 'none';
        }
        const form = document.getElementById('entryForm');
        if (form) {
            form.reset();
        }
        this.editingId = null;
    }

    // 항목 저장
    saveEntry() {
        const koreanInput = document.getElementById('koreanInput');
        const japaneseInput = document.getElementById('japaneseInput');
        const entryIdInput = document.getElementById('entryId');

        const korean = koreanInput.value.trim();
        const japanese = japaneseInput.value.trim();

        if (!korean || !japanese) {
            alert('한국어와 일본어를 모두 입력해주세요.');
            return;
        }

        if (this.editingId) {
            // 수정
            const entry = this.data.find(e => e.id === this.editingId);
            if (entry) {
                entry.korean = korean;
                entry.japanese = japanese;
            }
        } else {
            // 추가
            const maxId = this.data.length > 0 ? Math.max(...this.data.map(e => e.id || 0)) : 0;
            const newId = maxId + 1;
            this.data.push({
                id: newId,
                korean: korean,
                japanese: japanese
            });
        }

        this.saveData();
        this.filterTerms();
        this.render();
        this.closeModal();
    }

    // 항목 수정 (인라인 편집으로 대체)
    updateEntry(entryId, field, value) {
        const entry = this.data.find(e => e.id === entryId);
        if (!entry) return;
        
        const oldValue = entry[field];
        const newValue = value.trim();
        
        // 값이 변경되지 않았으면 저장하지 않음
        if (oldValue === newValue) return;
        
        // 데이터 업데이트
        entry[field] = newValue;
        
        // 필터링된 데이터도 업데이트
        const filteredEntry = this.filteredData.find(e => e.id === entryId);
        if (filteredEntry) {
            filteredEntry[field] = newValue;
        }
        
        // 데이터 저장
        this.saveData();
        
        console.log(`항목 ${entryId}의 ${field} 필드가 업데이트되었습니다.`);
    }
    
    // 기존 editEntry 함수는 호환성을 위해 유지 (사용하지 않음)
    editEntry(entryId) {
        // 인라인 편집으로 대체되었으므로 아무 동작도 하지 않음
        console.log('인라인 편집을 사용해주세요.');
    }

    // 폴더 모달 열기
    openFolderModal(folderId = null) {
        const modal = document.getElementById('folderModal');
        const folderNameInput = document.getElementById('folderNameInput');
        const folderModalTitle = document.getElementById('folderModalTitle');
        const folderForm = document.getElementById('folderForm');
        
        if (!modal || !folderNameInput) {
            // 모달이 없으면 생성
            this.createFolderModal();
            return this.openFolderModal(folderId);
        }

        if (folderId) {
            // 수정 모드
            const folder = this.folders.find(f => f.id === folderId);
            if (folder) {
                folderNameInput.value = folder.name;
                folderForm.dataset.folderId = folderId;
                if (folderModalTitle) {
                    folderModalTitle.textContent = '폴더 수정';
                }
            }
        } else {
            // 추가 모드
            folderNameInput.value = '';
            folderForm.dataset.folderId = '';
            if (folderModalTitle) {
                folderModalTitle.textContent = '폴더 추가';
            }
        }

        modal.style.display = 'block';
    }

    // 폴더 모달 닫기
    closeFolderModal() {
        const modal = document.getElementById('folderModal');
        if (modal) {
            modal.style.display = 'none';
        }
        const folderForm = document.getElementById('folderForm');
        if (folderForm) {
            folderForm.reset();
            folderForm.dataset.folderId = '';
        }
    }

    // 폴더 모달 생성
    createFolderModal() {
        const modal = document.createElement('div');
        modal.id = 'folderModal';
        modal.className = 'modal';
        modal.style.cssText = 'display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);';
        modal.innerHTML = `
            <div class="modal-content" style="background-color: #fefefe; margin: 15% auto; padding: 30px; border: 1px solid #888; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 id="folderModalTitle" style="margin: 0; font-size: 1.3em;">폴더 추가</h2>
                    <span class="close" onclick="corpusManager.closeFolderModal()" style="font-size: 28px; font-weight: bold; cursor: pointer; color: #aaa; transition: color 0.2s;">&times;</span>
                </div>
                <form id="folderForm">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">폴더 이름:</label>
                        <input type="text" id="folderNameInput" placeholder="폴더 이름을 입력하세요" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; box-sizing: border-box;" required>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="corpusManager.closeFolderModal()" class="btn btn-secondary" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">취소</button>
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); color: white; border: none; border-radius: 4px; cursor: pointer;">저장</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // 폼 제출 이벤트
        const folderForm = document.getElementById('folderForm');
        if (folderForm) {
            folderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFolder();
            });
        }

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeFolderModal();
            }
        });

        // 닫기 버튼 hover 효과
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.color = '#000';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.color = '#aaa';
            });
        }
    }

    // 폴더 저장
    saveFolder() {
        const folderNameInput = document.getElementById('folderNameInput');
        const folderForm = document.getElementById('folderForm');
        
        if (!folderNameInput || !folderForm) return;

        const folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert('폴더 이름을 입력해주세요.');
            return;
        }

        const folderId = folderForm.dataset.folderId;
        
        if (folderId) {
            // 수정
            const folder = this.folders.find(f => f.id === folderId);
            if (folder) {
                folder.name = folderName;
            }
        } else {
            // 추가
            const newFolder = {
                id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: folderName,
                createdAt: new Date().toISOString()
            };
            this.folders.push(newFolder);
        }

        this.saveFolders();
        this.renderFileList();
        this.closeFolderModal();
    }

    // 폴더 수정
    editFolder(folderId) {
        this.openFolderModal(folderId);
    }

    // 폴더 삭제
    deleteFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        // 해당 폴더에 속한 파일 그룹 확인
        const fileGroupsInFolder = this.fileGroups.filter(fg => fg.folderId === folderId);
        
        if (fileGroupsInFolder.length > 0) {
            if (!confirm(`"${folder.name}" 폴더를 삭제하면 폴더 내 ${fileGroupsInFolder.length}개의 파일 그룹이 폴더 없음으로 이동됩니다. 삭제하시겠습니까?`)) {
                return;
            }
            
            // 파일 그룹의 folderId 제거
            fileGroupsInFolder.forEach(fg => {
                fg.folderId = null;
            });
            
            // 파일 그룹 저장
            localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));
            if (window.FirestoreHelper) {
                FirestoreHelper.save('corpus', 'fileGroups', {
                    fileGroups: this.fileGroups
                }).catch(error => {
                    console.error('Firestore에 파일 그룹 저장 실패:', error);
                });
            }
        } else {
            if (!confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) {
                return;
            }
        }

        // 폴더 삭제
        this.folders = this.folders.filter(f => f.id !== folderId);
        
        // 선택된 폴더가 삭제된 경우 전체로 변경
        if (this.selectedFolderId === folderId) {
            this.selectedFolderId = null;
        }

        this.saveFolders();
        this.renderFileList();
    }

    // 항목 삭제
    deleteEntry(entryId) {
        // entryId를 숫자로 변환
        const id = typeof entryId === 'string' ? parseInt(entryId, 10) : entryId;
        
        if (confirm('이 항목을 삭제하시겠습니까?')) {
            // 선택된 항목 ID에서도 제거
            this.selectedIds.delete(id);
            
            // 데이터에서 삭제
            const beforeLength = this.data.length;
            this.data = this.data.filter(e => {
                const eId = typeof e.id === 'string' ? parseInt(e.id, 10) : e.id;
                return eId !== id;
            });
            
            // 삭제가 실제로 이루어졌는지 확인
            if (this.data.length === beforeLength) {
                console.warn('삭제할 항목을 찾을 수 없습니다. ID:', id);
                return;
            }
            
            // 파일 그룹의 항목 수 업데이트
            if (this.selectedFileGroupId) {
                const fileGroup = this.fileGroups.find(fg => fg.id === this.selectedFileGroupId);
                if (fileGroup) {
                    const count = this.data.filter(item => item.fileGroupId === this.selectedFileGroupId).length;
                    fileGroup.itemCount = count;
                    localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));
                    // Firestore에도 저장
                    if (window.FirestoreHelper) {
                        FirestoreHelper.save('corpus', 'fileGroups', {
                            fileGroups: this.fileGroups
                        }).catch(error => {
                            console.error('Firestore에 파일 그룹 저장 실패:', error);
                        });
                    }
                }
            }
            
            this.saveData();
            this.filterTerms();
            this.updateSelectedCount();
            this.render();
        }
    }
}

// 전역 변수로 선언
let corpusManager;

// 초기화 함수
function initCorpusManager() {
    if (!corpusManager) {
        corpusManager = new CorpusManager();
        window.corpusManager = corpusManager; // window 객체에도 할당
        console.log('✅ CorpusManager 초기화 완료');
        console.log('✅ window.corpusManager 할당됨:', !!window.corpusManager);
    } else {
        console.log('✅ CorpusManager 이미 존재함');
    }
}

// 페이지 로드 시 초기화 (DOMContentLoaded가 이미 발생했을 수도 있으므로 즉시 실행도 시도)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded 이벤트 발생, CorpusManager 초기화 시도');
        initCorpusManager();
    });
} else {
    // DOMContentLoaded가 이미 발생했으면 즉시 실행
    console.log('DOMContentLoaded 이미 발생함, 즉시 CorpusManager 초기화 시도');
    initCorpusManager();
}

// PPT 추출 후 코퍼스에 추가했을 때 데이터 새로고침
// 페이지 로드 시마다 데이터 다시 로드
if (window.location.search.includes('refresh=true')) {
    // corpusManager가 초기화될 때까지 대기
    const checkAndLoad = () => {
        if (corpusManager) {
            corpusManager.loadData().then(() => {
                corpusManager.filterTerms();
                corpusManager.render();
            });
        } else {
            setTimeout(checkAndLoad, 100);
        }
    };
    checkAndLoad();
}
