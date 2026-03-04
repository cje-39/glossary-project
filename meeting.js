// 회의 기록 관리 클래스
class MeetingManager {
    constructor() {
        this.meetings = [];
        this.categories = [];
        this.assignees = [];
        this.selectedCategoryFilter = null;
        this.editingId = null;
        this.viewingId = null;
        this.dateSortOrder = 'desc'; // 'asc' or 'desc' - 기본값은 최신순
        this.searchQuery = ''; // 검색어
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadAssignees();
        await this.loadMeetings();
        this.setupEventListeners();
        this.renderCategoryFilter();
        this.renderMeetings();
        
        // LocalStorage 변경 감지 (다른 탭에서 변경된 경우)
        window.addEventListener('storage', (e) => {
            if (e.key === 'glossaryCategories') {
                try {
                    this.categories = JSON.parse(e.newValue || '[]');
                    this.renderCategoryFilter();
                    this.populateCategoryOptions();
                    if (document.getElementById('categoryList')) {
                        this.renderCategoryList();
                    }
                } catch (error) {
                    console.error('카테고리 동기화 실패:', error);
                }
            }
        });
    }

    setupEventListeners() {
        // 새 회의 기록 버튼
        const newMeetingBtn = document.getElementById('newMeetingBtn');
        if (newMeetingBtn) {
            newMeetingBtn.addEventListener('click', () => {
                this.openNewMeetingModal();
            });
        }

        // 모달 닫기
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        if (closeModal) closeModal.addEventListener('click', () => this.closeMeetingModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeMeetingModal());

        // 상세보기 모달 닫기
        const closeDetailModal = document.getElementById('closeDetailModal');
        const closeDetailBtn = document.getElementById('closeDetailBtn');
        if (closeDetailModal) closeDetailModal.addEventListener('click', () => this.closeDetailModal());
        if (closeDetailBtn) closeDetailBtn.addEventListener('click', () => this.closeDetailModal());

        // 수정 버튼
        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.viewingId) {
                    const id = this.viewingId;
                    this.closeDetailModal();
                    // 모달이 완전히 닫힌 후 수정 모달 열기
                    setTimeout(() => {
                        this.openEditModal(id);
                    }, 100);
                }
            });
        }

        // 삭제 버튼
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (this.viewingId) {
                    this.deleteMeeting(this.viewingId);
                }
            });
        }

        // 폼 제출
        const meetingForm = document.getElementById('meetingForm');
        if (meetingForm) {
            meetingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMeeting();
            });
        }

        // 모달 외부 클릭 시 닫기
        const meetingModal = document.getElementById('meetingModal');
        const detailModal = document.getElementById('meetingDetailModal');
        if (meetingModal) {
            meetingModal.addEventListener('click', (e) => {
                if (e.target === meetingModal) {
                    this.closeMeetingModal();
                }
            });
        }
        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal) {
                    this.closeDetailModal();
                }
            });
        }

        // 검색 입력
        const searchInput = document.getElementById('meetingSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // 실시간 검색은 유지하되, 하이라이트를 위해 검색어 저장
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.renderMeetings();
            });
        }

        // 검색 버튼
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // 카테고리 관리 버튼
        const manageCategoryBtn = document.getElementById('manageCategoryBtn');
        if (manageCategoryBtn) {
            manageCategoryBtn.addEventListener('click', () => {
                this.openCategoryModal();
            });
        }

        // 카테고리 모달 닫기
        const closeCategoryModal = document.getElementById('closeCategoryModal');
        const closeCategoryBtn = document.getElementById('closeCategoryBtn');
        if (closeCategoryModal) {
            closeCategoryModal.addEventListener('click', () => this.closeCategoryModal());
        }
        if (closeCategoryBtn) {
            closeCategoryBtn.addEventListener('click', () => this.closeCategoryModal());
        }

        // 카테고리 모달 외부 클릭 시 닫기
        const categoryModal = document.getElementById('categoryModal');
        if (categoryModal) {
            categoryModal.addEventListener('click', (e) => {
                if (e.target === categoryModal) {
                    this.closeCategoryModal();
                }
            });
        }

        // 카테고리 추가 버튼
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                this.addCategory();
            });
        }

        // 카테고리 입력 필드에서 Enter 키 처리
        const newCategoryInput = document.getElementById('newCategoryInput');
        if (newCategoryInput) {
            newCategoryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCategory();
                }
            });
        }

    }

    // 검색 실행
    performSearch() {
        const searchInput = document.getElementById('meetingSearchInput');
        if (searchInput) {
            this.searchQuery = searchInput.value.trim().toLowerCase();
            this.renderMeetings();
        }
    }

    // 검색어 하이라이트 함수
    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedSearchTerm = this.escapeHtml(searchTerm);
        
        // 대소문자 구분 없이 검색어 하이라이트
        const regex = new RegExp(`(${escapedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapedText.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>');
    }

    // 카테고리 로드 (Glossary와 동일한 소스 사용)
    async loadCategories() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('glossary', 'categories');
                if (data && data.categories) {
                    this.categories = data.categories;
                    console.log('✅ Firestore에서 카테고리 로드 완료:', this.categories);
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('glossaryCategories', JSON.stringify(this.categories));
                    
                    // 실시간 동기화 리스너 설정
                    FirestoreHelper.onSnapshot('glossary', 'categories', (data) => {
                        if (data && data.categories) {
                            console.log('🔄 Firestore 카테고리 실시간 업데이트:', data.categories);
                            this.categories = data.categories;
                            localStorage.setItem('glossaryCategories', JSON.stringify(this.categories));
                            this.renderCategoryFilter();
                            this.populateCategoryOptions();
                            if (document.getElementById('categoryList')) {
                                this.renderCategoryList();
                            }
                        }
                    });
                    return;
                } else {
                    console.log('ℹ️ Firestore에 카테고리 데이터가 없습니다. LocalStorage 사용.');
                }
            } else {
                console.warn('⚠️ FirestoreHelper를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.log('Firestore에서 카테고리 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드 (Glossary와 동일한 키 사용)
        const savedCategories = localStorage.getItem('glossaryCategories');
        if (savedCategories) {
            this.categories = JSON.parse(savedCategories);
        } else {
            // 기본 카테고리
            this.categories = ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'];
            this.saveCategories();
        }
    }

    // 카테고리 저장 (Glossary와 동기화)
    async saveCategories() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('glossaryCategories', JSON.stringify(this.categories));
        console.log('카테고리 LocalStorage 저장 완료:', this.categories);
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('glossary', 'categories', {
                    categories: this.categories
                });
                console.log('✅ 카테고리 Firestore 저장 완료:', this.categories);
            } else {
                console.warn('⚠️ FirestoreHelper를 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ Firestore에 카테고리 저장 실패:', error);
            alert('Firebase에 카테고리 저장에 실패했습니다. 콘솔을 확인해주세요.');
        }
        
        // 다른 페이지에 변경 알림 (storage 이벤트는 같은 탭에서는 발생하지 않으므로 직접 호출)
        if (window.glossaryManager && window.glossaryManager.categories) {
            window.glossaryManager.categories = [...this.categories];
            if (window.glossaryManager.renderCategoryFilter) {
                window.glossaryManager.renderCategoryFilter();
            }
            if (window.glossaryManager.renderCategoryList) {
                window.glossaryManager.renderCategoryList();
            }
            if (window.glossaryManager.renderCategoryCheckboxes) {
                window.glossaryManager.renderCategoryCheckboxes();
            }
        }
        
        // 현재 페이지 업데이트
        this.renderCategoryFilter();
        this.populateCategoryOptions();
        if (document.getElementById('categoryList')) {
            this.renderCategoryList();
        }
    }
    
    // 카테고리 색상 가져오기 (GlossaryManager에서)
    getCategoryColor(category) {
        if (window.glossaryManager && window.glossaryManager.categoryColors) {
            return window.glossaryManager.categoryColors[category] || '#6c757d';
        }
        // 기본 색상
        const defaultColors = {
            '#dinkum': '#D4A574',
            '#pubgm': '#4CAF50',
            '#ADK': '#2196F3',
            '#palm': '#FF9800',
            '#inzoi': '#9C27B0',
            '#tango': '#E91E63'
        };
        return defaultColors[category] || '#6c757d';
    }

    // 담당자 목록 로드
    async loadAssignees() {
        try {
            // Discussion의 작성자 목록 사용 (또는 별도 관리)
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('discussion', 'authors');
                if (data && data.authors) {
                    this.assignees = data.authors;
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 담당자 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedAssignees = localStorage.getItem('discussionAuthors');
        if (savedAssignees) {
            this.assignees = JSON.parse(savedAssignees);
        } else {
            // 기본 담당자 목록
            this.assignees = [];
        }
    }

    // 회의 기록 로드
    async loadMeetings() {
        try {
            const savedData = localStorage.getItem('meetingRecords');
            if (savedData) {
                this.meetings = JSON.parse(savedData);
                // 날짜 기준으로 정렬 (최신순)
                this.meetings.sort((a, b) => {
                    const dateA = new Date(a.dateTime || a.createdAt);
                    const dateB = new Date(b.dateTime || b.createdAt);
                    return dateB - dateA;
                });
            } else {
                this.meetings = [];
            }
        } catch (error) {
            console.error('회의 기록 로드 실패:', error);
            this.meetings = [];
        }
    }

    // 회의 기록 저장
    async saveMeetings() {
        try {
            localStorage.setItem('meetingRecords', JSON.stringify(this.meetings));
        } catch (error) {
            console.error('회의 기록 저장 실패:', error);
            alert('회의 기록 저장에 실패했습니다.');
        }
    }

    // 카테고리 필터 렌더링
    renderCategoryFilter() {
        const filterSection = document.getElementById('categoryFilterSection');
        const filterContainer = document.getElementById('categoryFilterContainer');
        if (!filterSection || !filterContainer) return;

        if (this.categories.length === 0) {
            filterSection.style.display = 'none';
            return;
        }

        filterSection.style.display = 'block';
        filterContainer.innerHTML = '';

        // 전체 옵션
        const allLabel = document.createElement('label');
        allLabel.className = 'category-filter-label';
        allLabel.style.cssText = 'cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: background-color 0.2s; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; margin-right: 8px;';
        
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.className = 'category-filter-checkbox';
        allCheckbox.checked = this.selectedCategoryFilter === null;
        allCheckbox.addEventListener('change', () => {
            if (allCheckbox.checked) {
                this.selectedCategoryFilter = null;
                this.renderCategoryFilter();
                this.renderMeetings();
            }
        });
        
        allLabel.appendChild(allCheckbox);
        allLabel.appendChild(document.createTextNode('전체'));
        filterContainer.appendChild(allLabel);

        // 카테고리별 필터
        this.categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'category-filter-label';
            const categoryColor = this.getCategoryColor(category);
            label.style.cssText = 'cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: background-color 0.2s; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; margin-right: 8px;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'category-filter-checkbox';
            checkbox.checked = this.selectedCategoryFilter === category;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedCategoryFilter = category;
                    this.renderCategoryFilter();
                    this.renderMeetings();
                }
            });
            
            const categoryText = document.createElement('span');
            categoryText.className = 'meeting-tag';
            categoryText.style.cssText = `display: inline-block; padding: 4px 8px; background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; border-radius: 4px; color: ${categoryColor}; font-size: 0.85em; font-weight: 600; margin-right: 6px;`;
            categoryText.textContent = category.replace(/^#/, '');
            
            label.appendChild(checkbox);
            label.appendChild(categoryText);
            filterContainer.appendChild(label);
        });
    }

    // 회의 기록 목록 렌더링
    renderMeetings() {
        const meetingList = document.getElementById('meetingList');
        if (!meetingList) return;

        // 필터링
        let filteredMeetings = this.meetings;
        
        // 카테고리 필터
        if (this.selectedCategoryFilter) {
            filteredMeetings = filteredMeetings.filter(meeting => 
                meeting.category === this.selectedCategoryFilter
            );
        }
        
        // 검색어 필터
        if (this.searchQuery) {
            filteredMeetings = filteredMeetings.filter(meeting => {
                const title = (meeting.title || '').toLowerCase();
                const content = (meeting.content || '').toLowerCase();
                const notes = (meeting.notes || '').toLowerCase();
                const assignee = Array.isArray(meeting.assignee) 
                    ? meeting.assignee.join(' ').toLowerCase()
                    : (meeting.assignee || '').toLowerCase();
                const attendees = Array.isArray(meeting.attendees)
                    ? meeting.attendees.join(' ').toLowerCase()
                    : (meeting.attendees || '').toLowerCase();
                
                return title.includes(this.searchQuery) ||
                       content.includes(this.searchQuery) ||
                       notes.includes(this.searchQuery) ||
                       assignee.includes(this.searchQuery) ||
                       attendees.includes(this.searchQuery);
            });
        }

        // 날짜 정렬
        filteredMeetings = [...filteredMeetings].sort((a, b) => {
            const dateA = new Date(a.dateTime || a.createdAt);
            const dateB = new Date(b.dateTime || b.createdAt);
            return this.dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        if (filteredMeetings.length === 0) {
            let emptyMessage = '아직 등록된 회의 기록이 없습니다.';
            if (this.selectedCategoryFilter) {
                emptyMessage = '선택한 카테고리의 회의 기록이 없습니다.';
            } else if (this.searchQuery) {
                emptyMessage = `"${this.searchQuery}"에 대한 검색 결과가 없습니다.`;
            }
            
            meetingList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>${emptyMessage}</p>
                    ${!this.searchQuery && !this.selectedCategoryFilter ? '<p style="margin-top: 10px; font-size: 0.9em;">새 회의 기록 버튼을 클릭하여 첫 회의를 등록하세요.</p>' : ''}
                </div>
            `;
            return;
        }

        // 날짜 정렬 아이콘
        const sortIcon = this.dateSortOrder === 'asc' ? '▲' : '▼';
        
        // 정렬 헤더
        let html = `
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${this.searchQuery ? `<span style="color: #666; font-size: 0.9em;">검색 결과: <strong>${filteredMeetings.length}</strong>개</span>` : ''}
                    <span style="color: #666; font-size: 0.9em;">정렬:</span>
                    <span style="color: #333; font-weight: 600; cursor: pointer; user-select: none; padding: 6px 12px; border-radius: 4px; background: #f8f9fa; transition: background 0.2s;" 
                          onclick="window.meetingManager && window.meetingManager.toggleDateSort()"
                          onmouseover="this.style.background='#e9ecef'"
                          onmouseout="this.style.background='#f8f9fa'">
                        날짜 ${sortIcon}
                    </span>
                </div>
            </div>
        `;

        filteredMeetings.forEach(meeting => {
            const dateTime = new Date(meeting.dateTime);
            const formattedDate = dateTime.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // 참석자 표시
            let attendeesHtml = '없음';
            if (meeting.attendees && meeting.attendees.length > 0) {
                attendeesHtml = meeting.attendees.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('');
            }

            const categoryColor = this.getCategoryColor(meeting.category);
            const categoryDisplayName = meeting.category ? meeting.category.replace(/^#/, '') : '';
            
            // 담당자 표시
            let assigneeHtml = '-';
            if (Array.isArray(meeting.assignee) && meeting.assignee.length > 0) {
                assigneeHtml = meeting.assignee.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('');
            } else if (meeting.assignee) {
                assigneeHtml = `<span class="meeting-tag">${this.escapeHtml(meeting.assignee)}</span>`;
            }
            
            // 검색어 하이라이트 적용
            const highlightedTitle = this.searchQuery 
                ? this.highlightSearchTerm(meeting.title, this.searchQuery)
                : this.escapeHtml(meeting.title);
            
            const highlightedContent = this.searchQuery 
                ? this.highlightSearchTerm((meeting.content || '-').trimStart(), this.searchQuery)
                : this.escapeHtml((meeting.content || '-').trimStart());
            
            const highlightedNotes = this.searchQuery && meeting.notes
                ? this.highlightSearchTerm(meeting.notes.trimStart(), this.searchQuery)
                : (meeting.notes ? this.escapeHtml(meeting.notes.trimStart()) : '');
            
            // 담당자와 참석자도 하이라이트
            let highlightedAssigneeHtml = assigneeHtml;
            if (this.searchQuery && meeting.assignee) {
                if (Array.isArray(meeting.assignee)) {
                    highlightedAssigneeHtml = meeting.assignee.map(a => {
                        const highlighted = this.highlightSearchTerm(a, this.searchQuery);
                        return `<span class="meeting-tag">${highlighted}</span>`;
                    }).join('');
                } else {
                    const highlighted = this.highlightSearchTerm(meeting.assignee, this.searchQuery);
                    highlightedAssigneeHtml = `<span class="meeting-tag">${highlighted}</span>`;
                }
            }
            
            let highlightedAttendeesHtml = attendeesHtml;
            if (this.searchQuery && meeting.attendees && meeting.attendees.length > 0) {
                highlightedAttendeesHtml = meeting.attendees.map(a => {
                    const highlighted = this.highlightSearchTerm(a, this.searchQuery);
                    return `<span class="meeting-tag">${highlighted}</span>`;
                }).join('');
            } else if (this.searchQuery && attendeesHtml === '없음') {
                highlightedAttendeesHtml = '없음';
            }
            
            html += `
                <div class="meeting-item" onclick="window.meetingManager && window.meetingManager.viewMeeting('${meeting.id}')">
                    <div class="meeting-item-header">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <span class="meeting-tag" style="background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; color: ${categoryColor}; font-weight: 600;">
                                ${this.escapeHtml(categoryDisplayName)}
                            </span>
                            <h3 class="meeting-item-title">${highlightedTitle}</h3>
                        </div>
                        <div class="meeting-item-meta">
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div style="margin-top: 12px; margin-bottom: 8px; display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.9em; color: #666;">
                        <div><strong>담당자:</strong> ${highlightedAssigneeHtml}</div>
                        <div><strong>참석자:</strong> ${highlightedAttendeesHtml}</div>
                    </div>
                    <div style="margin-top: 12px;">
                        <strong style="color: #333; display: block; margin-bottom: 4px;">논의 내용:</strong>
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0 4px; white-space: pre-wrap; line-height: 1.3; display: block; width: 100%; color: #333; text-indent: 0 !important; margin: 0; padding-left: 4px !important;">
                            <span style="display: block; text-indent: 0; margin: 0; padding: 0;">${highlightedContent}</span>
                        </div>
                    </div>
                    ${meeting.notes ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #333; display: block; margin-bottom: 4px;">참고 사항:</strong>
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0 4px; white-space: pre-wrap; line-height: 1.3; display: block; width: 100%; color: #666; text-indent: 0 !important; margin: 0; padding-left: 4px !important;">
                            <span style="display: block; text-indent: 0; margin: 0; padding: 0;">${highlightedNotes}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        meetingList.innerHTML = html;
    }
    
    // 날짜 정렬 토글
    toggleDateSort() {
        this.dateSortOrder = this.dateSortOrder === 'asc' ? 'desc' : 'asc';
        this.renderMeetings();
    }

    // 새 회의 기록 모달 열기
    openNewMeetingModal() {
        this.editingId = null;
        const modal = document.getElementById('meetingModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('meetingForm');

        if (modalTitle) modalTitle.textContent = '새 회의 기록';
        if (form) form.reset();

        // 현재 날짜/시간으로 기본값 설정
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const dateTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        const dateTimeInput = document.getElementById('meetingDateTime');
        if (dateTimeInput) dateTimeInput.value = dateTimeValue;

        // 카테고리 옵션 채우기
        this.populateCategoryOptions();
        // 담당자 옵션 채우기
        this.populateAssigneeOptions();

        // 삭제 버튼 숨김
        const deleteBtn = document.getElementById('deleteMeetingBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        if (modal) modal.classList.add('active');
    }

    // 수정 모달 열기
    openEditModal(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        this.editingId = id;
        const modal = document.getElementById('meetingModal');
        const modalTitle = document.getElementById('modalTitle');

        if (modalTitle) modalTitle.textContent = '회의 기록 수정';

        // 폼에 데이터 채우기
        const dateTime = new Date(meeting.dateTime);
        const year = dateTime.getFullYear();
        const month = String(dateTime.getMonth() + 1).padStart(2, '0');
        const day = String(dateTime.getDate()).padStart(2, '0');
        const hours = String(dateTime.getHours()).padStart(2, '0');
        const minutes = String(dateTime.getMinutes()).padStart(2, '0');
        const dateTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`;

        document.getElementById('meetingDateTime').value = dateTimeValue;
        document.getElementById('meetingCategory').value = meeting.category || '';
        document.getElementById('meetingTitle').value = meeting.title || '';
        document.getElementById('meetingContent').value = meeting.content || '';
        document.getElementById('meetingNotes').value = meeting.notes || '';

        // 담당자 체크박스 선택
        const assigneeCheckboxes = document.querySelectorAll('#meetingAssigneeCheckboxes input[type="checkbox"]');
        assigneeCheckboxes.forEach(checkbox => {
            if (Array.isArray(meeting.assignee)) {
                checkbox.checked = meeting.assignee.includes(checkbox.value);
            } else if (meeting.assignee) {
                checkbox.checked = checkbox.value === meeting.assignee;
            }
            
            // 체크 상태에 따른 스타일 적용
            if (checkbox.checked) {
                const label = checkbox.closest('label');
                if (label) {
                    label.style.background = '#e8f0fe';
                    label.style.borderColor = '#2b68dc';
                }
            }
        });

        // 참석자 입력 (텍스트)
        const attendeesInput = document.getElementById('meetingAttendees');
        if (attendeesInput && meeting.attendees) {
            if (Array.isArray(meeting.attendees)) {
                attendeesInput.value = meeting.attendees.join(', ');
            } else if (typeof meeting.attendees === 'string') {
                attendeesInput.value = meeting.attendees;
            }
        }

        // 옵션 채우기
        this.populateCategoryOptions();
        this.populateAssigneeOptions();

        // 삭제 버튼 표시
        const deleteBtn = document.getElementById('deleteMeetingBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = () => {
                if (confirm('정말로 이 회의 기록을 삭제하시겠습니까?')) {
                    this.deleteMeeting(id);
                    this.closeMeetingModal();
                }
            };
        }

        if (modal) modal.classList.add('active');
    }

    // 카테고리 옵션 채우기
    populateCategoryOptions() {
        const categorySelect = document.getElementById('meetingCategory');
        if (!categorySelect) return;

        categorySelect.innerHTML = '<option value="">선택하세요</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.replace(/^#/, '');
            categorySelect.appendChild(option);
        });
    }

    // 담당자 체크박스 채우기
    populateAssigneeOptions() {
        const assigneeContainer = document.getElementById('meetingAssigneeCheckboxes');
        if (!assigneeContainer) return;

        assigneeContainer.innerHTML = '';

        if (this.assignees.length === 0) {
            assigneeContainer.innerHTML = '<div style="color: #999; padding: 10px;">담당자 목록이 없습니다. Discussion 페이지에서 작성자를 추가해주세요.</div>';
            return;
        }

        this.assignees.forEach(assignee => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 12px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; transition: all 0.2s; user-select: none;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = assignee;
            checkbox.id = `assignee_${assignee}`;
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #2b68dc;';
            
            const span = document.createElement('span');
            span.textContent = assignee;
            span.style.cssText = 'font-size: 14px; color: #333;';
            
            label.appendChild(checkbox);
            label.appendChild(span);
            
            // 호버 효과
            label.addEventListener('mouseenter', () => {
                if (!checkbox.checked) {
                    label.style.background = '#f0f0f0';
                    label.style.borderColor = '#2b68dc';
                }
            });
            label.addEventListener('mouseleave', () => {
                if (!checkbox.checked) {
                    label.style.background = '#f8f9fa';
                    label.style.borderColor = '#e0e0e0';
                }
            });
            
            // 체크 상태에 따른 스타일 변경
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.style.background = '#e8f0fe';
                    label.style.borderColor = '#2b68dc';
                } else {
                    label.style.background = '#f8f9fa';
                    label.style.borderColor = '#e0e0e0';
                }
            });
            
            assigneeContainer.appendChild(label);
        });
    }


    // 회의 기록 저장
    async saveMeeting() {
        const dateTime = document.getElementById('meetingDateTime').value;
        const category = document.getElementById('meetingCategory').value;
        const assigneeCheckboxes = document.querySelectorAll('#meetingAssigneeCheckboxes input[type="checkbox"]:checked');
        const assignees = Array.from(assigneeCheckboxes).map(cb => cb.value);
        const title = document.getElementById('meetingTitle').value;
        const content = document.getElementById('meetingContent').value;
        const notes = document.getElementById('meetingNotes').value;
        const attendeesInput = document.getElementById('meetingAttendees').value;
        
        // 참석자 텍스트를 배열로 변환 (쉼표로 구분)
        const attendees = attendeesInput
            ? attendeesInput.split(',').map(a => a.trim()).filter(a => a)
            : [];
        
        if (!dateTime || !category || assignees.length === 0 || !title || !content) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        const meetingData = {
            id: this.editingId || Date.now().toString(),
            dateTime: dateTime,
            category: category,
            assignee: assignees, // 배열로 저장
            title: title,
            content: content,
            notes: notes || '',
            attendees: attendees,
            createdAt: this.editingId 
                ? this.meetings.find(m => m.id === this.editingId).createdAt 
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingId) {
            // 수정
            const index = this.meetings.findIndex(m => m.id === this.editingId);
            if (index !== -1) {
                this.meetings[index] = meetingData;
            }
        } else {
            // 새로 추가
            this.meetings.unshift(meetingData);
        }

        // 날짜 기준으로 정렬 (최신순)
        this.meetings.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateB - dateA;
        });

        await this.saveMeetings();
        this.closeMeetingModal();
        this.renderMeetings();
    }

    // 회의 기록 상세보기
    viewMeeting(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        this.viewingId = id;
        const modal = document.getElementById('meetingDetailModal');
        const detailTitle = document.getElementById('detailTitle');
        const detailContent = document.getElementById('meetingDetailContent');

        if (detailTitle) detailTitle.textContent = meeting.title;

        const dateTime = new Date(meeting.dateTime);
        const formattedDate = dateTime.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 참석자 표시 (텍스트만)
        const attendeesHtml = meeting.attendees && meeting.attendees.length > 0
            ? meeting.attendees.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('')
            : '없음';

        const categoryColor = this.getCategoryColor(meeting.category);
        const categoryDisplayName = meeting.category ? meeting.category.replace(/^#/, '') : '';
        
        if (detailContent) {
            detailContent.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <div style="margin-bottom: 10px;"><strong>일시:</strong> ${formattedDate}</div>
                    <div style="margin-bottom: 10px;"><strong>카테고리:</strong> 
                        <span class="meeting-tag" style="background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; color: ${categoryColor}; font-weight: 600;">
                            ${this.escapeHtml(categoryDisplayName)}
                        </span>
                    </div>
                    <div style="margin-bottom: 10px;"><strong>담당자:</strong> ${Array.isArray(meeting.assignee) ? meeting.assignee.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('') : `<span class="meeting-tag">${this.escapeHtml(meeting.assignee)}</span>`}</div>
                    <div style="margin-bottom: 10px;"><strong>참석자:</strong> ${attendeesHtml}</div>
                </div>
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1em; margin-bottom: 10px;">논의 내용</h3>
                    <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${this.escapeHtml(meeting.content)}</div>
                </div>
                ${meeting.notes ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1em; margin-bottom: 10px;">참고 사항</h3>
                    <div style="white-space: pre-wrap; line-height: 1.6; color: #666;">${this.escapeHtml(meeting.notes)}</div>
                </div>
                ` : ''}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 0.9em; color: #999;">
                    <div>작성일: ${new Date(meeting.createdAt).toLocaleString('ko-KR')}</div>
                    ${meeting.updatedAt !== meeting.createdAt ? `<div>수정일: ${new Date(meeting.updatedAt).toLocaleString('ko-KR')}</div>` : ''}
                </div>
            `;
        }

        if (modal) modal.classList.add('active');
    }

    // 회의 기록 삭제
    deleteMeeting(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        if (!confirm(`"${meeting.title}" 회의 기록을 삭제하시겠습니까?`)) {
            return;
        }

        this.meetings = this.meetings.filter(m => m.id !== id);
        this.saveMeetings();
        this.closeDetailModal();
        this.renderMeetings();
    }

    // 모달 닫기
    closeMeetingModal() {
        const modal = document.getElementById('meetingModal');
        if (modal) modal.classList.remove('active');
        this.editingId = null;
    }

    // 상세보기 모달 닫기
    closeDetailModal() {
        const modal = document.getElementById('meetingDetailModal');
        if (modal) modal.classList.remove('active');
        this.viewingId = null;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 카테고리 모달 열기
    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (!modal) {
            console.error('categoryModal을 찾을 수 없습니다.');
            return;
        }
        this.renderCategoryList();
        modal.classList.add('active');
    }

    // 카테고리 모달 닫기
    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // 카테고리 목록 렌더링
    renderCategoryList() {
        const container = document.getElementById('categoryList');
        if (!container) return;
        container.innerHTML = '';
        
        if (this.categories.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">카테고리가 없습니다.</div>';
            return;
        }
        
        this.categories.forEach((category, index) => {
            const displayName = category.replace(/^#/, '');
            const categoryColor = this.getCategoryColor(category);
            
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <span class="meeting-tag" style="background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; color: ${categoryColor}; font-weight: 600;">
                        ${this.escapeHtml(displayName)}
                    </span>
                    <span style="color: #666; font-size: 0.9em;">${this.escapeHtml(category)}</span>
                </div>
                <button type="button" class="btn btn-danger" style="padding: 6px 12px; font-size: 13px;" onclick="window.meetingManager && window.meetingManager.deleteCategory(${index})">삭제</button>
            `;
            container.appendChild(item);
        });
    }

    // 카테고리 추가
    async addCategory() {
        const input = document.getElementById('newCategoryInput');
        if (!input) return;
        
        const newCategory = input.value.trim();
        
        if (!newCategory) {
            alert('카테고리를 입력해주세요.');
            return;
        }
        
        // #로 시작하지 않으면 추가
        const formattedCategory = newCategory.startsWith('#') ? newCategory : '#' + newCategory;
        
        if (this.categories.includes(formattedCategory)) {
            alert('이미 존재하는 카테고리입니다.');
            return;
        }
        
        this.categories.push(formattedCategory);
        await this.saveCategories();
        input.value = '';
        console.log(`카테고리 "${formattedCategory}" 추가 완료`);
    }

    // 카테고리 삭제
    async deleteCategory(index) {
        const category = this.categories[index];
        if (!category) return;
        
        // 해당 카테고리를 사용하는 회의 기록이 있는지 확인
        const meetingsUsingCategory = this.meetings.filter(meeting => 
            meeting.category === category
        );
        
        if (meetingsUsingCategory.length > 0) {
            if (!confirm(`"${category}" 카테고리를 사용하는 회의 기록이 ${meetingsUsingCategory.length}개 있습니다.\n정말 삭제하시겠습니까?`)) {
                return;
            }
            
            // 회의 기록에서 해당 카테고리 제거 (또는 기본값으로 변경)
            this.meetings.forEach(meeting => {
                if (meeting.category === category) {
                    // 첫 번째 사용 가능한 카테고리로 변경하거나 빈 값으로 설정
                    meeting.category = this.categories.find(cat => cat !== category) || '';
                }
            });
            this.saveMeetings();
        }
        
        this.categories.splice(index, 1);
        await this.saveCategories();
        console.log(`카테고리 "${category}" 삭제 완료`);
    }

}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.meetingManager = new MeetingManager();
});
