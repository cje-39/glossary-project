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
        
        // 카테고리별 아이콘 매핑
        this.categoryIcons = {
            '#dinkum': '<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext x=\'50\' y=\'70\' font-size=\'80\' font-weight=\'bold\' fill=\'%23D4A574\' text-anchor=\'middle\'%3ED%3C/text%3E%3C/svg%3E" style="width: 60px; height: 60px; object-fit: contain;" alt="Dinkum">',
            '#pubgm': '🎮',
            '#ADK': '⚔️',
            '#palm': '🌴',
            '#inzoi': '🐱',
            '#tango': '💃'
        };
        
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadCategories();
        this.loadCategoryIcons(); // 카테고리 아이콘 로드
        this.setupEventListeners();
        this.renderCategoryCheckboxes();
        this.renderCategoryFilterMain(); // 메인 카테고리 필터 렌더링
        this.renderCategoryCards(); // 카테고리 카드 뷰 렌더링
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
    }

    // 데이터 로드 (Firestore → LocalStorage → JSON 파일)
    async loadData() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('glossary', 'terms');
                if (data && data.terms && Array.isArray(data.terms)) {
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
                            this.terms = data.terms.map(term => ({
                                ...term,
                                category: Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []),
                                updatedAt: term.updatedAt || term.createdAt || new Date().toISOString()
                            }));
                            localStorage.setItem('glossaryData', JSON.stringify(this.terms));
                            this.filteredTerms = [...this.terms];
                            this.renderCategoryCards();
                            if (this.currentView === 'terms') {
                                this.renderTerms();
                            }
                        }
                    });
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 데이터 로드 실패, LocalStorage 사용:', error);
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
                this.renderCategoryCards();
            }
        });
        
        // 카테고리 검색 입력 (Enter 키로 검색)
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'categorySearchInput' && e.key === 'Enter') {
                this.renderCategoryCards();
            }
        });
        

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

        // CSV 업로드
        document.getElementById('csvUploadBtn').addEventListener('click', () => {
            document.getElementById('csvUploadInput').click();
        });

        document.getElementById('csvUploadInput').addEventListener('change', (e) => {
            this.handleCsvUpload(e);
        });

        // CSV 다운로드
        document.getElementById('csvDownloadBtn').addEventListener('click', () => {
            this.downloadCsv();
        });
        
        // 선택 항목 삭제 버튼
        const deleteSelectedTermsBtn = document.getElementById('deleteSelectedTermsBtn');
        if (deleteSelectedTermsBtn) {
            deleteSelectedTermsBtn.addEventListener('click', () => {
                this.deleteSelectedTerms();
            });
        }
        
        // 전체 선택 체크박스
        const selectAllGlossaryCheckbox = document.getElementById('selectAllGlossaryCheckbox');
        if (selectAllGlossaryCheckbox) {
            selectAllGlossaryCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAllTerms(e.target.checked);
            });
        }

        // 용어 모달 닫기
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // 용어 모달 외부 클릭 시 닫기
        document.getElementById('termModal').addEventListener('click', (e) => {
            if (e.target.id === 'termModal') {
                this.closeModal();
            }
        });

        // 카테고리 관리 버튼
        document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });

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
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-filter-checkbox">
                <span>${displayName}</span>
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
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-filter-checkbox-main">
                <span>${displayName}</span>
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
    
    // 카테고리 카드 뷰 렌더링
    renderCategoryCards() {
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
        
        // 검색어 가져오기
        const searchInput = document.getElementById('categorySearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let categoryStats = this.getCategoryStats();
        
        // 검색 필터링 (카테고리 이름이 아닌 용어로 검색)
        if (searchTerm) {
            categoryStats = categoryStats.filter(cat => {
                // 해당 카테고리의 용어들에서 검색
                const categoryTerms = this.terms.filter(term => 
                    term.category && term.category.includes(cat.name)
                );
                
                // 부분 일치
                const matchesTerm = categoryTerms.some(term => 
                    (term.korean && term.korean.toLowerCase().includes(searchTerm)) ||
                    (term.japanese && term.japanese.toLowerCase().includes(searchTerm)) ||
                    (term.notes && term.notes.toLowerCase().includes(searchTerm))
                );
                
                // 카테고리 이름도 검색 가능하게
                const displayName = cat.name.replace(/^#/, '').toLowerCase();
                return displayName.includes(searchTerm) || matchesTerm;
            });
        }
        
        if (categoryStats.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>카테고리가 없습니다.</p></div>';
            return;
        }
        
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
            return `
                <div class="category-card" data-category="${safeCategoryName}" style="cursor: pointer;">
                    <div class="category-card-icon">${icon}</div>
                    <div class="category-card-content">
                        <h3 class="category-card-title">${this.escapeHtml(displayName)}</h3>
                        <div class="category-card-stats">
                            <span class="category-word-count">${cat.wordCount} words</span>
                        </div>
                        <div class="category-card-date">Last Updated: ${lastUpdated}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 카테고리별 통계 계산
    getCategoryStats() {
        const stats = {};
        
        // 모든 카테고리에 대해 통계 생성
        this.categories.forEach(category => {
            const categoryTerms = this.terms.filter(term => 
                term.category && term.category.includes(category)
            );
            
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
        this.filterTerms();
        this.showTermListView();
        console.log('용어 목록 뷰로 전환 완료');
    }
    
    // 카테고리 뷰 표시
    showCategoryView() {
        this.currentView = 'categories';
        this.selectedCategory = null;
        document.getElementById('categoryView').style.display = 'block';
        document.getElementById('termListView').style.display = 'none';
        this.renderCategoryCards();
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
        
        this.render();
        console.log('용어 목록 뷰 표시 완료');
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
            label.innerHTML = `
                <input type="checkbox" value="${category}" class="category-checkbox">
                <span>${displayName}</span>
            `;
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
                const categories = term.category && term.category.length > 0 
                    ? term.category.map(cat => `<span class="category-tag">${cat}</span>`).join(' ')
                    : '-';
                const isChecked = this.selectedTermIds.has(term.id);
                const displayNumber = startIndex + index + 1; // 1부터 시작하는 번호
                return `
                <tr>
                    <td>
                        <input type="checkbox" class="term-checkbox" data-id="${term.id}" ${isChecked ? 'checked' : ''} onchange="glossaryManager.toggleTermSelect(${term.id}, this.checked)">
                    </td>
                    <td>${displayNumber}</td>
                    <td><strong>${this.highlight(term.korean)}</strong></td>
                    <td>${this.highlight(term.japanese)}</td>
                    <td>${categories}</td>
                    <td>${term.notes || '-'}</td>
                    <td>
                        <button class="btn btn-edit" onclick="glossaryManager.editTerm(${term.id})">수정</button>
                        <button class="btn btn-danger" onclick="glossaryManager.deleteTerm(${term.id})">삭제</button>
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
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }
        } else {
            title.textContent = '용어 추가';
            form.reset();
            document.getElementById('termId').value = '';
            document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
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
    }

    // 용어 저장
    saveTerm() {
        const id = document.getElementById('termId').value;
        const korean = document.getElementById('koreanInput').value.trim();
        const japanese = document.getElementById('japaneseInput').value.trim();
        const notes = document.getElementById('notesInput').value.trim();
        
        // 선택된 카테고리 가져오기
        const selectedCategories = Array.from(
            document.querySelectorAll('.category-checkbox:checked')
        ).map(cb => cb.value);

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
            
            const item = document.createElement('div');
            item.className = 'category-list-item-integrated';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-weight: 600; min-width: 100px;">${this.escapeHtml(displayName)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 13px; color: #666; min-width: 60px;">아이콘:</label>
                            <div class="icon-preview" style="font-size: 1.5em; min-width: 60px; height: 60px; text-align: center; display: flex; align-items: center; justify-content: center; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                                ${isImage ? currentIcon : currentIcon}
                            </div>
                            <input type="file" 
                                   class="icon-file-input" 
                                   data-category="${this.escapeHtml(category)}" 
                                   accept="image/*"
                                   style="flex: 1; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;"
                                   onchange="glossaryManager.handleIconFileUpload('${this.escapeHtml(category)}', this)">
                            <button type="button" 
                                    class="btn btn-secondary btn-small" 
                                    onclick="glossaryManager.removeCategoryIcon('${this.escapeHtml(category)}')">
                                제거
                            </button>
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
            
            // 로컬 스토리지에 저장
            this.saveCategoryIcons();
            
            // 카테고리 카드 다시 렌더링
            if (this.currentView === 'categories') {
                this.renderCategoryCards();
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
            this.saveCategoryIcons();
            
            // 카테고리 카드 다시 렌더링
            if (this.currentView === 'categories') {
                this.renderCategoryCards();
            }
            
            // 카테고리 목록 다시 렌더링
            this.renderCategoryList();
            
            alert('아이콘이 제거되었습니다.');
        }
    }
    
    // 카테고리 아이콘 로드
    loadCategoryIcons() {
        const savedIcons = localStorage.getItem('categoryIcons');
        if (savedIcons) {
            const loadedIcons = JSON.parse(savedIcons);
            this.categoryIcons = { ...this.categoryIcons, ...loadedIcons };
        }
    }
    
    // 카테고리 아이콘 저장
    saveCategoryIcons() {
        localStorage.setItem('categoryIcons', JSON.stringify(this.categoryIcons));
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
        this.renderCategoryCards(); // 카테고리 카드도 업데이트
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
        this.renderCategoryList();
        this.filterTerms();
    }

    // CSV 업로드 처리
    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length === 0) {
                    alert('CSV 파일이 비어있습니다.');
                    return;
                }

                // 헤더 확인 (첫 번째 줄)
                const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const expectedHeaders = ['번호', '한국어', '日本語', '일본어', '카테고리', '비고'];
                const altHeaders = ['id', 'korean', 'japanese', 'category', 'notes'];
                
                // 헤더 매핑 생성
                const headerMap = {};
                header.forEach((h, i) => {
                    const lowerH = h.toLowerCase();
                    if (expectedHeaders.includes(h) || altHeaders.includes(lowerH) || h === '日本語') {
                        if (h === '번호' || lowerH === 'id') headerMap.id = i;
                        if (h === '한국어' || lowerH === 'korean') headerMap.korean = i;
                        if (h === '일본어' || h === '日本語' || lowerH === 'japanese') headerMap.japanese = i;
                        if (h === '카테고리' || lowerH === 'category') headerMap.category = i;
                        if (h === '비고' || lowerH === 'notes') headerMap.notes = i;
                    }
                });

                if (headerMap.korean === undefined || headerMap.japanese === undefined) {
                    alert('CSV 파일 형식이 올바르지 않습니다.\n필수 컬럼: 한국어, 일본어(日本語)');
                    return;
                }

                // 데이터 파싱
                const newTerms = [];
                let addedCount = 0;
                let skippedCount = 0;

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const values = this.parseCsvLine(line);
                    
                    if (values.length === 0) continue;

                    const korean = values[headerMap.korean]?.trim();
                    const japanese = values[headerMap.japanese]?.trim();
                    
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

                    // 카테고리 파싱 (쉼표 또는 세미콜론으로 구분)
                    let categories = [];
                    if (headerMap.category !== undefined && values[headerMap.category]) {
                        const categoryStr = values[headerMap.category].trim();
                        if (categoryStr) {
                            categories = categoryStr.split(/[,;]/).map(c => c.trim()).filter(Boolean);
                        }
                    }

                    const newId = this.terms.length > 0 
                        ? Math.max(...this.terms.map(t => t.id)) + 1 + addedCount
                        : 1 + addedCount;

                    newTerms.push({
                        id: newId,
                        korean: korean,
                        japanese: japanese,
                        category: categories,
                        notes: headerMap.notes !== undefined ? (values[headerMap.notes]?.trim() || '') : ''
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

                event.target.value = '';
            } catch (error) {
                console.error('CSV 파싱 오류:', error);
                alert('CSV 파일을 읽는 중 오류가 발생했습니다.\n파일 형식을 확인해주세요.');
            }
        };

        reader.onerror = () => {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        };

        reader.readAsText(file, 'UTF-8');
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

    // CSV 다운로드
    downloadCsv() {
        if (this.terms.length === 0) {
            alert('다운로드할 용어가 없습니다.');
            return;
        }

        const headers = ['번호', '한국어', '日本語', '카테고리', '비고'];
        const csvRows = [headers.join(',')];

        this.terms.forEach(term => {
            const row = [
                term.id,
                this.escapeCsvField(term.korean),
                this.escapeCsvField(term.japanese),
                this.escapeCsvField((term.category || []).join(', ')),
                this.escapeCsvField(term.notes || '')
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `glossary_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // CSV 필드 이스케이프
    escapeCsvField(field) {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
    
    // 용어 선택/해제
    toggleTermSelect(termId, checked) {
        if (checked) {
            this.selectedTermIds.add(termId);
        } else {
            this.selectedTermIds.delete(termId);
        }
        this.updateSelectAllGlossaryCheckbox();
        this.updateDeleteSelectedButton();
    }
    
    // 전체 선택/해제
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
        const deleteBtn = document.getElementById('deleteSelectedTermsBtn');
        if (!deleteBtn) return;
        
        if (this.selectedTermIds.size > 0) {
            deleteBtn.style.display = 'inline-block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }
    
    // 선택된 용어 삭제
    deleteSelectedTerms() {
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
            this.render();
            this.updateDeleteSelectedButton();
            this.updateSelectAllGlossaryCheckbox();
        }
    }
}

// 페이지 로드 시 초기화
let glossaryManager;
document.addEventListener('DOMContentLoaded', () => {
    glossaryManager = new GlossaryManager();
});
