// 용어집 데이터 관리 클래스
class GlossaryManager {
    constructor() {
        this.terms = [];
        this.filteredTerms = [];
        this.categories = ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango']; // 기본 카테고리
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = '';
        this.selectedCategories = []; // 선택된 카테고리 필터
        this.sortColumn = null; // 현재 정렬 컬럼
        this.sortAscending = true; // 정렬 방향
        this.editingId = null;
        this.currentView = 'categories'; // 'categories' or 'terms'
        this.selectedCategory = null; // 현재 선택된 카테고리
        this.selectedTermIds = new Set(); // 선택된 용어 ID들
        this.activeTermTab = 'all'; // 'all' or 'category'
        this.currentImageData = null; // 현재 업로드된 이미지 데이터
        this.currentImageType = 'image/jpeg'; // 현재 이미지 타입
        this.extractedTerms = []; // 추출된 용어 목록
        this.searchDebounceTimer = null; // 검색 디바운스 타이머
        this.searchResultsPage = 1; // 검색 결과 페이지
        this.searchResultsPerPage = 10; // 검색 결과 페이지당 항목 수
        this.modalImages = []; // 모달 내 이미지 데이터 배열 [{data: base64, type: mimeType, file: File}, ...]
        this.modalExtractedTerms = []; // 모달 내 추출된 용어 목록
        
        // 카테고리별 아이콘 매핑
        this.categoryIcons = {
            '#dinkum': '<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext x=\'50\' y=\'70\' font-size=\'80\' font-weight=\'bold\' fill=\'%23D4A574\' text-anchor=\'middle\'%3ED%3C/text%3E%3C/svg%3E" style="width: 60px; height: 60px; object-fit: contain;" alt="Dinkum">',
            '#pubgm': '🎮',
            '#ADK': '⚔️',
            '#palm': '🌴',
            '#inzoi': '🐱',
            '#tango': '💃'
        };
        
        // 카테고리별 색상 매핑 (기본 색상)
        this.categoryColors = {
            '#dinkum': '#D4A574',
            '#pubgm': '#4CAF50',
            '#ADK': '#2196F3',
            '#palm': '#FF9800',
            '#inzoi': '#9C27B0',
            '#tango': '#E91E63'
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            await this.loadCategories();
            await this.loadCategoryIcons(); // 카테고리 아이콘 로드
            await this.loadCategoryColors(); // 카테고리 색상 로드
            this.setupEventListeners();
            this.renderCategoryCheckboxes();
            this.renderCategoryFilterMain(); // 메인 카테고리 필터 렌더링
            this.renderCategoryCardsInitial(); // 카테고리 아이콘 로드 후 카드 렌더링
            
            // 렌더링 확인
            const grid = document.getElementById('categoryGrid');
            if (grid && grid.innerHTML.trim() === '') {
                console.log('카테고리 카드가 비어있습니다. 다시 렌더링합니다.');
                this.renderCategoryCardsInitial();
            }
        } catch (error) {
            console.error('초기화 오류:', error);
            // 오류가 발생해도 기본 카테고리 표시
            this.renderCategoryCardsInitial();
        }
    }

    // 카테고리 로드
    async loadCategories() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('glossary', 'categories');
                if (data && data.categories) {
                    this.categories = data.categories;
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('glossaryCategories', JSON.stringify(this.categories));
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 카테고리 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedCategories = localStorage.getItem('glossaryCategories');
        if (savedCategories) {
            this.categories = JSON.parse(savedCategories);
        } else {
            this.saveCategories();
        }
    }

