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
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadFileGroups();
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
        const savedData = localStorage.getItem('corpusData');
        if (savedData) {
            this.data = JSON.parse(savedData);
        } else {
            this.data = [];
        }
        this.filteredData = [...this.data];
    }

    // 파일 그룹 로드
    async loadFileGroups() {
        const savedFileGroups = localStorage.getItem('corpusFileGroups');
        if (savedFileGroups) {
            try {
                this.fileGroups = JSON.parse(savedFileGroups);
                // 파일 그룹별 항목 수 업데이트
                this.fileGroups.forEach(fileGroup => {
                    const count = this.data.filter(item => item.fileGroupId === fileGroup.id).length;
                    fileGroup.itemCount = count;
                });
            } catch (e) {
                console.error('파일 그룹 로드 오류:', e);
                this.fileGroups = [];
            }
        } else {
            this.fileGroups = [];
        }
    }

    // 데이터 저장
    saveData() {
        localStorage.setItem('corpusData', JSON.stringify(this.data));
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const addToGlossaryBtn = document.getElementById('addToGlossaryBtn');

        const searchBtn = document.getElementById('categorySearchBtn');
        
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

        // 파일 그룹이 없어도 섹션은 표시 (빈 상태 메시지)
        if (this.fileGroups.length === 0) {
            fileListSection.style.display = 'block';
            fileListGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">등록된 코퍼스 파일이 없습니다.</div>';
            return;
        }

        fileListSection.style.display = 'block';
        fileListGrid.innerHTML = '';

        // 파일 그룹 카드들
        this.fileGroups.forEach(fileGroup => {
            const card = document.createElement('div');
            card.className = 'file-card';
            const isSelected = this.selectedFileGroupId === fileGroup.id;
            card.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border: 2px solid ' + (isSelected ? '#FFC107' : '#e0e0e0') + '; cursor: pointer; transition: all 0.3s; position: relative;';
            card.innerHTML = `
                <button class="file-delete-btn" onclick="event.stopPropagation(); corpusManager.deleteFileGroup('${fileGroup.id}')" title="삭제" style="position: absolute; top: 8px; right: 8px; background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: bold;">×</button>
                <div style="font-size: 1.8em; margin-bottom: 8px; text-align: center;">📄</div>
                <div style="font-size: 13px; color: #333; margin-bottom: 6px; word-break: break-word; text-align: center;">${this.escapeHtml(fileGroup.koreanFileName)}</div>
                <div style="font-size: 13px; color: #333; margin-bottom: 6px; word-break: break-word; text-align: center;">${this.escapeHtml(fileGroup.japaneseFileName)}</div>
                <div style="font-size: 11px; color: #999; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">${fileGroup.itemCount}개 항목</div>
                <button class="file-csv-download-btn" onclick="event.stopPropagation(); corpusManager.downloadCsvForFileGroup('${fileGroup.id}')" title="CSV 다운로드" style="position: absolute; bottom: 8px; right: 8px; background: none; border: none; color: #666; cursor: pointer; font-size: 18px; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">⬇️</button>
            `;
            card.addEventListener('click', () => {
                this.selectedFileGroupId = fileGroup.id;
                this.currentPage = 1;
                this.showCorpusList();
                this.filterTerms();
                this.renderFileList();
                this.render();
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
            
            fileListGrid.appendChild(card);
        });
    }

    // 코퍼스 목록 표시
    showCorpusList() {
        const corpusListSection = document.getElementById('corpusListSection');
        const selectedFileTitle = document.getElementById('selectedFileTitle');
        
        if (corpusListSection) {
            corpusListSection.style.display = 'block';
        }

        if (selectedFileTitle && this.selectedFileGroupId) {
            const fileGroup = this.fileGroups.find(fg => fg.id === this.selectedFileGroupId);
            if (fileGroup) {
                selectedFileTitle.textContent = `${fileGroup.koreanFileName} / ${fileGroup.japaneseFileName}`;
            }
        }
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
        localStorage.setItem('corpusFileGroups', JSON.stringify(this.fileGroups));

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
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

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
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} onchange="corpusManager.toggleSelect(${item.id}, this.checked)">
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
        this.updateDeleteSelectedButton();
    }

    // 체크박스 선택/해제
    toggleSelect(id, checked) {
        if (checked) {
            this.selectedIds.add(id);
        } else {
            this.selectedIds.delete(id);
        }
        this.updateSelectAllCheckbox();
        this.updateSelectedCount();
        this.updateDeleteSelectedButton();
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
        // 버튼은 항상 표시되도록 함
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const addToGlossaryBtn = document.getElementById('addToGlossaryBtn');
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.style.display = 'block';
        }
        if (addToGlossaryBtn) {
            addToGlossaryBtn.style.display = 'block';
        }
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

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    corpusManager = new CorpusManager();
    
    // PPT 추출 후 코퍼스에 추가했을 때 데이터 새로고침
    // 페이지 로드 시마다 데이터 다시 로드
    if (window.location.search.includes('refresh=true')) {
        corpusManager.loadData().then(() => {
            corpusManager.filterTerms();
            corpusManager.render();
        });
    }
});
