// 회의 기록 관리 클래스
class MeetingManager {
    constructor() {
        this.meetings = [];
        this.categories = [];
        this.assignees = [];
        this.selectedCategoryFilter = null;
        this.editingId = null;
        this.viewingId = null;
        this.currentAttendeesImage = null; // 현재 편집 중인 참석자 이미지
        this.dateSortOrder = 'desc'; // 'asc' or 'desc' - 기본값은 최신순
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadAssignees();
        await this.loadMeetings();
        this.setupEventListeners();
        this.renderCategoryFilter();
        this.renderMeetings();
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
            editBtn.addEventListener('click', () => {
                if (this.viewingId) {
                    this.closeDetailModal();
                    this.openEditModal(this.viewingId);
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
        
        // 클립보드 붙여넣기 이벤트 (참석자 이미지)
        document.addEventListener('paste', (e) => {
            this.handleAttendeesPaste(e);
        });
    }
    
    // 참석자 이미지 드래그 오버
    handleAttendeesImageDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('attendeesImageDropZone');
        if (dropZone) {
            dropZone.style.borderColor = '#2b68dc';
            dropZone.style.background = '#f0f4ff';
        }
    }
    
    // 참석자 이미지 드래그 리브
    handleAttendeesImageDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('attendeesImageDropZone');
        if (dropZone) {
            dropZone.style.borderColor = '#e0e0e0';
            dropZone.style.background = '#fafafa';
        }
    }
    
    // 참석자 이미지 드롭
    handleAttendeesImageDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('attendeesImageDropZone');
        if (dropZone) {
            dropZone.style.borderColor = '#e0e0e0';
            dropZone.style.background = '#fafafa';
        }
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                this.processAttendeesImage(file);
            } else {
                alert('이미지 파일만 업로드 가능합니다.');
            }
        }
    }
    
    // 참석자 이미지 파일 선택
    handleAttendeesImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processAttendeesImage(file);
        }
    }
    
    // 참석자 이미지 처리
    processAttendeesImage(file) {
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
            const imageData = e.target.result;
            this.currentAttendeesImage = imageData;
            this.updateAttendeesImagePreview(imageData);
        };
        reader.onerror = () => {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsDataURL(file);
    }
    
    // 참석자 이미지 미리보기 업데이트
    updateAttendeesImagePreview(imageData) {
        const preview = document.getElementById('attendeesImagePreview');
        const placeholder = document.getElementById('attendeesImagePlaceholder');
        const previewImg = document.getElementById('attendeesImagePreviewImg');
        
        if (preview && placeholder && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
    }
    
    // 참석자 이미지 제거
    removeAttendeesImage() {
        this.currentAttendeesImage = null;
        const preview = document.getElementById('attendeesImagePreview');
        const placeholder = document.getElementById('attendeesImagePlaceholder');
        
        if (preview && placeholder) {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        }
        
        const fileInput = document.getElementById('attendeesImageInput');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    // 클립보드 붙여넣기 처리 (참석자 이미지)
    handleAttendeesPaste(e) {
        // 모달이 열려있고 참석자 입력 영역에 포커스가 있을 때만 처리
        const modal = document.getElementById('meetingModal');
        if (!modal || !modal.classList.contains('active')) {
            return;
        }
        
        const attendeesInput = document.getElementById('meetingAttendees');
        const dropZone = document.getElementById('attendeesImageDropZone');
        
        // 참석자 입력 필드나 드롭존에 포커스가 있을 때만 처리
        if (!document.activeElement || 
            (document.activeElement !== attendeesInput && 
             !dropZone.contains(document.activeElement) &&
             document.activeElement.tagName !== 'BODY')) {
            return;
        }
        
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                this.processAttendeesImage(blob);
                break;
            }
        }
    }

    // 카테고리 로드 (Glossary와 동일한 소스 사용)
    async loadCategories() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('glossary', 'categories');
                if (data && data.categories) {
                    this.categories = data.categories;
                    return;
                }
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
        if (this.selectedCategoryFilter) {
            filteredMeetings = this.meetings.filter(meeting => 
                meeting.category === this.selectedCategoryFilter
            );
        }

        // 날짜 정렬
        filteredMeetings = [...filteredMeetings].sort((a, b) => {
            const dateA = new Date(a.dateTime || a.createdAt);
            const dateB = new Date(b.dateTime || b.createdAt);
            return this.dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        if (filteredMeetings.length === 0) {
            meetingList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>${this.selectedCategoryFilter ? '선택한 카테고리의 회의 기록이 없습니다.' : '아직 등록된 회의 기록이 없습니다.'}</p>
                    <p style="margin-top: 10px; font-size: 0.9em;">새 회의 기록 버튼을 클릭하여 첫 회의를 등록하세요.</p>
                </div>
            `;
            return;
        }

        // 테이블 헤더
        const sortIcon = this.dateSortOrder === 'asc' ? '▲' : '▼';
        let html = `
            <table class="meeting-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; cursor: pointer; user-select: none; position: relative;" 
                            onclick="window.meetingManager && window.meetingManager.toggleDateSort()">
                            날짜 <span style="color: #999; font-size: 0.8em; margin-left: 4px;">${sortIcon}</span>
                        </th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">회의명</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">참석자</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">논의 내용</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">참고 사항</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #333; width: 120px;">관리</th>
                    </tr>
                </thead>
                <tbody>
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

            let attendeesHtml = '';
            if (meeting.attendeesImage) {
                // 이미지가 있는 경우 - 접힌 상태로 표시
                attendeesHtml = `
                    <div style="margin-top: 8px;" onclick="event.stopPropagation();">
                        <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; background: #fafafa; transition: background 0.2s;" 
                             onclick="event.stopPropagation(); window.meetingManager && window.meetingManager.toggleAttendeesImage('${meeting.id}', this)"
                             onmouseover="this.style.background='#f0f0f0'"
                             onmouseout="this.style.background='#fafafa'">
                            <span style="font-size: 1.2em;">📷</span>
                            <span style="color: #666; font-size: 0.9em; font-weight: 500;">참석자 목록 보기</span>
                            <span style="margin-left: auto; color: #999; font-size: 0.85em;">▼</span>
                        </div>
                        <div id="attendeesImage_${meeting.id}" style="display: none; margin-top: 8px;">
                            <img src="${meeting.attendeesImage}" 
                                 style="max-width: 100%; max-height: 400px; border-radius: 4px; border: 1px solid #e0e0e0; cursor: pointer;" 
                                 onclick="event.stopPropagation(); window.meetingManager && window.meetingManager.showAttendeesImageModal('${meeting.id}')"
                                 title="클릭하여 크게 보기">
                        </div>
                    </div>
                `;
            } else if (meeting.attendees && meeting.attendees.length > 0) {
                // 텍스트가 있는 경우
                attendeesHtml = meeting.attendees.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('');
            } else {
                attendeesHtml = '없음';
            }

            const categoryColor = this.getCategoryColor(meeting.category);
            const categoryDisplayName = meeting.category ? meeting.category.replace(/^#/, '') : '';
            
            // 날짜 포맷 (간단한 형식)
            const dateOnly = dateTime.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            // 담당자 표시
            const assigneeHtml = Array.isArray(meeting.assignee) 
                ? meeting.assignee.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('')
                : `<span class="meeting-tag">${this.escapeHtml(meeting.assignee || '')}</span>`;
            
            // 논의 내용 (요약)
            const contentPreview = meeting.content 
                ? (meeting.content.length > 100 ? meeting.content.substring(0, 100) + '...' : meeting.content)
                : '-';
            
            // 참고 사항 (요약)
            const notesPreview = meeting.notes 
                ? (meeting.notes.length > 50 ? meeting.notes.substring(0, 50) + '...' : meeting.notes)
                : '-';
            
            html += `
                <tr style="border-bottom: 1px solid #f0f0f0; transition: background 0.2s;" 
                    onmouseover="this.style.background='#fafafa'"
                    onmouseout="this.style.background='white'">
                    <td style="padding: 12px; color: #666; font-size: 0.9em; white-space: nowrap;">${dateOnly}</td>
                    <td style="padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="meeting-tag" style="background-color: ${categoryColor}20; border: 1px solid ${categoryColor}60; color: ${categoryColor}; font-weight: 600; font-size: 0.85em;">
                                ${this.escapeHtml(categoryDisplayName)}
                            </span>
                            <strong style="color: #333; cursor: pointer;" onclick="window.meetingManager && window.meetingManager.viewMeeting('${meeting.id}')">${this.escapeHtml(meeting.title)}</strong>
                        </div>
                    </td>
                    <td style="padding: 12px; font-size: 0.9em;">
                        ${attendeesHtml}
                    </td>
                    <td style="padding: 12px; font-size: 0.9em; color: #666; max-width: 300px;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(meeting.content || '')}">
                            ${this.escapeHtml(contentPreview)}
                        </div>
                    </td>
                    <td style="padding: 12px; font-size: 0.9em; color: #666; max-width: 200px;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(meeting.notes || '')}">
                            ${this.escapeHtml(notesPreview)}
                        </div>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn btn-edit" onclick="event.stopPropagation(); window.meetingManager && window.meetingManager.openEditModal('${meeting.id}')" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">수정</button>
                        <button class="btn btn-danger" onclick="event.stopPropagation(); window.meetingManager && window.meetingManager.deleteMeeting('${meeting.id}')" style="padding: 6px 12px; font-size: 12px;">삭제</button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

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
        
        // 참석자 이미지 초기화
        this.currentAttendeesImage = null;
        const preview = document.getElementById('attendeesImagePreview');
        const placeholder = document.getElementById('attendeesImagePlaceholder');
        if (preview && placeholder) {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        }

        // 카테고리 옵션 채우기
        this.populateCategoryOptions();
        // 담당자 옵션 채우기
        this.populateAssigneeOptions();

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
        
        // 참석자 이미지 저장
        const attendeesImage = this.currentAttendeesImage || null;

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
            attendeesImage: attendeesImage, // 참석자 이미지 저장
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

        let attendeesHtml = '';
        if (meeting.attendeesImage) {
            // 이미지가 있는 경우 - 접힌 상태로 표시
            attendeesHtml = `
                <div style="margin-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; background: #fafafa; transition: background 0.2s;" 
                         onclick="window.meetingManager && window.meetingManager.toggleAttendeesImage('${meeting.id}', this)"
                         onmouseover="this.style.background='#f0f0f0'"
                         onmouseout="this.style.background='#fafafa'">
                        <span style="font-size: 1.2em;">📷</span>
                        <span style="color: #666; font-size: 0.9em; font-weight: 500;">참석자 목록 보기</span>
                        <span style="margin-left: auto; color: #999; font-size: 0.85em;">▼</span>
                    </div>
                    <div id="attendeesImageDetail_${meeting.id}" style="display: none; margin-top: 8px;">
                        <img src="${meeting.attendeesImage}" 
                             style="max-width: 100%; max-height: 400px; border-radius: 4px; border: 1px solid #e0e0e0; cursor: pointer;" 
                             onclick="window.meetingManager && window.meetingManager.showAttendeesImageModal('${meeting.id}')"
                             title="클릭하여 크게 보기">
                    </div>
                </div>
            `;
        } else if (meeting.attendees && meeting.attendees.length > 0) {
            // 텍스트가 있는 경우
            attendeesHtml = meeting.attendees.map(a => `<span class="meeting-tag">${this.escapeHtml(a)}</span>`).join('');
        } else {
            attendeesHtml = '없음';
        }

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
    
    // 참석자 이미지 접기/펼치기
    toggleAttendeesImage(meetingId, toggleButton) {
        // 목록 뷰에서
        const listImageDiv = document.getElementById(`attendeesImage_${meetingId}`);
        // 상세보기 뷰에서
        const detailImageDiv = document.getElementById(`attendeesImageDetail_${meetingId}`);
        
        const imageDiv = listImageDiv || detailImageDiv;
        if (!imageDiv) return;
        
        const isExpanded = imageDiv.style.display !== 'none';
        const arrow = toggleButton.querySelector('span:last-child');
        
        if (isExpanded) {
            // 접기
            imageDiv.style.display = 'none';
            if (arrow) arrow.textContent = '▼';
        } else {
            // 펼치기
            imageDiv.style.display = 'block';
            if (arrow) arrow.textContent = '▲';
        }
    }
    
    // 참석자 이미지 모달 표시
    showAttendeesImageModal(meetingId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (!meeting || !meeting.attendeesImage) return;
        
        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'meeting-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="meeting-modal-content" style="max-width: 90vw; max-height: 90vh; overflow: auto;">
                <div class="meeting-modal-header">
                    <h2>참석자 목록</h2>
                    <button class="meeting-modal-close" onclick="this.closest('.meeting-modal').remove()">&times;</button>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <img src="${meeting.attendeesImage}" 
                         style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e0e0e0;">
                </div>
            </div>
        `;
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.meetingManager = new MeetingManager();
});