    // 카테고리 저장
    async saveCategories() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('glossaryCategories', JSON.stringify(this.categories));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('glossary', 'categories', {
                    categories: this.categories
                });
            }
        } catch (error) {
            console.error('Firestore에 카테고리 저장 실패:', error);
        }
        
        // 다른 페이지에 변경 알림 (같은 탭에서 다른 페이지가 열려있을 경우)
        if (window.meetingManager && window.meetingManager.categories) {
            window.meetingManager.categories = [...this.categories];
            if (window.meetingManager.renderCategoryFilter) {
                window.meetingManager.renderCategoryFilter();
            }
            if (window.meetingManager.populateCategoryOptions) {
                window.meetingManager.populateCategoryOptions();
            }
            if (window.meetingManager.renderCategoryList) {
                window.meetingManager.renderCategoryList();
            }
        }
    }

    // 데이터 로드 (Firestore → LocalStorage → JSON 파일)
    async loadData() {
        try {
            // FirestoreHelper가 사용 가능할 때까지 대기
            let attempts = 0;
            while (typeof window.FirestoreHelper === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                console.log('Firestore에서 용어 데이터 로드 시도...');
                const data = await FirestoreHelper.load('glossary', 'terms');
                if (data && data.terms && Array.isArray(data.terms)) {
                    console.log(`Firestore에서 ${data.terms.length}개의 용어 로드됨`);
                    this.terms = data.terms.map(term => ({
                        ...term,
                        category: Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []),
                        updatedAt: term.updatedAt || term.createdAt || new Date().toISOString()
                    }));
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('glossaryData', JSON.stringify(this.terms));
                    this.filteredTerms = [...this.terms];
                    
                    // 실시간 동기화 설정
                    FirestoreHelper.onSnapshot('glossary', 'terms', (data) => {
                        if (data && data.terms) {
                            console.log(`Firestore 실시간 업데이트: ${data.terms.length}개의 용어`);
                            this.terms = data.terms.map(term => ({
                                ...term,
                                category: Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []),
                                updatedAt: term.updatedAt || term.createdAt || new Date().toISOString()
                            }));
                            localStorage.setItem('glossaryData', JSON.stringify(this.terms));
                            this.filteredTerms = [...this.terms];
                            if (this.currentView === 'categories') {
                                this.renderCategoryCardsInitial();
                            }
                            if (this.currentView === 'terms') {
                                this.render();
                            }
                        }
                    });
                    return;
                } else {
                    console.log('Firestore에 용어 데이터가 없습니다.');
                }
            } else {
                console.log('FirestoreHelper를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('Firestore에서 데이터 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedData = localStorage.getItem('glossaryData');
        if (savedData) {
            const loadedTerms = JSON.parse(savedData);
            // 기존 데이터의 category를 배열로 변환 (하위 호환성)
            this.terms = loadedTerms.map(term => ({
                ...term,
                category: Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []),
                updatedAt: term.updatedAt || term.createdAt || new Date().toISOString() // 업데이트일 추가
            }));
        } else {
            // 로컬 스토리지가 없으면 JSON 파일 로드
            try {
                const response = await fetch('data/glossary.json');
                if (response.ok) {
                    const loadedTerms = await response.json();
                    this.terms = loadedTerms.map(term => ({
                        ...term,
                        category: Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []),
                        updatedAt: term.updatedAt || term.createdAt || new Date().toISOString() // 업데이트일 추가
                    }));
                    this.saveData();
                }
            } catch (error) {
                console.error('데이터 로드 실패:', error);
                this.terms = [];
            }
        }
        this.filteredTerms = [...this.terms];
    }

    // 데이터 저장
    async saveData() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('glossaryData', JSON.stringify(this.terms));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('glossary', 'terms', {
                    terms: this.terms
                });
            }
        } catch (error) {
            console.error('Firestore에 데이터 저장 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 카테고리 검색 버튼
        document.addEventListener('click', (e) => {
            if (e.target.id === 'categorySearchBtn') {
                const searchInput = document.getElementById('categorySearchInput');
                const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
                if (searchTerm) {
                    this.renderSearchResults(searchTerm);
                } else {
                    this.renderCategoryCardsOnly();
                }
            }
        });
        
        // 카테고리 검색 입력 (Enter 키로 검색)
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'categorySearchInput' && e.key === 'Enter') {
                if (this.currentView === 'categories') {
                    this.renderCategoryCardsInitial();
                }
            }
        });
        
        // 카테고리 검색 입력 (실시간 검색 - 디바운싱)
        const categorySearchInput = document.getElementById('categorySearchInput');
        if (categorySearchInput) {
            categorySearchInput.addEventListener('input', (e) => {
                // 이전 타이머 취소
                if (this.searchDebounceTimer) {
                    clearTimeout(this.searchDebounceTimer);
                }
                
                // 150ms 후 검색 실행 (더 빠른 반응)
                this.searchDebounceTimer = setTimeout(() => {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    if (searchTerm) {
                        // 검색어가 있으면 검색 결과 표시 (첫 페이지로 리셋)
                        this.searchResultsPage = 1;
                        this.renderSearchResults(searchTerm);
                    } else {
                        // 검색어가 없으면 검색 결과 영역 숨기기
                        const searchResultsContainer = document.getElementById('searchResultsContainer');
                        if (searchResultsContainer) {
                            searchResultsContainer.style.display = 'none';
                        }
                        // 카테고리 카드만 표시
                        this.renderCategoryCardsOnly();
                    }
                }, 150);
            });
        }
        

        // 테이블 헤더 정렬 클릭 이벤트
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.sort;
                if (this.sortColumn === column) {
                    // 같은 컬럼 클릭 시 정렬 방향 토글
                    this.sortAscending = !this.sortAscending;
                } else {
                    // 다른 컬럼 클릭 시 오름차순으로 설정
                    this.sortColumn = column;
                    this.sortAscending = true;
                }
                this.currentPage = 1;
                this.updateSortArrows();
                this.filterTerms();
            });
        });

        // 용어 추가 버튼 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addTermBtn') {
                this.openModal();
            }
            if (e.target.id === 'addCategoryBtnMain') {
                this.openCategoryModal();
            }
        });
        
        // 카테고리 카드 클릭 이벤트 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            const categoryCard = e.target.closest('.category-card');
            if (categoryCard && categoryCard.dataset.category) {
                this.selectCategory(categoryCard.dataset.category);
            }
        });

        // CSV 업로드 (중복 등록 방지)
        const csvUploadBtn = document.getElementById('csvUploadBtn');
        const csvUploadInput = document.getElementById('csvUploadInput');
        
        if (csvUploadBtn && !csvUploadBtn.hasAttribute('data-listener-attached')) {
            csvUploadBtn.setAttribute('data-listener-attached', 'true');
            csvUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (csvUploadInput) {
                    csvUploadInput.click();
                }
            });
        }

        if (csvUploadInput && !csvUploadInput.hasAttribute('data-listener-attached')) {
            csvUploadInput.setAttribute('data-listener-attached', 'true');
            csvUploadInput.addEventListener('change', (e) => {
                this.handleCsvUpload(e);
            });
        }

        // CSV 다운로드
        document.getElementById('csvDownloadBtn').addEventListener('click', () => {
            this.downloadCsv();
        });
        
        // 선택 항목 삭제 버튼 (중복 등록 방지)
        const deleteSelectedTermsBtn = document.getElementById('deleteSelectedTermsBtn');
        if (deleteSelectedTermsBtn && !deleteSelectedTermsBtn.hasAttribute('data-listener-attached')) {
            deleteSelectedTermsBtn.setAttribute('data-listener-attached', 'true');
            deleteSelectedTermsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteSelectedTerms();
            });
        }
        
        // 전체 선택 체크박스 (용어 목록 뷰)
        const selectAllGlossaryCheckbox = document.getElementById('selectAllGlossaryCheckbox');
        if (selectAllGlossaryCheckbox) {
            selectAllGlossaryCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAllTerms(e.target.checked);
            });
        }

        // 검색 결과 전체 선택 체크박스
        const selectAllSearchCheckbox = document.getElementById('selectAllSearchCheckbox');
        if (selectAllSearchCheckbox && !selectAllSearchCheckbox.hasAttribute('data-listener-attached')) {
            selectAllSearchCheckbox.setAttribute('data-listener-attached', 'true');
            selectAllSearchCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAllSearchResults(e.target.checked);
            });
        }

        // 검색 결과 선택 항목 삭제 버튼 (중복 등록 방지)
        const deleteSelectedSearchResultsBtn = document.getElementById('deleteSelectedSearchResultsBtn');
        if (deleteSelectedSearchResultsBtn && !deleteSelectedSearchResultsBtn.hasAttribute('data-listener-attached')) {
            deleteSelectedSearchResultsBtn.setAttribute('data-listener-attached', 'true');
            deleteSelectedSearchResultsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteSelectedTerms();
            });
        }

        // 용어 모달 닫기 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            // X 버튼 클릭
            if (e.target.classList.contains('close') || e.target.closest('.close')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            // 취소 버튼 클릭
            if (e.target.id === 'cancelBtn' || e.target.closest('#cancelBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            // 모달 외부 클릭 시 닫기
            if (e.target.id === 'termModal') {
                this.closeModal();
                return;
            }
        });

        // 카테고리 관리 버튼 (메인 페이지의 버튼만 사용)
        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => {
                this.openCategoryModal();
            });
        }

        // 카테고리 모달 닫기
        document.querySelector('.close-category').addEventListener('click', () => {
            this.closeCategoryModal();
        });

        document.getElementById('closeCategoryBtn').addEventListener('click', () => {
            this.closeCategoryModal();
        });

        // 카테고리 모달 외부 클릭 시 닫기
        document.getElementById('categoryModal').addEventListener('click', (e) => {
            if (e.target.id === 'categoryModal') {
                this.closeCategoryModal();
            }
        });

        // 새 카테고리 추가
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.addCategory();
        });

        document.getElementById('newCategoryInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCategory();
            }
        });

        // 폼 제출
        document.getElementById('termForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTerm();
        });

        // 페이지네이션
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const maxPage = Math.ceil(this.filteredTerms.length / this.itemsPerPage);
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.render();
            }
        });
        
        // 검색 결과 페이지네이션
        const searchPrevBtn = document.getElementById('searchPrevBtn');
        const searchNextBtn = document.getElementById('searchNextBtn');
        if (searchPrevBtn) {
            searchPrevBtn.addEventListener('click', () => {
                if (this.searchResultsPage > 1) {
                    this.searchResultsPage--;
                    const searchInput = document.getElementById('categorySearchInput');
                    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
                    if (searchTerm) {
                        this.renderSearchResults(searchTerm);
                    } else {
                        // 검색어가 없으면 전체 목록 표시
                        this.renderAllTermsInSearchResults();
                    }
                }
            });
        }
        
        if (searchNextBtn) {
            searchNextBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('categorySearchInput');
                const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
                if (searchTerm) {
                    const filteredResults = this.terms.filter(term => {
                        return term.korean.toLowerCase().includes(searchTerm) ||
                               term.japanese.toLowerCase().includes(searchTerm) ||
                               (term.notes && term.notes.toLowerCase().includes(searchTerm));
                    });
                    const maxPage = Math.ceil(filteredResults.length / this.searchResultsPerPage);
                    if (this.searchResultsPage < maxPage) {
                        this.searchResultsPage++;
                        this.renderSearchResults(searchTerm);
                    }
                } else {
                    // 검색어가 없으면 전체 목록 표시
                    const maxPage = Math.ceil(this.terms.length / this.searchResultsPerPage);
                    if (this.searchResultsPage < maxPage) {
                        this.searchResultsPage++;
                        this.renderAllTermsInSearchResults();
                    }
                }
            });
        }

        // 클립보드 붙여넣기 이벤트 (스크린샷 붙여넣기)
        document.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });
    }

    // 카테고리 필터 체크박스 렌더링 (용어 목록 뷰에서 사용)
    renderCategoryFilter() {
        const container = document.getElementById('categoryFilterContainer');
        if (!container) return;
        container.innerHTML = '<span style="margin-right: 10px; font-weight: 600;">카테고리:</span>';
        
        // 카테고리를 알파벳 순으로 정렬 (해시태그 제거 후 비교)
        const sortedCategories = [...this.categories].sort((a, b) => {
            const nameA = a.replace(/^#/, '').toLowerCase();
            const nameB = b.replace(/^#/, '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        sortedCategories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'category-filter-label';
            const displayName = category.replace(/^#/, ''); // 해시태그 제거
            const categoryColor = this.categoryColors[category] || '#6c757d';
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-filter-checkbox">
                <span class="category-tag" style="display: inline-block; padding: 4px 8px; background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; border-radius: 4px; color: ${categoryColor}; font-size: 0.85em; font-weight: 600; margin-right: 6px;">
                    ${displayName}
                </span>
            `;
            container.appendChild(label);
        });

        // 체크박스 이벤트 리스너
        container.querySelectorAll('.category-filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCategories();
            });
        });
    }

    // 메인 카테고리 필터 렌더링 (카테고리 카드 뷰에서 사용)
    renderCategoryFilterMain() {
        const container = document.getElementById('categoryFilterContainerMain');
        if (!container) return;
        container.innerHTML = '';
        
        // 카테고리를 알파벳 순으로 정렬 (해시태그 제거 후 비교)
        const sortedCategories = [...this.categories].sort((a, b) => {
            const nameA = a.replace(/^#/, '').toLowerCase();
            const nameB = b.replace(/^#/, '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        sortedCategories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'category-filter-label';
            const displayName = category.replace(/^#/, ''); // 해시태그 제거
            const categoryColor = this.categoryColors[category] || '#6c757d';
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-filter-checkbox-main">
                <span class="category-tag" style="display: inline-block; padding: 4px 8px; background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; border-radius: 4px; color: ${categoryColor}; font-size: 0.85em; font-weight: 600; margin-right: 6px;">
                    ${displayName}
                </span>
            `;
            container.appendChild(label);
        });

        // 체크박스 이벤트 리스너 제거 (필터링 기능 없음)
    }

    // 선택된 카테고리 업데이트
    updateSelectedCategories() {
        this.selectedCategories = Array.from(
            document.querySelectorAll('.category-filter-checkbox:checked')
        ).map(cb => cb.value);
        this.currentPage = 1;
        this.filterTerms();
    }

    // 용어 필터링
    filterTerms() {
        this.filteredTerms = this.terms.filter(term => {
            const matchesSearch = !this.currentFilter || 
                term.korean.toLowerCase().includes(this.currentFilter) ||
                term.japanese.toLowerCase().includes(this.currentFilter) ||
                (term.notes && term.notes.toLowerCase().includes(this.currentFilter));
            
            // 카테고리 필터 (복수 선택)
            let matchesCategory = true;
            if (this.selectedCategories.length > 0) {
                matchesCategory = term.category && term.category.some(cat => 
                    this.selectedCategories.includes(cat)
                );
            }
            
            return matchesSearch && matchesCategory;
        });
        
        // 정렬 적용
        this.sortTerms();
        
        // 용어 목록 뷰가 표시 중일 때만 테이블 렌더링
        if (this.currentView === 'terms') {
            this.render();
        }
    }
    
    // 카테고리 카드 뷰 렌더링 (초기 로드 시)
    renderCategoryCardsInitial() {
        this.renderCategoryCardsOnly();
    }
    
    // 카테고리 카드만 렌더링 (검색 결과 없이)
    renderCategoryCardsOnly() {
        const grid = document.getElementById('categoryGrid');
        if (!grid) {
            console.error('categoryGrid를 찾을 수 없습니다.');
            return;
        }
        
        // 카테고리가 없으면 기본 카테고리 설정
        if (!this.categories || this.categories.length === 0) {
            this.categories = ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'];
            this.saveCategories();
        }
        
        let categoryStats = this.getCategoryStats();
        
        // 카테고리가 없으면 기본 카테고리 표시
        if (categoryStats.length === 0) {
            // 기본 카테고리 설정
            if (!this.categories || this.categories.length === 0) {
                this.categories = ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'];
                this.saveCategories();
            }
            // 다시 통계 계산
            categoryStats = this.getCategoryStats();
            
            // 그래도 없으면 기본 카테고리 직접 표시
            if (categoryStats.length === 0 && this.categories.length > 0) {
                categoryStats = this.categories.map(cat => ({
                    name: cat,
                    wordCount: 0,
                    lastUpdated: null
                }));
            }
            
            // 최종적으로도 없으면 빈 상태 메시지 표시
            if (categoryStats.length === 0) {
                grid.innerHTML = '<div class="empty-state"><p>카테고리가 없습니다. 카테고리 관리를 통해 카테고리를 추가해주세요.</p></div>';
                return;
            }
        }
        
        // 카테고리 카드 렌더링
        grid.innerHTML = categoryStats.map(cat => {
            const lastUpdated = cat.lastUpdated ? new Date(cat.lastUpdated).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }) : '-';
            
            const displayName = cat.name.replace(/^#/, ''); // 해시태그 제거
            const icon = this.categoryIcons[cat.name] || '📚'; // 기본 아이콘은 📚
            // 카테고리 이름을 안전하게 이스케이프 (data 속성용)
            const safeCategoryName = this.escapeHtml(cat.name);
            
            // 날짜 형식 변경 (YYYY-MM-DD)
            let formattedDate = '-';
            if (cat.lastUpdated) {
                const date = new Date(cat.lastUpdated);
                formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
            }
            
            return `
                <div class="category-card" data-category="${safeCategoryName}" style="cursor: pointer;">
                    <div class="category-card-icon">${icon}</div>
                    <div class="category-card-content">
                        <div class="category-card-name">${this.escapeHtml(displayName)}</div>
                        <div style="margin-bottom: 4px;">
                            <h3 class="category-card-title" style="margin: 0; display: inline;">${this.formatNumber(cat.wordCount)}</h3>
                            <span class="category-word-count"> words</span>
                        </div>
                        <div class="category-card-date">
                            <span style="color: #4CAF50; font-weight: 600;">${formattedDate}</span>
                            <span style="color: #999;">Last Updated</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 검색 결과 렌더링
    renderSearchResults(searchTerm) {
        // 검색어가 변경되면 첫 페이지로
        const searchInput = document.getElementById('categorySearchInput');
        const currentSearchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (currentSearchTerm !== searchTerm) {
            this.searchResultsPage = 1;
        }
        
        // 검색 결과 필터링
        const filteredResults = this.terms.filter(term => {
            return term.korean.toLowerCase().includes(searchTerm) ||
                   term.japanese.toLowerCase().includes(searchTerm) ||
                   (term.notes && term.notes.toLowerCase().includes(searchTerm));
        });
        
        // 검색 결과 컨테이너 표시
        const searchResultsContainer = document.getElementById('searchResultsContainer');
        const searchResultsBody = document.getElementById('searchResultsBody');
        
        if (!searchResultsContainer || !searchResultsBody) {
            console.error('검색 결과 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        // 검색 결과가 있으면 표시
        if (filteredResults.length > 0) {
            searchResultsContainer.style.display = 'block';
            
            // 페이지네이션
            const startIndex = (this.searchResultsPage - 1) * this.searchResultsPerPage;
            const endIndex = startIndex + this.searchResultsPerPage;
            const pageResults = filteredResults.slice(startIndex, endIndex);
            
            // 카테고리 옵션 생성
            const categoryOptions = this.categories.map(cat => {
                const displayName = cat.replace(/^#/, '');
                return `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(displayName)}</option>`;
            }).join('');
            
            // 검색 결과 테이블 렌더링
            searchResultsBody.innerHTML = pageResults.map((term, index) => {
                const displayNumber = startIndex + index + 1;
                const currentCategory = term.category && term.category.length > 0 ? term.category[0] : '';
                
                const categoryOptionsWithSelected = this.categories.map(cat => {
                    const displayName = cat.replace(/^#/, '');
                    const selected = cat === currentCategory ? 'selected' : '';
                    return `<option value="${this.escapeHtml(cat)}" ${selected}>${this.escapeHtml(displayName)}</option>`;
                }).join('');
                
                const categories = term.category && term.category.length > 0 
                    ? term.category.map(cat => {
                        const catColor = this.categoryColors[cat] || '#6c757d';
                        const catDisplayName = cat.replace(/^#/, '');
                        return `<span class="category-tag" style="display: inline-block; padding: 4px 8px; background-color: ${catColor}20; border: 1px solid ${catColor}60; border-radius: 4px; color: ${catColor}; font-size: 0.85em; font-weight: 600; margin-right: 4px;">
                            ${this.escapeHtml(catDisplayName)}
                        </span>`;
                    }).join(' ')
                    : '-';
                
                // 검색어 하이라이트
                const highlightText = (text) => {
                    if (!searchTerm) return text;
                    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
                    return text.replace(regex, '<mark>$1</mark>');
                };
                
                return `
                    <tr>
                        <td>
                            <input type="checkbox" class="term-checkbox" data-id="${term.id}" onchange="window.glossaryManager && window.glossaryManager.toggleTermSelect(${term.id}, this.checked)">
                        </td>
                        <td>${displayNumber}</td>
                        <td><strong>${highlightText(term.korean)}</strong></td>
                        <td>${highlightText(term.japanese)}</td>
                        <td>
                            <select class="term-category-select" data-term-id="${term.id}" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;" onchange="window.glossaryManager && window.glossaryManager.updateTermCategory(${term.id}, this.value)">
                                <option value="">선택</option>
                                ${categoryOptionsWithSelected}
                            </select>
                        </td>
                        <td>${term.notes ? highlightText(term.notes) : '-'}</td>
                        <td>
                            <button class="btn btn-edit" onclick="window.glossaryManager && window.glossaryManager.editTerm(${term.id})">수정</button>
                            <button class="btn btn-danger" onclick="window.glossaryManager && window.glossaryManager.deleteTerm(${term.id})">삭제</button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // 페이지네이션 정보 업데이트
            const maxPage = Math.ceil(filteredResults.length / this.searchResultsPerPage);
            const searchPageInfo = document.getElementById('searchPageInfo');
            const searchPrevBtn = document.getElementById('searchPrevBtn');
            const searchNextBtn = document.getElementById('searchNextBtn');
            
            if (searchPageInfo) {
                searchPageInfo.textContent = `${this.searchResultsPage} / ${maxPage || 1}`;
            }
            
            if (searchPrevBtn && searchNextBtn) {
                searchPrevBtn.disabled = this.searchResultsPage === 1;
                searchNextBtn.disabled = this.searchResultsPage >= maxPage;
            }

            // 검색 결과 전체 선택 체크박스 상태 업데이트
            this.updateSelectAllSearchCheckbox();
        } else {
            // 검색 결과가 없으면 메시지 표시
            searchResultsContainer.style.display = 'block';
            searchResultsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>검색 결과가 없습니다.</p>
                    </td>
                </tr>
            `;
        }
    }
    
    // 카테고리별 통계 계산
    getCategoryStats() {
        const stats = {};
        
        // 용어 데이터에서 실제로 사용되는 모든 카테고리 추출
        const usedCategories = new Set();
        this.terms.forEach(term => {
            if (term.category) {
                // category가 배열인 경우
                if (Array.isArray(term.category)) {
                    term.category.forEach(cat => {
                        if (cat) usedCategories.add(cat);
                    });
                } 
                // category가 문자열인 경우
                else if (typeof term.category === 'string') {
                    usedCategories.add(term.category);
                }
            }
        });
        
        // this.categories에 정의된 카테고리도 포함 (용어가 없어도 표시)
        this.categories.forEach(category => {
            usedCategories.add(category);
        });
        
        // 모든 카테고리에 대해 통계 생성
        usedCategories.forEach(category => {
            const categoryTerms = this.terms.filter(term => {
                if (!term.category) return false;
                // 배열인 경우
                if (Array.isArray(term.category)) {
                    return term.category.includes(category);
                }
                // 문자열인 경우
                return term.category === category;
            });
            
            const lastUpdated = categoryTerms
                .map(t => t.updatedAt ? new Date(t.updatedAt).getTime() : 0)
                .filter(t => t > 0);
            
            stats[category] = {
                name: category,
                wordCount: categoryTerms.length,
                lastUpdated: lastUpdated.length > 0 ? new Date(Math.max(...lastUpdated)).toISOString() : null
            };
        });
        
        return Object.values(stats).sort((a, b) => {
            // 알파벳 순으로 정렬 (해시태그 제거 후 비교)
            const nameA = a.name.replace(/^#/, '').toLowerCase();
            const nameB = b.name.replace(/^#/, '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }
    
    // 카테고리 선택
    selectCategory(categoryName) {
        console.log('카테고리 선택됨:', categoryName);
        this.selectedCategory = categoryName;
        this.currentView = 'terms';
        this.currentFilter = '';
        this.currentPage = 1;
        this.selectedCategories = [categoryName];
        this.activeTermTab = 'category'; // 카테고리 탭을 기본으로 선택
        this.filterTerms();
        this.showTermListView();
        console.log('용어 목록 뷰로 전환 완료');
    }
    
    // 전체 목록 보기
    showAllTerms() {
        this.selectedCategory = null;
        this.currentView = 'categories'; // 카테고리 뷰 유지
        this.currentFilter = '';
        this.searchResultsPage = 1; // 검색 결과 페이지 초기화
        this.selectedCategories = []; // 빈 배열로 설정하여 모든 카테고리 표시
        
        // 검색 결과 영역에 전체 목록 표시
        this.renderAllTermsInSearchResults();
    }
    
    // 검색 결과 영역에 전체 목록 표시
    renderAllTermsInSearchResults() {
        const searchResultsContainer = document.getElementById('searchResultsContainer');
        const searchResultsBody = document.getElementById('searchResultsBody');
        
        if (!searchResultsContainer || !searchResultsBody) return;
        
        // 모든 용어 가져오기
        const allTerms = this.terms;
        
        if (allTerms.length > 0) {
            // 페이지네이션 계산
            const startIndex = (this.searchResultsPage - 1) * this.searchResultsPerPage;
            const endIndex = startIndex + this.searchResultsPerPage;
            const pageTerms = allTerms.slice(startIndex, endIndex);
            
            // 검색 결과 컨테이너 표시
            searchResultsContainer.style.display = 'block';
            
            // 테이블 렌더링
            searchResultsBody.innerHTML = pageTerms.map((term, index) => {
                const displayNumber = startIndex + index + 1;
                const currentCategory = term.category && term.category.length > 0 ? term.category[0] : '';
                
                const categoryOptionsWithSelected = this.categories.map(cat => {
                    const displayName = cat.replace(/^#/, '');
                    const selected = cat === currentCategory ? 'selected' : '';
                    return `<option value="${this.escapeHtml(cat)}" ${selected}>${this.escapeHtml(displayName)}</option>`;
                }).join('');
                
                return `
                    <tr>
                        <td>
                            <input type="checkbox" class="term-checkbox" data-id="${term.id}" onchange="window.glossaryManager && window.glossaryManager.toggleTermSelect(${term.id}, this.checked)">
                        </td>
                        <td>${displayNumber}</td>
                        <td><strong>${this.escapeHtml(term.korean)}</strong></td>
                        <td>${this.escapeHtml(term.japanese)}</td>
                        <td>
                            <select class="term-category-select" data-term-id="${term.id}" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;" onchange="window.glossaryManager && window.glossaryManager.updateTermCategory(${term.id}, this.value)">
                                <option value="">선택</option>
                                ${categoryOptionsWithSelected}
                            </select>
                        </td>
                        <td>${term.notes ? this.escapeHtml(term.notes) : '-'}</td>
                        <td>
                            <button class="btn btn-edit" onclick="window.glossaryManager && window.glossaryManager.editTerm(${term.id})">수정</button>
                            <button class="btn btn-danger" onclick="window.glossaryManager && window.glossaryManager.deleteTerm(${term.id})">삭제</button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // 페이지네이션 정보 업데이트
            const maxPage = Math.ceil(allTerms.length / this.searchResultsPerPage);
            const searchPageInfo = document.getElementById('searchPageInfo');
            const searchPrevBtn = document.getElementById('searchPrevBtn');
            const searchNextBtn = document.getElementById('searchNextBtn');
            
            if (searchPageInfo) {
                searchPageInfo.textContent = `${this.searchResultsPage} / ${maxPage || 1}`;
            }
            
            if (searchPrevBtn && searchNextBtn) {
                searchPrevBtn.disabled = this.searchResultsPage === 1;
                searchNextBtn.disabled = this.searchResultsPage >= maxPage;
            }

            // 검색 결과 전체 선택 체크박스 상태 업데이트
            this.updateSelectAllSearchCheckbox();
        } else {
            // 용어가 없으면 메시지 표시
            searchResultsContainer.style.display = 'block';
            searchResultsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>등록된 용어가 없습니다.</p>
                    </td>
                </tr>
            `;
        }
    }

    // 검색 결과 전체 선택 체크박스 상태 업데이트
    updateSelectAllSearchCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllSearchCheckbox');
        const searchResultsBody = document.getElementById('searchResultsBody');
        
        if (!selectAllCheckbox || !searchResultsBody) return;

        // 현재 페이지의 모든 체크박스 가져오기
        const checkboxes = searchResultsBody.querySelectorAll('.term-checkbox');
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }

        // 현재 페이지의 모든 용어가 선택되어 있는지 확인
        let allChecked = true;
        let anyChecked = false;

        checkboxes.forEach(checkbox => {
            const termId = parseInt(checkbox.getAttribute('data-id'));
            if (termId) {
                if (this.selectedTermIds.has(termId)) {
                    anyChecked = true;
                } else {
                    allChecked = false;
                }
            }
        });

        // 체크박스 상태 업데이트
        selectAllCheckbox.checked = allChecked && checkboxes.length > 0;
        selectAllCheckbox.indeterminate = anyChecked && !allChecked;
    }
    
    // 카테고리 뷰 표시
    showCategoryView() {
        this.currentView = 'categories';
        this.selectedCategory = null;
        document.getElementById('categoryView').style.display = 'block';
        document.getElementById('termListView').style.display = 'none';
        // 검색 결과 영역 숨기기
        const searchResultsContainer = document.getElementById('searchResultsContainer');
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
        this.renderCategoryCardsInitial();
    }
    
    // 용어 목록 뷰 표시
    showTermListView() {
        const categoryView = document.getElementById('categoryView');
        const termListView = document.getElementById('termListView');
        
        if (!categoryView || !termListView) {
            console.error('categoryView 또는 termListView를 찾을 수 없습니다.');
            return;
        }
        
        categoryView.style.display = 'none';
        termListView.style.display = 'block';
        
        // 탭 업데이트
        this.updateTermTabs();
        
        // 현재 활성 탭에 따라 렌더링
        this.render();
        console.log('용어 목록 뷰 표시 완료');
    }
    
    // 탭 업데이트
    updateTermTabs() {
        const allTab = document.getElementById('allTermsTab');
        const categoryTab = document.getElementById('categoryTermsTab');
        
        if (!allTab || !categoryTab) return;
        
        // 전체 탭
        allTab.textContent = 'ALL';
        if (this.activeTermTab === 'all') {
            allTab.style.background = '#f0f0f0';
            allTab.style.borderBottom = '3px solid #0d4a1f';
            allTab.style.color = '#333';
        } else {
            allTab.style.background = '#f8f8f8';
            allTab.style.borderBottom = '3px solid transparent';
            allTab.style.color = '#666';
        }
        
        // 카테고리 탭
        if (this.selectedCategory) {
            const displayName = this.selectedCategory.replace(/^#/, '');
            const categoryTerms = this.terms.filter(term => {
                if (!term.category) return false;
                return Array.isArray(term.category) ? term.category.includes(this.selectedCategory) : term.category === this.selectedCategory;
            });
            categoryTab.textContent = `${displayName} (${this.formatNumber(categoryTerms.length)})`;
            categoryTab.style.display = 'block';
            
            if (this.activeTermTab === 'category') {
                categoryTab.style.background = '#f0f0f0';
                categoryTab.style.borderBottom = '3px solid #0d4a1f';
                categoryTab.style.color = '#333';
            } else {
                categoryTab.style.background = '#f8f8f8';
                categoryTab.style.borderBottom = '3px solid transparent';
                categoryTab.style.color = '#666';
            }
        } else {
            categoryTab.style.display = 'none';
        }
    }
    
    // 탭 전환
    switchTermTab(tab) {
        this.activeTermTab = tab;
        this.currentPage = 1;
        
        if (tab === 'all') {
            this.selectedCategories = [];
        } else if (tab === 'category' && this.selectedCategory) {
            this.selectedCategories = [this.selectedCategory];
        }
        
        this.filterTerms();
        this.updateTermTabs();
    }

    // 용어 정렬
    sortTerms() {
        if (!this.sortColumn) return;

        this.filteredTerms.sort((a, b) => {
            let compareA, compareB;

            if (this.sortColumn === 'korean') {
                compareA = a.korean;
                compareB = b.korean;
                return this.compareKorean(compareA, compareB, this.sortAscending);
            } else if (this.sortColumn === 'japanese') {
                compareA = a.japanese;
                compareB = b.japanese;
                return this.compareJapanese(compareA, compareB, this.sortAscending);
            }
            
            return 0;
        });
    }

    // 정렬 화살표 업데이트
    updateSortArrows() {
        document.querySelectorAll('.sortable .sort-arrow').forEach(arrow => {
            arrow.textContent = '↕';
        });

        if (this.sortColumn) {
            const header = document.querySelector(`.sortable[data-sort="${this.sortColumn}"]`);
            if (header) {
                const arrow = header.querySelector('.sort-arrow');
                arrow.textContent = this.sortAscending ? '↑' : '↓';
            }
        }
    }

    // 한국어 비교 함수 (가나다순)
    compareKorean(a, b, ascending = true) {
        // JavaScript의 기본 로케일 비교 사용
        const result = a.localeCompare(b, 'ko');
        return ascending ? result : -result;
    }

    // 일본어 비교 함수 (あかさたな순)
    compareJapanese(a, b, ascending = true) {
        // 히라가나와 가타카나를 정규화하여 비교
        const normalize = (str) => {
            // 가타카나를 히라가나로 변환
            return str.replace(/[\u30A1-\u30F6]/g, (match) => {
                return String.fromCharCode(match.charCodeAt(0) - 0x60);
            });
        };

        const normalizedA = normalize(a);
        const normalizedB = normalize(b);
        
        // 일본어 로케일 비교
        const result = normalizedA.localeCompare(normalizedB, 'ja');
        return ascending ? result : -result;
    }

    // 카테고리 체크박스 렌더링 (용어 추가/수정 모달용)
    renderCategoryCheckboxes() {
        const container = document.getElementById('categoryCheckboxes');
        container.innerHTML = '';
        
        // 카테고리를 알파벳 순으로 정렬 (해시태그 제거 후 비교)
        const sortedCategories = [...this.categories].sort((a, b) => {
            const nameA = a.replace(/^#/, '').toLowerCase();
            const nameB = b.replace(/^#/, '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        sortedCategories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'category-checkbox-label';
            const displayName = category.replace(/^#/, ''); // 해시태그 제거
            const categoryColor = this.categoryColors[category] || '#6c757d';
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-checkbox">
                <span class="category-tag" style="display: inline-block; padding: 4px 8px; background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; border-radius: 4px; color: ${categoryColor}; font-size: 0.85em; font-weight: 600; margin-right: 6px;">
                    ${this.escapeHtml(displayName)}
                </span>
            `;
            
            // 체크박스 상태 변경 시 스타일 업데이트
            const checkbox = label.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            });
            
            container.appendChild(label);
        });
    }

    // 테이블 렌더링
    render() {
        const tbody = document.getElementById('tableBody');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTerms = this.filteredTerms.slice(startIndex, endIndex);

        if (pageTerms.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>검색 결과가 없습니다.</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageTerms.map((term, index) => {
                const isChecked = this.selectedTermIds.has(term.id);
                const displayNumber = startIndex + index + 1; // 1부터 시작하는 번호
                
                // 현재 용어의 카테고리 (첫 번째 카테고리만 표시, 여러 개면 첫 번째)
                const currentCategory = term.category && term.category.length > 0 ? term.category[0] : '';
                
                // 카테고리 옵션 생성 (현재 선택된 카테고리 표시)
                const categoryOptionsWithSelected = this.categories.map(cat => {
                    const displayName = cat.replace(/^#/, '');
                    const selected = cat === currentCategory ? 'selected' : '';
                    return `<option value="${this.escapeHtml(cat)}" ${selected}>${this.escapeHtml(displayName)}</option>`;
                }).join('');
                
                return `
                <tr>
                    <td>
                        <input type="checkbox" class="term-checkbox" data-id="${term.id}" ${isChecked ? 'checked' : ''} onchange="window.glossaryManager && window.glossaryManager.toggleTermSelect(${term.id}, this.checked)">
                    </td>
                    <td>${displayNumber}</td>
                    <td><strong>${this.highlight(term.korean)}</strong></td>
                    <td>${this.highlight(term.japanese)}</td>
                    <td>
                        <select class="term-category-select" data-term-id="${term.id}" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;" onchange="window.glossaryManager && window.glossaryManager.updateTermCategory(${term.id}, this.value)">
                            <option value="">선택</option>
                            ${categoryOptionsWithSelected}
                        </select>
                    </td>
                    <td>${term.notes || '-'}</td>
                    <td>
                        <button class="btn btn-edit" onclick="window.glossaryManager && window.glossaryManager.editTerm(${term.id})">수정</button>
                        <button class="btn btn-danger" onclick="window.glossaryManager && window.glossaryManager.deleteTerm(${term.id})">삭제</button>
                    </td>
                </tr>
            `;
            }).join('');
        }
        
        // 전체 선택 체크박스 상태 업데이트
        this.updateSelectAllGlossaryCheckbox();

        // 페이지네이션 정보 업데이트
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (pageInfo) {
            const maxPage = Math.ceil(this.filteredTerms.length / this.itemsPerPage);
            pageInfo.textContent = `${this.currentPage} / ${maxPage || 1}`;
        }
        
        // 이전/다음 버튼 활성화 상태
        if (prevBtn && nextBtn) {
            const maxPage = Math.ceil(this.filteredTerms.length / this.itemsPerPage);
            prevBtn.disabled = this.currentPage === 1;
            nextBtn.disabled = this.currentPage >= maxPage;
        }
        
        // 정렬 화살표 업데이트
        this.updateSortArrows();
    }
    
    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 숫자 포맷팅 (천 단위 콤마)
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // 검색어 하이라이트
    highlight(text) {
        if (!this.currentFilter) return text;
        const regex = new RegExp(`(${this.escapeRegex(this.currentFilter)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 정규식 특수문자 이스케이프
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 용어 모달 열기
    openModal(termId = null) {
        const modal = document.getElementById('termModal');
        const form = document.getElementById('termForm');
        const title = document.getElementById('modalTitle');
        
        this.editingId = termId;
        this.renderCategoryCheckboxes();
        
        // 모달 내 이미지 데이터 초기화
        this.removeModalImage();
        
        if (termId) {
            title.textContent = '용어 수정';
            const term = this.terms.find(t => t.id === termId);
            if (term) {
                document.getElementById('termId').value = term.id;
                document.getElementById('koreanInput').value = term.korean;
                document.getElementById('japaneseInput').value = term.japanese;
                document.getElementById('notesInput').value = term.notes || '';
                
                // 카테고리 체크박스 체크
                if (term.category && term.category.length > 0) {
                    term.category.forEach(cat => {
                        const checkbox = document.querySelector(`.category-checkbox[value="${cat}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                            const label = checkbox.closest('.category-checkbox-label');
                            if (label) {
                                label.classList.add('checked');
                            }
                        }
                    });
                }
            }
        } else {
            title.textContent = '용어 추가';
            form.reset();
            document.getElementById('termId').value = '';
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = false;
                const label = cb.closest('.category-checkbox-label');
                if (label) {
                    label.classList.remove('checked');
                }
            });
            
            // 카테고리 뷰에서 추가하는 경우 현재 선택된 카테고리 자동 체크
            // renderCategoryCheckboxes가 완료된 후 체크박스를 찾아야 하므로 약간의 지연 필요
            setTimeout(() => {
                if (this.selectedCategory) {
                    const checkbox = document.querySelector(`.category-checkbox[value="${this.selectedCategory}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        const label = checkbox.closest('.category-checkbox-label');
                        if (label) {
                            label.classList.add('checked');
                        }
                    }
                }
            }, 100);
        }
        
        modal.classList.add('show');
    }

    // 용어 모달 닫기
    closeModal() {
        const modal = document.getElementById('termModal');
        modal.classList.remove('show');
        this.editingId = null;
        document.getElementById('termForm').reset();
        document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
        
        // 모달 내 이미지 데이터 초기화
        this.removeModalImage();
    }

    // 용어 저장
    saveTerm() {
        const id = document.getElementById('termId').value;
        const korean = document.getElementById('koreanInput').value.trim();
        const japanese = document.getElementById('japaneseInput').value.trim();
        const notes = document.getElementById('notesInput').value.trim();
        
        // 선택된 카테고리 가져오기
        let selectedCategories = Array.from(
            document.querySelectorAll('.category-checkbox:checked')
        ).map(cb => cb.value);

        // 카테고리 뷰에서 추가하는 경우, 현재 선택된 카테고리 자동 추가
        if (!id && this.selectedCategory) {
            // 이미 선택된 카테고리 목록에 포함되어 있지 않으면 추가
            if (!selectedCategories.includes(this.selectedCategory)) {
                selectedCategories.push(this.selectedCategory);
            }
        }

        if (!korean || !japanese) {
            alert('한국어와 일본어는 필수 입력 항목입니다.');
            return;
        }

        if (id) {
            // 수정
            const index = this.terms.findIndex(t => t.id === parseInt(id));
            if (index !== -1) {
                this.terms[index] = {
                    ...this.terms[index],
                    korean,
                    japanese,
                    category: selectedCategories,
                    notes,
                    updatedAt: new Date().toISOString() // 업데이트일 갱신
                };
            }
        } else {
            // 추가
            let newId = 1;
            if (this.terms.length > 0) {
                const maxId = Math.max(...this.terms.map(t => t.id || 0));
                newId = maxId >= 1 ? maxId + 1 : 1;
            }
            this.terms.push({
                id: newId,
                korean,
                japanese,
                category: selectedCategories,
                notes,
                updatedAt: new Date().toISOString()
            });
        }

        this.saveData();
        this.filterTerms();
        this.closeModal();
    }

    // 용어 수정
    editTerm(id) {
        this.openModal(id);
    }

    // 용어 삭제
    deleteTerm(id) {
        if (confirm('정말 이 용어를 삭제하시겠습니까?')) {
            this.terms = this.terms.filter(t => t.id !== id);
            // 선택된 항목에서도 제거
            this.selectedTermIds.delete(id);
            this.saveData();
            this.filterTerms();
            this.updateDeleteSelectedButton();
        }
    }

    // 용어 카테고리 업데이트
    updateTermCategory(termId, categoryValue) {
        const term = this.terms.find(t => t.id === termId);
        if (!term) return;

        if (categoryValue) {
            // 카테고리 업데이트 (단일 카테고리로 설정)
            term.category = [categoryValue];
        } else {
            // 빈 값이면 카테고리 제거
            term.category = [];
        }

        term.updatedAt = new Date().toISOString();
        this.saveData();
        this.filterTerms();
        
        // 카테고리 뷰면 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }
    }

    // 카테고리 모달 열기
    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (!modal) {
            console.error('categoryModal을 찾을 수 없습니다.');
            return;
        }
        this.renderCategoryList();
        modal.classList.add('show');
    }

    // 카테고리 모달 닫기
    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        modal.classList.remove('show');
        document.getElementById('newCategoryInput').value = '';
    }

    // 카테고리 목록 렌더링 (아이콘 설정 포함)
    renderCategoryList() {
        const container = document.getElementById('categoryList');
        if (!container) return;
        container.innerHTML = '';
        
        this.categories.forEach((category, index) => {
            const displayName = category.replace(/^#/, ''); // 해시태그 제거
            const currentIcon = this.categoryIcons[category] || '📚';
            const isImage = currentIcon.includes('<img') || currentIcon.startsWith('data:image');
            const currentColor = this.categoryColors[category] || '#6c757d';
            
            const item = document.createElement('div');
            item.className = 'category-list-item-integrated';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-weight: 600; min-width: 100px;">${this.escapeHtml(displayName)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <label style="font-size: 13px; color: #666; min-width: 60px;">아이콘:</label>
                            <div class="icon-preview" style="font-size: 1.5em; min-width: 60px; height: 60px; text-align: center; display: flex; align-items: center; justify-content: center; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                                ${isImage ? currentIcon : currentIcon}
                            </div>
                            <input type="file" 
                                   class="icon-file-input" 
                                   data-category="${this.escapeHtml(category)}" 
                                   accept="image/*"
                                   style="flex: 1; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;"
                                   onchange="window.glossaryManager && window.glossaryManager.handleIconFileUpload('${this.escapeHtml(category)}', this)">
                            <button type="button" 
                                    class="btn btn-secondary btn-small" 
                                    onclick="window.glossaryManager && window.glossaryManager.removeCategoryIcon('${this.escapeHtml(category)}')">
                                제거
                            </button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 13px; color: #666; min-width: 60px;">색상:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <input type="color" 
                                       class="category-color-input" 
                                       data-category="${this.escapeHtml(category)}" 
                                       value="${currentColor}"
                                       style="width: 60px; height: 40px; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;"
                                       onchange="window.glossaryManager && window.glossaryManager.handleCategoryColorChange('${this.escapeHtml(category)}', this.value)">
                                <div class="color-preview" style="width: 60px; height: 40px; background-color: ${currentColor}; border: 1px solid #e0e0e0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                                    샘플
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    // 아이콘 파일 업로드 처리
    handleIconFileUpload(categoryName, fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        
        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            fileInput.value = '';
            return;
        }
        
        // 파일 크기 제한 (예: 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            this.categoryIcons[categoryName] = `<img src="${base64Image}" style="width: 60px; height: 60px; object-fit: contain;" alt="${categoryName}">`;
            
            // 로컬 스토리지 및 Firestore에 저장
            this.saveCategoryIcons().catch(err => console.error('아이콘 저장 실패:', err));
            
            // 카테고리 카드 다시 렌더링
            if (this.currentView === 'categories') {
                this.renderCategoryCardsInitial();
            }
            
            // 카테고리 목록 다시 렌더링
            this.renderCategoryList();
            
            alert('아이콘이 저장되었습니다.');
        };
        reader.onerror = () => {
            alert('파일을 읽는 중 오류가 발생했습니다.');
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    }
    
    // 카테고리 아이콘 제거
    removeCategoryIcon(categoryName) {
        if (confirm('아이콘을 제거하시겠습니까?')) {
            delete this.categoryIcons[categoryName];
            this.saveCategoryIcons().catch(err => console.error('아이콘 저장 실패:', err));
            
            // 카테고리 카드 다시 렌더링
            if (this.currentView === 'categories') {
                this.renderCategoryCardsInitial();
            }
            
            // 카테고리 목록 다시 렌더링
            this.renderCategoryList();
            
            alert('아이콘이 제거되었습니다.');
        }
    }
    
    // 카테고리 색상 변경 처리
    handleCategoryColorChange(categoryName, color) {
        this.categoryColors[categoryName] = color;
        this.saveCategoryColors().catch(err => console.error('색상 저장 실패:', err));
        
        // 카테고리 목록 다시 렌더링 (색상 미리보기 업데이트)
        this.renderCategoryList();
        
        // 카테고리 필터 다시 렌더링
        this.renderCategoryFilterMain();
        this.renderCategoryCheckboxes();
        
        // 카테고리 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }
        
        // 다른 페이지의 필터도 업데이트 (meeting, discussion 등)
        if (window.meetingManager && window.meetingManager.renderCategoryFilter) {
            window.meetingManager.renderCategoryFilter();
        }
    }
    
    // 카테고리 아이콘 로드
    async loadCategoryIcons() {
        // 먼저 LocalStorage에서 로드 (기본값)
        const savedIcons = localStorage.getItem('categoryIcons');
        if (savedIcons) {
            try {
                const loadedIcons = JSON.parse(savedIcons);
                this.categoryIcons = { ...this.categoryIcons, ...loadedIcons };
            } catch (error) {
                console.error('LocalStorage 아이콘 파싱 실패:', error);
            }
        }
        
        try {
            // Firestore에서 로드 (최신 데이터 우선)
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('settings', 'categoryIcons');
                if (data && data.icons) {
                    // Firestore 데이터로 병합 (Firestore가 우선)
                    this.categoryIcons = { ...this.categoryIcons, ...data.icons };
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('categoryIcons', JSON.stringify(this.categoryIcons));
                    console.log('Firestore에서 아이콘 로드 완료:', Object.keys(data.icons).length, '개');
                    
                    // 실시간 동기화 리스너 설정
                    FirestoreHelper.onSnapshot('settings', 'categoryIcons', (data) => {
                        if (data && data.icons) {
                            console.log('Firestore 아이콘 실시간 업데이트:', Object.keys(data.icons).length, '개');
                            // Firestore 데이터로 병합
                            this.categoryIcons = { ...this.categoryIcons, ...data.icons };
                            localStorage.setItem('categoryIcons', JSON.stringify(this.categoryIcons));
                            // 카드 다시 렌더링
                            if (this.currentView === 'categories') {
                                this.renderCategoryCardsInitial();
                            }
                        }
                    });
                    return;
                } else {
                    console.log('Firestore에 아이콘 데이터가 없습니다. LocalStorage 사용.');
                }
            }
        } catch (error) {
            console.error('Firestore에서 아이콘 로드 실패, LocalStorage 사용:', error);
        }
    }
    
    // 카테고리 아이콘 저장
    async saveCategoryIcons() {
        // LocalStorage에 즉시 저장
        localStorage.setItem('categoryIcons', JSON.stringify(this.categoryIcons));
        console.log('아이콘 LocalStorage 저장 완료:', Object.keys(this.categoryIcons).length, '개');
        
        // Firestore에도 저장
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('settings', 'categoryIcons', {
                    icons: this.categoryIcons
                });
                console.log('아이콘 Firestore 저장 완료:', Object.keys(this.categoryIcons).length, '개');
            } else {
                console.warn('FirestoreHelper를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('Firestore에 아이콘 저장 실패:', error);
            // 저장 실패해도 LocalStorage에는 저장되어 있음
        }
    }
    
    // 카테고리 색상 로드
    async loadCategoryColors() {
        // 먼저 LocalStorage에서 로드 (기본값)
        const savedColors = localStorage.getItem('categoryColors');
        if (savedColors) {
            try {
                const loadedColors = JSON.parse(savedColors);
                this.categoryColors = { ...this.categoryColors, ...loadedColors };
            } catch (error) {
                console.error('LocalStorage 색상 파싱 실패:', error);
            }
        }
        
        try {
            // Firestore에서 로드 (최신 데이터 우선)
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('settings', 'categoryColors');
                if (data && data.colors) {
                    // Firestore 데이터로 병합 (Firestore가 우선)
                    this.categoryColors = { ...this.categoryColors, ...data.colors };
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('categoryColors', JSON.stringify(this.categoryColors));
                    console.log('Firestore에서 색상 로드 완료:', Object.keys(data.colors).length, '개');
                    
                    // 실시간 동기화 리스너 설정
                    FirestoreHelper.onSnapshot('settings', 'categoryColors', (data) => {
                        if (data && data.colors) {
                            console.log('Firestore 색상 실시간 업데이트:', Object.keys(data.colors).length, '개');
                            // Firestore 데이터로 병합
                            this.categoryColors = { ...this.categoryColors, ...data.colors };
                            localStorage.setItem('categoryColors', JSON.stringify(this.categoryColors));
                            // 카드 다시 렌더링
                            if (this.currentView === 'categories') {
                                this.renderCategoryCardsInitial();
                            }
                            // 필터 다시 렌더링
                            this.renderCategoryFilterMain();
                            this.renderCategoryCheckboxes();
                        }
                    });
                    return;
                } else {
                    console.log('Firestore에 색상 데이터가 없습니다. LocalStorage 사용.');
                }
            }
        } catch (error) {
            console.error('Firestore에서 색상 로드 실패, LocalStorage 사용:', error);
        }
    }
    
    // 카테고리 색상 저장
    async saveCategoryColors() {
        // LocalStorage에 즉시 저장
        localStorage.setItem('categoryColors', JSON.stringify(this.categoryColors));
        console.log('색상 LocalStorage 저장 완료:', Object.keys(this.categoryColors).length, '개');
        
        // Firestore에도 저장
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('settings', 'categoryColors', {
                    colors: this.categoryColors
                });
                console.log('색상 Firestore 저장 완료:', Object.keys(this.categoryColors).length, '개');
            } else {
                console.warn('FirestoreHelper를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('Firestore에 색상 저장 실패:', error);
            // 저장 실패해도 LocalStorage에는 저장되어 있음
        }
    }

    // 카테고리 추가
    addCategory() {
        const input = document.getElementById('newCategoryInput');
        const newCategory = input.value.trim();
        
        if (!newCategory) {
            alert('카테고리를 입력해주세요.');
            return;
        }
        
        if (this.categories.includes(newCategory)) {
            alert('이미 존재하는 카테고리입니다.');
            return;
        }
        
        this.categories.push(newCategory);
        this.saveCategories();
        this.renderCategoryCheckboxes();
        this.renderCategoryFilter();
        this.renderCategoryFilterMain(); // 메인 필터도 업데이트
        this.renderCategoryList();
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial(); // 카테고리 카드도 업데이트
        }
        input.value = '';
    }

    // 카테고리 삭제
    deleteCategory(index) {
        const category = this.categories[index];
        
        // 해당 카테고리를 사용하는 용어가 있는지 확인
        const termsUsingCategory = this.terms.filter(term => 
            term.category && term.category.includes(category)
        );
        
        if (termsUsingCategory.length > 0) {
            if (!confirm(`"${category}" 카테고리를 사용하는 용어가 ${termsUsingCategory.length}개 있습니다.\n정말 삭제하시겠습니까?`)) {
                return;
            }
            
            // 용어에서 해당 카테고리 제거
            this.terms.forEach(term => {
                if (term.category) {
                    term.category = term.category.filter(cat => cat !== category);
                }
            });
            this.saveData();
        }
        
        this.categories.splice(index, 1);
        this.saveCategories();
        this.renderCategoryCheckboxes();
        this.renderCategoryFilter();
        this.renderCategoryFilterMain();
        this.renderCategoryList();
        this.filterTerms();
        this.renderCategoryCardsInitial();
    }
    
    // 카테고리 이름 수정
    editCategoryName(index) {
        const category = this.categories[index];
        const displayName = category.replace(/^#/, '');
        const newName = prompt('카테고리 이름을 수정하세요:', displayName);
        
        if (!newName || newName.trim() === '') {
            return;
        }
        
        const newCategory = newName.trim().startsWith('#') ? newName.trim() : '#' + newName.trim();
        
        // 중복 체크
        if (this.categories.includes(newCategory) && newCategory !== category) {
            alert('이미 존재하는 카테고리입니다.');
            return;
        }
        
        // 기존 카테고리를 사용하는 용어 업데이트
        this.terms.forEach(term => {
            if (term.category) {
                if (Array.isArray(term.category)) {
                    const categoryIndex = term.category.indexOf(category);
                    if (categoryIndex !== -1) {
                        term.category[categoryIndex] = newCategory;
                    }
                } else if (term.category === category) {
                    term.category = newCategory;
                }
            }
        });
        
        // 카테고리 아이콘도 업데이트
        if (this.categoryIcons[category]) {
            this.categoryIcons[newCategory] = this.categoryIcons[category];
            delete this.categoryIcons[category];
            this.saveCategoryIcons().catch(err => console.error('아이콘 저장 실패:', err));
        }
        
        // 카테고리 색상도 업데이트
        if (this.categoryColors[category]) {
            this.categoryColors[newCategory] = this.categoryColors[category];
            delete this.categoryColors[category];
            this.saveCategoryColors().catch(err => console.error('색상 저장 실패:', err));
        }
        
        // 카테고리 목록 업데이트
        this.categories[index] = newCategory;
        this.saveCategories();
        this.saveData();
        this.renderCategoryCheckboxes();
        this.renderCategoryFilter();
        this.renderCategoryFilterMain();
        this.renderCategoryList();
        this.filterTerms();
        this.renderCategoryCardsInitial();
    }

    // 엑셀 업로드 처리
    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 첫 번째 시트 사용
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // JSON으로 변환
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) {
                    alert('엑셀 파일이 비어있습니다.');
                    event.target.value = '';
                    return;
                }

                // 헤더 확인 (첫 번째 줄)
                const header = jsonData[0].map(h => String(h).trim());
                
                // 미리보기 모달 표시
                this.showExcelPreviewModal(header, jsonData.slice(1), event.target);
            } catch (error) {
                console.error('엑셀 파싱 오류:', error);
                alert('엑셀 파일을 읽는 중 오류가 발생했습니다.\n파일 형식을 확인해주세요.');
                event.target.value = '';
            }
        };

        reader.onerror = () => {
            alert('파일을 읽는 중 오류가 발생했습니다.');
            event.target.value = '';
        };

        reader.readAsArrayBuffer(file);
    }

    // 엑셀 미리보기 모달 표시
    showExcelPreviewModal(headers, dataRows, fileInput) {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('excelPreviewModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 생성
        const modal = document.createElement('div');
        modal.id = 'excelPreviewModal';
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
            font-family: 'Pretendard', 'Nanum Gothic', sans-serif;
        `;

        // 컬럼 매핑 상태
        const columnMapping = {
            korean: '',
            japanese: ''
        };

        // 자동 매핑 시도
        headers.forEach((h, i) => {
            const lowerH = h.toLowerCase();
            if (h === '한국어' || lowerH === 'korean') columnMapping.korean = i;
            if (h === '일본어' || h === '日本語' || lowerH === 'japanese') columnMapping.japanese = i;
        });

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 90vw; max-height: 90vh; overflow: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 20px; color: #333;">엑셀 파일 미리보기</h2>
                    <button id="closePreviewModal" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #555;">컬럼 매핑 설정</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">한국어 컬럼 <span style="color: red;">*</span></label>
                            <select id="mappingKorean" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                <option value="">선택하세요</option>
                                ${headers.map((h, i) => `<option value="${i}" ${columnMapping.korean === i ? 'selected' : ''}>${h || `컬럼 ${i + 1}`}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">일본어 컬럼 <span style="color: red;">*</span></label>
                            <select id="mappingJapanese" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                <option value="">선택하세요</option>
                                ${headers.map((h, i) => `<option value="${i}" ${columnMapping.japanese === i ? 'selected' : ''}>${h || `컬럼 ${i + 1}`}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #555;">데이터 미리보기 (최대 10행)</h3>
                    <div id="previewTableContainer" style="overflow-x: auto; max-height: 400px; border: 1px solid #e0e0e0; border-radius: 6px;">
                        <!-- 미리보기 테이블이 여기에 동적으로 생성됩니다 -->
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelPreviewBtn" style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666;">취소</button>
                    <button id="confirmPreviewBtn" style="padding: 10px 20px; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">확인</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 미리보기 테이블 렌더링 함수
        const renderPreview = () => {
            const koreanCol = document.getElementById('mappingKorean').value ? parseInt(document.getElementById('mappingKorean').value) : null;
            const japaneseCol = document.getElementById('mappingJapanese').value ? parseInt(document.getElementById('mappingJapanese').value) : null;

            const container = document.getElementById('previewTableContainer');
            const previewRows = dataRows.slice(0, 10); // 최대 10행만 표시

            let tableHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #e0e0e0; background: #e3f2fd;">한국어</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #e0e0e0; background: #c8e6c9;">일본어</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            previewRows.forEach((row, idx) => {
                const korean = koreanCol !== null ? String(row[koreanCol] || '').trim() : '';
                const japanese = japaneseCol !== null ? String(row[japaneseCol] || '').trim() : '';

                tableHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; border: 1px solid #e0e0e0; background: #f0f7ff;">${this.escapeHtml(korean)}</td>
                        <td style="padding: 10px; border: 1px solid #e0e0e0; background: #f1f8e9;">${this.escapeHtml(japanese)}</td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            container.innerHTML = tableHTML;
        };

        // 초기 미리보기 렌더링
        renderPreview();

        // 컬럼 매핑 변경 시 미리보기 업데이트
        ['mappingKorean', 'mappingJapanese'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', renderPreview);
            }
        });

        // 취소 버튼
        document.getElementById('cancelPreviewBtn').addEventListener('click', () => {
            modal.remove();
            fileInput.value = '';
        });

        // 닫기 버튼
        document.getElementById('closePreviewModal').addEventListener('click', () => {
            modal.remove();
            fileInput.value = '';
        });

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                fileInput.value = '';
            }
        });

        // 확인 버튼
        document.getElementById('confirmPreviewBtn').addEventListener('click', () => {
            const koreanCol = document.getElementById('mappingKorean').value;
            const japaneseCol = document.getElementById('mappingJapanese').value;

            if (!koreanCol || !japaneseCol) {
                alert('한국어와 일본어 컬럼을 선택해주세요.');
                return;
            }

            // 실제 업로드 진행
            this.processExcelUpload(
                dataRows,
                {
                    korean: parseInt(koreanCol),
                    japanese: parseInt(japaneseCol)
                },
                fileInput
            );

            modal.remove();
        });
    }

    // 엑셀 업로드 처리 (매핑 정보 사용)
    processExcelUpload(dataRows, headerMap, fileInput) {
        try {
            const newTerms = [];
            let addedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                if (!row || row.length === 0) continue;

                const korean = String(row[headerMap.korean] || '').trim();
                const japanese = String(row[headerMap.japanese] || '').trim();
                
                if (!korean || !japanese) {
                    skippedCount++;
                    continue;
                }

                // 중복 체크
                const isDuplicate = this.terms.some(t => 
                    t.korean === korean && t.japanese === japanese
                );

                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }

                const newId = this.terms.length > 0 
                    ? Math.max(...this.terms.map(t => t.id)) + 1 + addedCount
                    : 1 + addedCount;

                newTerms.push({
                    id: newId,
                    korean: korean,
                    japanese: japanese,
                    category: [],
                    notes: ''
                });
                addedCount++;
            }

            if (newTerms.length > 0) {
                this.terms.push(...newTerms);
                this.saveData();
                this.filterTerms();
                
                alert(`총 ${addedCount}개의 용어가 추가되었습니다.${skippedCount > 0 ? `\n${skippedCount}개의 항목이 건너뛰어졌습니다 (중복 또는 필수값 누락).` : ''}`);
            } else {
                alert('추가할 수 있는 용어가 없습니다.\n모든 항목이 중복이거나 필수값이 누락되었습니다.');
            }

            fileInput.value = '';
        } catch (error) {
            console.error('엑셀 업로드 처리 오류:', error);
            alert('엑셀 파일 업로드 중 오류가 발생했습니다.');
            fileInput.value = '';
        }
    }

    // HTML 이스케이프 헬퍼
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // CSV 라인 파싱
    parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    // 엑셀 다운로드
    downloadCsv() {
        if (this.terms.length === 0) {
            alert('다운로드할 용어가 없습니다.');
            return;
        }

        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 데이터 준비
        const headers = ['번호', '한국어', '日本語', '카테고리', '비고'];
        const data = [headers];

        this.terms.forEach(term => {
            const row = [
                term.id,
                term.korean,
                term.japanese,
                (term.category || []).join(', '),
                term.notes || ''
            ];
            data.push(row);
        });

        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 8 },  // 번호
            { wch: 20 }, // 한국어
            { wch: 20 }, // 일본어
            { wch: 15 }, // 카테고리
            { wch: 30 }  // 비고
        ];

        // 워크시트를 워크북에 추가
        XLSX.utils.book_append_sheet(wb, ws, '용어집');

        // 파일 다운로드
        const fileName = `glossary_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
    
    // 용어 선택/해제
    toggleTermSelect(termId, checked) {
        // termId를 숫자로 변환하여 일관성 유지
        const id = typeof termId === 'string' ? parseInt(termId) : termId;
        
        if (checked) {
            this.selectedTermIds.add(id);
        } else {
            this.selectedTermIds.delete(id);
        }
        
        console.log('선택된 용어 ID:', Array.from(this.selectedTermIds), '현재 선택:', id, '체크 상태:', checked);
        
        this.updateSelectAllGlossaryCheckbox();
        this.updateDeleteSelectedButton();
        
        // 검색 결과 영역이 표시되어 있으면 전체 선택 체크박스 상태 업데이트
        const searchResultsContainer = document.getElementById('searchResultsContainer');
        if (searchResultsContainer && searchResultsContainer.style.display !== 'none') {
            this.updateSelectAllSearchCheckbox();
        }
    }
    
    // 전체 선택/해제 (용어 목록 뷰)
    toggleSelectAllTerms(checked) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTerms = this.filteredTerms.slice(startIndex, endIndex);
        
        if (checked) {
            pageTerms.forEach(term => {
                this.selectedTermIds.add(term.id);
            });
        } else {
            pageTerms.forEach(term => {
                this.selectedTermIds.delete(term.id);
            });
        }
        
        // 체크박스 상태 업데이트
        const checkboxes = document.querySelectorAll('.term-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        
        this.updateDeleteSelectedButton();
    }

    // 검색 결과 전체 선택/해제
    toggleSelectAllSearchResults(checked) {
        const searchResultsBody = document.getElementById('searchResultsBody');
        if (!searchResultsBody) return;

        // 검색 결과 테이블의 모든 체크박스 가져오기
        const checkboxes = searchResultsBody.querySelectorAll('.term-checkbox');
        
        if (checked) {
            // 현재 페이지의 모든 용어 선택
            checkboxes.forEach(checkbox => {
                const termId = parseInt(checkbox.getAttribute('data-id'));
                if (termId) {
                    this.selectedTermIds.add(termId);
                    checkbox.checked = true;
                }
            });
        } else {
            // 현재 페이지의 모든 용어 선택 해제
            checkboxes.forEach(checkbox => {
                const termId = parseInt(checkbox.getAttribute('data-id'));
                if (termId) {
                    this.selectedTermIds.delete(termId);
                    checkbox.checked = false;
                }
            });
        }
        
        this.updateDeleteSelectedButton();
        this.updateSelectAllSearchCheckbox();
    }
    
    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllGlossaryCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllGlossaryCheckbox');
        if (!selectAllCheckbox) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTerms = this.filteredTerms.slice(startIndex, endIndex);
        
        if (pageTerms.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        
        const checkedCount = pageTerms.filter(term => this.selectedTermIds.has(term.id)).length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === pageTerms.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
    
    // 선택 항목 삭제 버튼 표시/숨김 업데이트
    updateDeleteSelectedButton() {
        // 용어 목록 뷰의 삭제 버튼
        const deleteBtn = document.getElementById('deleteSelectedTermsBtn');
        if (deleteBtn) {
            if (this.selectedTermIds.size > 0) {
                deleteBtn.style.display = 'inline-block';
            } else {
                deleteBtn.style.display = 'none';
            }
        }

        // 검색 결과 영역의 삭제 버튼
        const searchDeleteBtn = document.getElementById('deleteSelectedSearchResultsBtn');
        if (searchDeleteBtn) {
            const searchResultsContainer = document.getElementById('searchResultsContainer');
            const isSearchResultsVisible = searchResultsContainer && searchResultsContainer.style.display !== 'none';
            
            if (this.selectedTermIds.size > 0 && isSearchResultsVisible) {
                searchDeleteBtn.style.display = 'inline-block';
            } else {
                searchDeleteBtn.style.display = 'none';
            }
        }
    }
    
    // 선택된 용어 삭제
    deleteSelectedTerms() {
        console.log('삭제 시도 - 선택된 용어 ID 개수:', this.selectedTermIds.size, 'ID 목록:', Array.from(this.selectedTermIds));
        
        if (this.selectedTermIds.size === 0) {
            alert('삭제할 항목을 선택해주세요.');
            return;
        }
        
        if (confirm(`선택한 ${this.selectedTermIds.size}개의 항목을 삭제하시겠습니까?`)) {
            // 선택된 ID들을 배열로 변환
            const idsToDelete = Array.from(this.selectedTermIds);
            
            // 용어 삭제
            this.terms = this.terms.filter(term => !idsToDelete.includes(term.id));
            
            // 선택 상태 초기화
            this.selectedTermIds.clear();
            
            // 데이터 저장 및 필터링
            this.saveData();
            this.filterTerms();
            
            // 검색 결과 영역이 표시되어 있으면 검색 결과 다시 렌더링
            const searchResultsContainer = document.getElementById('searchResultsContainer');
            const searchInput = document.getElementById('categorySearchInput');
            
            if (searchResultsContainer && searchResultsContainer.style.display !== 'none') {
                const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
                if (searchTerm) {
                    this.renderSearchResults(searchTerm);
                } else {
                    this.renderAllTermsInSearchResults();
                }
            } else {
                // 용어 목록 뷰면 일반 렌더링
                this.render();
            }
            
            this.updateDeleteSelectedButton();
            this.updateSelectAllSearchCheckbox();
            this.updateSelectAllGlossaryCheckbox();
        }
    }

    // 이미지 추출 섹션 토글
    toggleImageExtractSection() {
        const content = document.getElementById('imageExtractContent');
        const toggle = document.getElementById('imageExtractToggle');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    }

    // 드래그 오버 처리
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = '#f0f4ff';
        event.currentTarget.style.borderColor = '#0d4a1f';
    }

    // 드래그 리브 처리
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = 'white';
        event.currentTarget.style.borderColor = '#0d4a1f';
    }

    // 드롭 처리
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = 'white';
        event.currentTarget.style.borderColor = '#0d4a1f';
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }

    // 이미지 선택 처리
    handleImageSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }

    // 클립보드 붙여넣기 처리 (스크린샷 붙여넣기)
    handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        // 클립보드에서 이미지 찾기
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // 이미지 타입인지 확인
            if (item.type.indexOf('image') !== -1) {
                event.preventDefault();
                
                const blob = item.getAsFile();
                if (blob) {
                    // Blob을 File 객체로 변환
                    const file = new File([blob], 'pasted-image.png', { type: item.type });
                    
                    // 모달이 열려있으면 모달 내 이미지로 처리
                    const modal = document.getElementById('termModal');
                    if (modal && modal.classList.contains('show')) {
                        this.processModalImageFiles([file]);
                    } else {
                        // 기존 이미지 추출 섹션이 열려있는지 확인
                        const imageExtractContent = document.getElementById('imageExtractContent');
                        if (imageExtractContent && imageExtractContent.style.display !== 'none') {
                            this.processImageFile(file);
                        }
                    }
                }
                return;
            }
        }
    }

    // 이미지 파일 처리
    processImageFile(file) {
        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB 이하여야 합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('previewImage');
            const previewContainer = document.getElementById('imagePreview');
            const uploadAreaContent = document.getElementById('uploadAreaContent');
            const extractBtn = document.getElementById('extractTermsBtn');
            
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
            // 업로드 영역의 기본 콘텐츠 숨기기
            if (uploadAreaContent) {
                uploadAreaContent.style.display = 'none';
            }
            extractBtn.disabled = false;
            
            // 이미지 데이터 및 타입 저장 (base64)
            this.currentImageData = e.target.result;
            this.currentImageType = file.type; // 이미지 타입 저장 (예: 'image/png', 'image/jpeg')
        };
        reader.onerror = () => {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsDataURL(file);
    }

    // 이미지 제거
    removeImage() {
        const preview = document.getElementById('previewImage');
        const previewContainer = document.getElementById('imagePreview');
        const uploadAreaContent = document.getElementById('uploadAreaContent');
        
        preview.src = '';
        previewContainer.style.display = 'none';
        // 업로드 영역의 기본 콘텐츠 다시 표시
        if (uploadAreaContent) {
            uploadAreaContent.style.display = 'flex';
        }
        document.getElementById('extractTermsBtn').disabled = true;
        document.getElementById('imageFileInput').value = '';
        document.getElementById('extractedTermsContainer').style.display = 'none';
        this.currentImageData = null;
        this.currentImageType = 'image/jpeg';
        this.extractedTerms = [];
    }

    // 이미지에서 용어 추출
    async extractTermsFromImage() {
        if (!this.currentImageData) {
            alert('이미지를 먼저 업로드해주세요.');
            return;
        }

        // API 키 확인
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            alert('Claude API 키가 필요합니다. 코퍼스 페이지에서 API 키를 설정해주세요.');
            return;
        }

        const extractBtn = document.getElementById('extractTermsBtn');
        const container = document.getElementById('extractedTermsContainer');
        const table = document.getElementById('extractedTermsTable');

        // 로딩 표시
        extractBtn.disabled = true;
        extractBtn.textContent = '추출 중...';
        container.style.display = 'block';
        table.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">용어를 추출하는 중입니다...</div>';

        try {
            // base64 데이터에서 data URL prefix 제거
            const base64Data = this.currentImageData.split(',')[1];
            
            // Claude Vision API 호출
            const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            
            const prompt = `이미지에서 용어를 추출하여 한국어-일본어 쌍으로 표 형식으로 정리해주세요.

형식:
| 한국어 | 일본어 |
|--------|--------|
| 용어1 | 用語1 |
| 용어2 | 用語2 |

표 형식으로만 출력해주세요. 설명이나 추가 텍스트는 필요 없습니다.`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4000,
                    temperature: 0.3,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image',
                                    source: {
                                        type: 'base64',
                                        media_type: this.currentImageType || 'image/jpeg',
                                        data: base64Data
                                    }
                                },
                                {
                                    type: 'text',
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('API 응답 형식이 올바르지 않습니다.');
            }

            const extractedText = data.content[0].text.trim();
            
            // 표 형식 파싱
            const terms = this.parseExtractedTerms(extractedText);
            
            if (terms.length === 0) {
                table.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;">용어를 추출할 수 없습니다. 이미지를 확인해주세요.</div>';
                extractBtn.disabled = false;
                extractBtn.textContent = '용어 추출';
                return;
            }

            // 추출된 용어 저장
            this.extractedTerms = terms;
            
            // 테이블 렌더링
            this.renderExtractedTermsTable(terms);
            
            extractBtn.disabled = false;
            extractBtn.textContent = '용어 추출';
            
        } catch (error) {
            console.error('용어 추출 오류:', error);
            table.innerHTML = `<div style="padding: 20px; text-align: center; color: #e74c3c;">오류: ${error.message}</div>`;
            extractBtn.disabled = false;
            extractBtn.textContent = '용어 추출';
        }
    }

    // 추출된 텍스트에서 용어 파싱
    parseExtractedTerms(text) {
        const terms = [];
        const lines = text.split('\n');
        
        // 표 형식 파싱 (| 구분자 사용)
        let inTable = false;
        for (let line of lines) {
            const trimmed = line.trim();
            
            // 표 헤더 확인
            if (trimmed.includes('|') && (trimmed.includes('한국어') || trimmed.includes('일본어'))) {
                inTable = true;
                continue;
            }
            
            // 표 구분선 건너뛰기
            if (trimmed.match(/^\|[\s\-:]+\|$/)) {
                continue;
            }
            
            // 표 데이터 파싱
            if (inTable && trimmed.includes('|')) {
                const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length >= 2) {
                    const korean = cells[0];
                    const japanese = cells[1];
                    if (korean && japanese && korean !== '한국어' && japanese !== '일본어') {
                        terms.push({ korean, japanese });
                    }
                }
            }
        }
        
        // 표 형식이 아닌 경우 다른 패턴 시도
        if (terms.length === 0) {
            // "한국어: xxx, 일본어: yyy" 형식
            const pattern1 = /한국어[:\s]+([^,\n]+)[,\s]+일본어[:\s]+([^\n]+)/gi;
            let match;
            while ((match = pattern1.exec(text)) !== null) {
                terms.push({ korean: match[1].trim(), japanese: match[2].trim() });
            }
            
            // "xxx / yyy" 형식
            if (terms.length === 0) {
                const pattern2 = /([^/\n]+)\s*\/\s*([^\n]+)/g;
                while ((match = pattern2.exec(text)) !== null) {
                    const korean = match[1].trim();
                    const japanese = match[2].trim();
                    if (korean && japanese && korean.length < 50 && japanese.length < 50) {
                        terms.push({ korean, japanese });
                    }
                }
            }
        }
        
        return terms;
    }

    // 추출된 용어 테이블 렌더링
    renderExtractedTermsTable(terms) {
        const table = document.getElementById('extractedTermsTable');
        
        // 카테고리 옵션 생성
        const categoryOptions = this.categories.map(cat => {
            const displayName = cat.replace(/^#/, '');
            return `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(displayName)}</option>`;
        }).join('');
        
        let html = '<table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">';
        html += '<thead><tr style="background: #f8f9fa;">';
        html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">한국어</th>';
        html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">일본어</th>';
        html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">카테고리</th>';
        html += '<th style="padding: 12px; text-align: center; border-bottom: 2px solid #e0e0e0; width: 200px;">관리</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        terms.forEach((term, index) => {
            html += `<tr id="extracted-term-row-${index}" style="border-bottom: 1px solid #f0f0f0;">`;
            html += `<td style="padding: 12px;">${this.escapeHtml(term.korean)}</td>`;
            html += `<td style="padding: 12px;">${this.escapeHtml(term.japanese)}</td>`;
            html += `<td style="padding: 12px;">`;
            html += `<select id="extracted-category-${index}" class="extracted-category-select" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;">`;
            html += `<option value="">선택하세요</option>`;
            html += categoryOptions;
            html += `</select>`;
            html += `</td>`;
            html += `<td style="padding: 12px; text-align: center;">`;
            html += `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; margin-right: 5px;" onclick="window.glossaryManager && window.glossaryManager.addExtractedTerm(${index})">추가</button>`;
            html += `<button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.glossaryManager && window.glossaryManager.removeExtractedTerm(${index})">삭제</button>`;
            html += `</td>`;
            html += `</tr>`;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    }

    // 개별 용어 추가
    addExtractedTerm(index) {
        const term = this.extractedTerms[index];
        if (!term) return;

        // 카테고리 선택 확인
        const categorySelect = document.getElementById(`extracted-category-${index}`);
        const selectedCategory = categorySelect ? categorySelect.value : '';
        
        if (!selectedCategory) {
            alert('카테고리를 선택해주세요.');
            return;
        }

        // 중복 체크
        const isDuplicate = this.terms.some(t => 
            t.korean === term.korean && t.japanese === term.japanese
        );

        if (isDuplicate) {
            alert('이미 존재하는 용어입니다.');
            return;
        }

        // 용어 추가
        let newId = 1;
        if (this.terms.length > 0) {
            const maxId = Math.max(...this.terms.map(t => t.id || 0));
            newId = maxId >= 1 ? maxId + 1 : 1;
        }

        this.terms.push({
            id: newId,
            korean: term.korean,
            japanese: term.japanese,
            category: [selectedCategory], // 선택한 카테고리 추가
            notes: '',
            updatedAt: new Date().toISOString()
        });

        this.saveData();
        this.filterTerms();
        
        // 카테고리 뷰면 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }
        
        // 추출된 용어 목록에서 제거하고 테이블 다시 렌더링
        this.extractedTerms.splice(index, 1);
        if (this.extractedTerms.length === 0) {
            // 모든 용어가 추가되면 컨테이너 숨기기
            document.getElementById('extractedTermsContainer').style.display = 'none';
        } else {
            // 남은 용어가 있으면 테이블 다시 렌더링
            this.renderExtractedTermsTable(this.extractedTerms);
        }
        
        alert('용어가 추가되었습니다.');
    }

    // 추출된 용어 행 삭제
    removeExtractedTerm(index) {
        if (confirm('이 용어를 목록에서 삭제하시겠습니까?')) {
            // 추출된 용어 목록에서 제거
            this.extractedTerms.splice(index, 1);
            
            if (this.extractedTerms.length === 0) {
                // 모든 용어가 삭제되면 컨테이너 숨기기
                document.getElementById('extractedTermsContainer').style.display = 'none';
            } else {
                // 남은 용어가 있으면 테이블 다시 렌더링
                this.renderExtractedTermsTable(this.extractedTerms);
            }
        }
    }

    // 모든 추출된 용어 추가
    addAllExtractedTerms() {
        if (!this.extractedTerms || this.extractedTerms.length === 0) {
            alert('추가할 용어가 없습니다.');
            return;
        }

        // 카테고리 선택 확인 (각 행의 카테고리 선택 상태 확인)
        let hasUnselectedCategory = false;
        this.extractedTerms.forEach((term, index) => {
            const categorySelect = document.getElementById(`extracted-category-${index}`);
            if (!categorySelect || !categorySelect.value) {
                hasUnselectedCategory = true;
            }
        });

        if (hasUnselectedCategory) {
            alert('모든 용어에 카테고리를 선택해주세요.');
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        this.extractedTerms.forEach((term, index) => {
            // 카테고리 가져오기
            const categorySelect = document.getElementById(`extracted-category-${index}`);
            const selectedCategory = categorySelect ? categorySelect.value : '';

            // 중복 체크
            const isDuplicate = this.terms.some(t => 
                t.korean === term.korean && t.japanese === term.japanese
            );

            if (!isDuplicate && selectedCategory) {
                let newId = 1;
                if (this.terms.length > 0) {
                    const maxId = Math.max(...this.terms.map(t => t.id || 0));
                    newId = maxId >= 1 ? maxId + 1 : 1;
                }

                this.terms.push({
                    id: newId,
                    korean: term.korean,
                    japanese: term.japanese,
                    category: [selectedCategory], // 선택한 카테고리 추가
                    notes: '',
                    updatedAt: new Date().toISOString()
                });
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        this.saveData();
        this.filterTerms();
        
        // 카테고리 뷰면 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }

        alert(`총 ${addedCount}개의 용어가 추가되었습니다.${skippedCount > 0 ? `\n${skippedCount}개의 중복 항목이 건너뛰어졌습니다.` : ''}`);
        
        // 추출된 용어 컨테이너 숨기기
        document.getElementById('extractedTermsContainer').style.display = 'none';
        this.extractedTerms = [];
    }

    // 모달 내 이미지 드래그 오버 처리
    handleModalDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = '#f0f4ff';
        event.currentTarget.style.borderColor = '#0d4a1f';
    }

    // 모달 내 드래그 리브 처리
    handleModalDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = 'white';
        event.currentTarget.style.borderColor = '#0d4a1f';
    }

    // 모달 내 드롭 처리
    handleModalDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.backgroundColor = 'white';
        event.currentTarget.style.borderColor = '#0d4a1f';
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processModalImageFiles(Array.from(files));
        }
    }

    // 모달 내 이미지 선택 처리
    handleModalImageSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            this.processModalImageFiles(files);
        }
    }

    // 모달 내 이미지 파일 처리 (여러 파일)
    processModalImageFiles(files) {
        const validFiles = [];
        
        // 파일 유효성 검사
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name}은(는) 이미지 파일이 아닙니다. 건너뜁니다.`);
                continue;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                alert(`${file.name}의 파일 크기가 10MB를 초과합니다. 건너뜁니다.`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        if (validFiles.length === 0) {
            return;
        }
        
        // 각 파일을 읽어서 배열에 추가
        let processedCount = 0;
        const totalFiles = validFiles.length;
        
        validFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // 이미지 데이터를 배열에 추가
                this.modalImages.push({
                    data: e.target.result,
                    type: file.type,
                    file: file,
                    id: Date.now() + index // 고유 ID 생성
                });
                
                processedCount++;
                
                // 모든 파일이 처리되면 UI 업데이트
                if (processedCount === totalFiles) {
                    this.updateModalImagePreview();
                }
            };
            reader.onerror = () => {
                alert(`${file.name}을(를) 읽는 중 오류가 발생했습니다.`);
                processedCount++;
                if (processedCount === totalFiles) {
                    this.updateModalImagePreview();
                }
            };
            reader.readAsDataURL(file);
        });
    }
    
    // 모달 내 이미지 미리보기 업데이트
    updateModalImagePreview() {
        const previewContainer = document.getElementById('modalImagePreview');
        const previewGrid = document.getElementById('modalImagePreviewGrid');
        const uploadAreaContent = document.getElementById('modalUploadAreaContent');
        const extractBtn = document.getElementById('modalExtractTermsBtn');
        
        if (!previewGrid) return;
        
        if (this.modalImages.length === 0) {
            previewContainer.style.display = 'none';
            if (uploadAreaContent) {
                uploadAreaContent.style.display = 'flex';
            }
            extractBtn.disabled = true;
            return;
        }
        
        // 업로드 영역의 기본 콘텐츠 숨기기
        if (uploadAreaContent) {
            uploadAreaContent.style.display = 'none';
        }
        previewContainer.style.display = 'block';
        extractBtn.disabled = false;
        
        // 그리드에 이미지 미리보기 추가
        previewGrid.innerHTML = '';
        this.modalImages.forEach((imageObj, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; background: #f5f5f5;';
            imageDiv.innerHTML = `
                <img src="${imageObj.data}" alt="미리보기 ${index + 1}" style="width: 100%; height: 100%; object-fit: contain;">
                <button type="button" class="btn btn-secondary" style="position: absolute; top: 5px; right: 5px; padding: 4px 8px; font-size: 11px; z-index: 10; background: rgba(255, 255, 255, 0.9); border: 1px solid #ddd;" onclick="event.stopPropagation(); window.glossaryManager && window.glossaryManager.removeModalImageByIndex(${index})">×</button>
            `;
            previewGrid.appendChild(imageDiv);
        });
    }

    // 모달 내 이미지 제거 (전체)
    removeModalImage() {
        this.modalImages = [];
        this.updateModalImagePreview();
        document.getElementById('modalImageFileInput').value = '';
        document.getElementById('modalExtractedTermsContainer').style.display = 'none';
        this.modalExtractedTerms = [];
    }
    
    // 모달 내 특정 인덱스의 이미지 제거
    removeModalImageByIndex(index) {
        if (index >= 0 && index < this.modalImages.length) {
            this.modalImages.splice(index, 1);
            this.updateModalImagePreview();
            
            // 모든 이미지가 제거되면 추출된 용어도 숨기기
            if (this.modalImages.length === 0) {
                document.getElementById('modalExtractedTermsContainer').style.display = 'none';
                this.modalExtractedTerms = [];
            }
        }
    }

    // 모달 내 이미지에서 용어 추출 (여러 이미지 지원)
    async extractTermsFromModalImage() {
        if (!this.modalImages || this.modalImages.length === 0) {
            alert('이미지를 먼저 업로드해주세요.');
            return;
        }

        // API 키 확인
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            alert('Claude API 키가 필요합니다. 코퍼스 페이지에서 API 키를 설정해주세요.');
            return;
        }

        const extractBtn = document.getElementById('modalExtractTermsBtn');
        const container = document.getElementById('modalExtractedTermsContainer');
        const table = document.getElementById('modalExtractedTermsTable');

        // 로딩 표시
        extractBtn.disabled = true;
        extractBtn.textContent = `추출 중... (0/${this.modalImages.length})`;
        container.style.display = 'block';
        table.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">용어를 추출하는 중입니다...</div>';

        try {
            let apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            if (apiUrl.startsWith('/')) {
                apiUrl = window.location.origin + apiUrl;
            }
            
            const prompt = `이미지에서 용어를 추출하여 한국어-일본어 쌍으로 표 형식으로 정리해주세요.

형식:
| 한국어 | 일본어 |
|--------|--------|
| 용어1 | 用語1 |
| 용어2 | 用語2 |

표 형식으로만 출력해주세요. 설명이나 추가 텍스트는 필요 없습니다.`;

            let allTerms = [];
            
            // 모든 이미지를 순차적으로 처리
            for (let i = 0; i < this.modalImages.length; i++) {
                const imageObj = this.modalImages[i];
                extractBtn.textContent = `추출 중... (${i + 1}/${this.modalImages.length})`;
                
                // base64 데이터에서 data URL prefix 제거
                const base64Data = imageObj.data.split(',')[1];
                
                // Claude Vision API 호출
                let response;
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            apiKey: apiKey.trim(),
                            model: 'claude-sonnet-4-5-20250929',
                            max_tokens: 4000,
                            temperature: 0.3,
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'image',
                                            source: {
                                                type: 'base64',
                                                media_type: imageObj.type || 'image/jpeg',
                                                data: base64Data
                                            }
                                        },
                                        {
                                            type: 'text',
                                            text: prompt
                                        }
                                    ]
                                }
                            ]
                        })
                    });
                } catch (fetchError) {
                    console.error(`이미지 ${i + 1} fetch 오류:`, fetchError);
                    // 네트워크 오류인 경우 계속 진행
                    if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                        continue;
                    }
                    throw fetchError;
                }

                if (!response.ok) {
                    let errorData;
                    try {
                        const errorText = await response.text();
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                    }
                    
                    console.error(`이미지 ${i + 1} 처리 오류:`, {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                    
                    // 403 오류인 경우 특별 처리
                    if (response.status === 403) {
                        const errorMessage = errorData.error || errorData.message || 'Request not allowed';
                        throw new Error(`API 접근이 거부되었습니다 (403). ${errorMessage}\n\n가능한 원인:\n1. Cloudflare Workers 보안 정책에 의해 차단됨\n2. API 키가 유효하지 않음\n3. 요청 크기가 너무 큼`);
                    }
                    
                    continue; // 다른 오류는 다음 이미지 계속 처리
                }

                const data = await response.json();
                
                if (!data.content || !data.content[0] || !data.content[0].text) {
                    console.error(`이미지 ${i + 1} 응답 형식 오류`);
                    continue;
                }

                const extractedText = data.content[0].text.trim();
                
                // 표 형식 파싱
                const terms = this.parseExtractedTerms(extractedText);
                allTerms = allTerms.concat(terms);
            }
            
            if (allTerms.length === 0) {
                table.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;">용어를 추출할 수 없습니다. 이미지를 확인해주세요.</div>';
                extractBtn.disabled = false;
                extractBtn.textContent = '용어 추출';
                return;
            }

            // 추출된 용어 저장
            this.modalExtractedTerms = allTerms;
            
            // 테이블 렌더링
            this.renderModalExtractedTermsTable(allTerms);
            
            extractBtn.disabled = false;
            extractBtn.textContent = '용어 추출';
            
        } catch (error) {
            console.error('용어 추출 오류:', error);
            table.innerHTML = `<div style="padding: 20px; text-align: center; color: #e74c3c;">오류: ${error.message}</div>`;
            extractBtn.disabled = false;
            extractBtn.textContent = '용어 추출';
        }
    }

    // 모달 내 추출된 용어 테이블 렌더링
    renderModalExtractedTermsTable(terms) {
        const table = document.getElementById('modalExtractedTermsTable');
        
        // 카테고리 옵션 생성
        const categoryOptions = this.categories.map(cat => {
            const displayName = cat.replace(/^#/, '');
            return `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(displayName)}</option>`;
        }).join('');
        
        let html = '<table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; font-size: 12px;">';
        html += '<thead><tr style="background: #f8f9fa;">';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">한국어</th>';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">일본어</th>';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">카테고리</th>';
        html += '<th style="padding: 8px; text-align: center; border-bottom: 2px solid #e0e0e0; width: 150px;">관리</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        terms.forEach((term, index) => {
            html += `<tr id="modal-extracted-term-row-${index}" style="border-bottom: 1px solid #f0f0f0;">`;
            html += `<td style="padding: 8px;">${this.escapeHtml(term.korean)}</td>`;
            html += `<td style="padding: 8px;">${this.escapeHtml(term.japanese)}</td>`;
            html += `<td style="padding: 8px;">`;
            html += `<select id="modal-extracted-category-${index}" class="modal-extracted-category-select" style="width: 100%; padding: 4px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 12px;">`;
            html += `<option value="">선택하세요</option>`;
            html += categoryOptions;
            html += `</select>`;
            html += `</td>`;
            html += `<td style="padding: 8px; text-align: center;">`;
            html += `<button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 3px;" onclick="window.glossaryManager && window.glossaryManager.addModalExtractedTerm(${index})">추가</button>`;
            html += `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="window.glossaryManager && window.glossaryManager.removeModalExtractedTerm(${index})">삭제</button>`;
            html += `</td>`;
            html += `</tr>`;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    }

    // 모달 내 개별 용어 추가
    addModalExtractedTerm(index) {
        const term = this.modalExtractedTerms[index];
        if (!term) return;

        // 카테고리 선택 확인
        const categorySelect = document.getElementById(`modal-extracted-category-${index}`);
        const selectedCategory = categorySelect ? categorySelect.value : '';
        
        if (!selectedCategory) {
            alert('카테고리를 선택해주세요.');
            return;
        }

        // 중복 체크
        const isDuplicate = this.terms.some(t => 
            t.korean === term.korean && t.japanese === term.japanese
        );

        if (isDuplicate) {
            alert('이미 존재하는 용어입니다.');
            return;
        }

        // 용어 추가
        let newId = 1;
        if (this.terms.length > 0) {
            const maxId = Math.max(...this.terms.map(t => t.id || 0));
            newId = maxId >= 1 ? maxId + 1 : 1;
        }

        this.terms.push({
            id: newId,
            korean: term.korean,
            japanese: term.japanese,
            category: [selectedCategory],
            notes: '',
            updatedAt: new Date().toISOString()
        });

        this.saveData();
        this.filterTerms();
        
        // 카테고리 뷰면 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }
        
        // 추출된 용어 목록에서 제거하고 테이블 다시 렌더링
        this.modalExtractedTerms.splice(index, 1);
        if (this.modalExtractedTerms.length === 0) {
            // 모든 용어가 추가되면 컨테이너 숨기기
            document.getElementById('modalExtractedTermsContainer').style.display = 'none';
        } else {
            // 남은 용어가 있으면 테이블 다시 렌더링
            this.renderModalExtractedTermsTable(this.modalExtractedTerms);
        }
        
        alert('용어가 추가되었습니다.');
    }

    // 모달 내 추출된 용어 행 삭제
    removeModalExtractedTerm(index) {
        if (confirm('이 용어를 목록에서 삭제하시겠습니까?')) {
            // 추출된 용어 목록에서 제거
            this.modalExtractedTerms.splice(index, 1);
            
            if (this.modalExtractedTerms.length === 0) {
                // 모든 용어가 삭제되면 컨테이너 숨기기
                document.getElementById('modalExtractedTermsContainer').style.display = 'none';
            } else {
                // 남은 용어가 있으면 테이블 다시 렌더링
                this.renderModalExtractedTermsTable(this.modalExtractedTerms);
            }
        }
    }

    // 모달 내 모든 추출된 용어 추가
    addAllModalExtractedTerms() {
        if (!this.modalExtractedTerms || this.modalExtractedTerms.length === 0) {
            alert('추가할 용어가 없습니다.');
            return;
        }

        // 카테고리 선택 확인 (각 행의 카테고리 선택 상태 확인)
        let hasUnselectedCategory = false;
        this.modalExtractedTerms.forEach((term, index) => {
            const categorySelect = document.getElementById(`modal-extracted-category-${index}`);
            if (!categorySelect || !categorySelect.value) {
                hasUnselectedCategory = true;
            }
        });

        if (hasUnselectedCategory) {
            alert('모든 용어에 카테고리를 선택해주세요.');
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        this.modalExtractedTerms.forEach((term, index) => {
            // 카테고리 가져오기
            const categorySelect = document.getElementById(`modal-extracted-category-${index}`);
            const selectedCategory = categorySelect ? categorySelect.value : '';

            // 중복 체크
            const isDuplicate = this.terms.some(t => 
                t.korean === term.korean && t.japanese === term.japanese
            );

            if (!isDuplicate && selectedCategory) {
                let newId = 1;
                if (this.terms.length > 0) {
                    const maxId = Math.max(...this.terms.map(t => t.id || 0));
                    newId = maxId >= 1 ? maxId + 1 : 1;
                }

                this.terms.push({
                    id: newId,
                    korean: term.korean,
                    japanese: term.japanese,
                    category: [selectedCategory],
                    notes: '',
                    updatedAt: new Date().toISOString()
                });
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        this.saveData();
        this.filterTerms();
        
        // 카테고리 뷰면 카드 다시 렌더링
        if (this.currentView === 'categories') {
            this.renderCategoryCardsInitial();
        }

        alert(`총 ${addedCount}개의 용어가 추가되었습니다.${skippedCount > 0 ? `\n${skippedCount}개의 중복 항목이 건너뛰어졌습니다.` : ''}`);
        
        // 추출된 용어 컨테이너 숨기기
        document.getElementById('modalExtractedTermsContainer').style.display = 'none';
        this.modalExtractedTerms = [];
    }
}

// 페이지 로드 시 초기화
let glossaryManager;
async function initializeGlossary() {
    if (!glossaryManager) {
        // Firebase 초기화 대기
        try {
            if (typeof waitForFirebaseSDK === 'function') {
                await waitForFirebaseSDK();
            }
            // FirestoreHelper가 사용 가능할 때까지 대기
            let attempts = 0;
            while (typeof window.FirestoreHelper === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        } catch (error) {
            console.error('Firebase 초기화 대기 실패:', error);
        }
        
        glossaryManager = new GlossaryManager();
        window.glossaryManager = glossaryManager;
        
        // 초기화 실행
        if (glossaryManager.init) {
            await glossaryManager.init();
        }
    }
}

// DOMContentLoaded 이벤트가 이미 발생했는지 확인
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeGlossary().catch(err => console.error('초기화 실패:', err));
    });
} else {
    // 이미 로드되었으면 즉시 초기화
    initializeGlossary().catch(err => console.error('초기화 실패:', err));
}
