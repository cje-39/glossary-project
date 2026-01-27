// 토론 게시물 관리 클래스
class DiscussionManager {
    constructor() {
        this.posts = [];
        this.authors = [];
        this.categories = [];
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadAuthors();
        await this.loadCategories();
        this.setupEventListeners();
        this.renderPosts();
    }

    // 데이터 로드
    async loadData() {
        const savedData = localStorage.getItem('discussionPosts');
        if (savedData) {
            const loadedPosts = JSON.parse(savedData);
            // 데이터 마이그레이션: term 필드를 kr/jp로 변환
            this.posts = loadedPosts.map(post => {
                if (post.term && !post.kr) {
                    return {
                        ...post,
                        kr: post.term,
                        jp: post.term,
                        category: post.category || ''
                    };
                }
                return {
                    ...post,
                    kr: post.kr || '',
                    jp: post.jp || '',
                    category: post.category || '',
                    meaning: post.meaning || ''
                };
            });
        } else {
            this.posts = [];
        }
        this.saveData();
    }

    // 데이터 저장
    saveData() {
        localStorage.setItem('discussionPosts', JSON.stringify(this.posts));
    }

    // 작성자 로드
    async loadAuthors() {
        const savedAuthors = localStorage.getItem('discussionAuthors');
        if (savedAuthors) {
            this.authors = JSON.parse(savedAuthors);
        } else {
            this.authors = [];
        }
    }

    // 작성자 저장
    saveAuthors() {
        localStorage.setItem('discussionAuthors', JSON.stringify(this.authors));
    }

    // 카테고리 로드
    async loadCategories() {
        const savedCategories = localStorage.getItem('discussionCategories');
        if (savedCategories) {
            this.categories = JSON.parse(savedCategories);
        } else {
            this.categories = [];
        }
    }

    // 카테고리 저장
    saveCategories() {
        localStorage.setItem('discussionCategories', JSON.stringify(this.categories));
    }

    // API 키 관련 이벤트 리스너 설정
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
                    statusText.textContent = '✅ API 키가 저장되어 있습니다. 의미(AI) 기능을 사용할 수 있습니다.';
                    statusText.style.color = '#27ae60';
                } else {
                    statusText.textContent = '⚠️ API 키가 없습니다. 의미(AI) 기능을 사용할 수 없습니다.';
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
                    alert('✅ API 키가 저장되었습니다. 이제 의미(AI) 기능을 사용할 수 있습니다.');
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

    // 이벤트 리스너 설정
    setupEventListeners() {
        // API 키 관련 이벤트 리스너
        this.setupApiKeyListeners();
        
        // 새 게시물 버튼 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'newPostBtn') {
                document.getElementById('postModal').classList.add('show');
                document.getElementById('postForm').reset();
                document.getElementById('postForm').removeAttribute('data-edit-id');
                document.getElementById('modalTitle').textContent = '토론 등록하기';
                const hiddenInput = document.getElementById('postAuthor');
                if (hiddenInput) hiddenInput.value = '';
                this.updateAuthorDropdown();
                // 드롭다운 메뉴는 닫힌 상태로 시작
                const authorDropdownMenu = document.getElementById('authorDropdownMenu');
                if (authorDropdownMenu) authorDropdownMenu.style.display = 'none';
            }
        });

        // 게시물 모달 닫기
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('postModal').classList.remove('show');
        });

        document.getElementById('cancelPostBtn').addEventListener('click', () => {
            document.getElementById('postModal').classList.remove('show');
        });

        // 게시물 모달 외부 클릭 시 닫기
        document.getElementById('postModal').addEventListener('click', (e) => {
            if (e.target.id === 'postModal') {
                document.getElementById('postModal').classList.remove('show');
            }
        });

        // 게시물 폼 제출
        document.getElementById('postForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPost();
        });

        // 작성자 드롭다운 토글
        const authorDropdownToggle = document.getElementById('authorDropdownToggle');
        const authorDropdownMenu = document.getElementById('authorDropdownMenu');
        
        if (authorDropdownToggle && authorDropdownMenu) {
            authorDropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = authorDropdownMenu.style.display === 'block';
                authorDropdownMenu.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) {
                    this.updateAuthorList();
                }
            });

            // 외부 클릭 시 드롭다운 닫기
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.author-dropdown')) {
                    authorDropdownMenu.style.display = 'none';
                }
            });
        }

        // 작성자 추가 버튼
        document.getElementById('addAuthorBtn').addEventListener('click', () => {
            const newAuthorInput = document.getElementById('newAuthorInput');
            if (newAuthorInput.style.display === 'none' || !newAuthorInput.style.display) {
                newAuthorInput.style.display = 'block';
                document.getElementById('newAuthorName').focus();
            } else {
                newAuthorInput.style.display = 'none';
            }
        });

        document.getElementById('saveAuthorBtn').addEventListener('click', () => {
            const name = document.getElementById('newAuthorName').value.trim();
            if (name && !this.authors.includes(name)) {
                this.authors.push(name);
                this.saveAuthors();
                this.updateAuthorDropdown();
                this.updateAuthorList();
                document.getElementById('newAuthorName').value = '';
                document.getElementById('newAuthorInput').style.display = 'none';
            } else if (name && this.authors.includes(name)) {
                alert('이미 존재하는 작성자입니다.');
            }
        });

        document.getElementById('cancelAuthorBtn').addEventListener('click', () => {
            document.getElementById('newAuthorName').value = '';
            document.getElementById('newAuthorInput').style.display = 'none';
        });
    }

    // 작성자 드롭다운 업데이트
    updateAuthorDropdown() {
        const hiddenInput = document.getElementById('postAuthor');
        const selectedValueSpan = document.getElementById('authorSelectedValue');
        const currentValue = hiddenInput ? hiddenInput.value : '';
        
        if (currentValue && this.authors.includes(currentValue)) {
            if (selectedValueSpan) {
                selectedValueSpan.textContent = currentValue;
                selectedValueSpan.style.color = '#333';
            }
        } else {
            if (selectedValueSpan) {
                selectedValueSpan.textContent = '선택하세요';
                selectedValueSpan.style.color = '#999';
            }
            if (hiddenInput) {
                hiddenInput.value = '';
            }
        }
    }

    // 작성자 목록 업데이트
    updateAuthorList() {
        const authorListItems = document.getElementById('authorListItems');
        const hiddenInput = document.getElementById('postAuthor');
        const selectedValue = hiddenInput ? hiddenInput.value : '';
        
        if (!authorListItems) return;
        
        authorListItems.innerHTML = '';
        
        if (this.authors.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'author-dropdown-item';
            emptyItem.style.padding = '20px';
            emptyItem.style.textAlign = 'center';
            emptyItem.style.color = '#999';
            emptyItem.textContent = '작성자가 없습니다. 추가해주세요.';
            authorListItems.appendChild(emptyItem);
            return;
        }
        
        // 가나다순으로 정렬
        const sortedAuthors = [...this.authors].sort((a, b) => {
            return a.localeCompare(b, 'ko');
        });
        
        sortedAuthors.forEach(author => {
            const item = document.createElement('div');
            item.className = 'author-dropdown-item';
            if (author === selectedValue) {
                item.classList.add('selected');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'author-dropdown-item-name';
            nameSpan.textContent = author;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'author-dropdown-item-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = '삭제';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteAuthor(author);
            };
            
            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);
            
            // 클릭 시 선택
            item.addEventListener('click', (e) => {
                if (e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
                    hiddenInput.value = author;
                    this.updateAuthorDropdown();
                    document.getElementById('authorDropdownMenu').style.display = 'none';
                }
            });
            
            authorListItems.appendChild(item);
        });
    }

    // 작성자 삭제
    deleteAuthor(authorName) {
        // 해당 작성자를 사용하는 게시물이 있는지 확인
        const postsUsingAuthor = this.posts.filter(post => post.author === authorName);
        
        if (postsUsingAuthor.length > 0) {
            const confirmMsg = `"${authorName}" 작성자를 사용하는 게시물이 ${postsUsingAuthor.length}개 있습니다.\n정말 삭제하시겠습니까?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        } else {
            if (!confirm(`"${authorName}" 작성자를 삭제하시겠습니까?`)) {
                return;
            }
        }
        
        // 현재 선택된 작성자가 삭제되는 경우 선택 해제
        const hiddenInput = document.getElementById('postAuthor');
        if (hiddenInput && hiddenInput.value === authorName) {
            hiddenInput.value = '';
        }
        
        // 작성자 삭제
        this.authors = this.authors.filter(a => a !== authorName);
        this.saveAuthors();
        this.updateAuthorDropdown();
        this.updateAuthorList();
        
        // 해당 작성자를 사용하는 게시물의 작성자를 빈 값으로 변경
        postsUsingAuthor.forEach(post => {
            post.author = '';
        });
        this.saveData();
        this.renderPosts();
    }

    // 게시물 추가
    addPost() {
        const author = document.getElementById('postAuthor').value;
        const category = document.getElementById('postCategory').value;
        const direction = document.getElementById('postDirection').value;
        const kr = document.getElementById('postKR').value.trim();
        const jp = document.getElementById('postJP').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const note = document.getElementById('postNote').value.trim();

        if (!author || !direction || !content) {
            alert('작성자, 언어 방향, 의견은 필수 항목입니다.');
            return;
        }
        
        // 한국어 또는 일본어 중 하나는 필수
        if (!kr && !jp) {
            alert('한국어 또는 일본어 중 하나는 입력해주세요.');
            return;
        }

        const newId = this.posts.length > 0 ? Math.max(...this.posts.map(p => p.id)) + 1 : 1;
        const newPost = {
            id: newId,
            author,
            category: category || '',
            direction,
            kr,
            jp,
            content,
            note: note || '',
            meaning: '', // AI 생성 의미
            resolved: false,
            comments: [],
            createdAt: new Date().toISOString()
        };

        this.posts.push(newPost);
        this.saveData();
        this.renderPosts();
        document.getElementById('postModal').classList.remove('show');
        document.getElementById('postForm').reset();
        
        // 자동으로 AI 의미 생성
        this.generateMeaning(newId);
    }

    // 게시물 삭제
    deletePost(id) {
        if (confirm('정말 이 게시물을 삭제하시겠습니까?')) {
            this.posts = this.posts.filter(p => p.id !== id);
            this.saveData();
            this.renderPosts();
        }
    }

    // 해결 상태 토글
    toggleResolved(id) {
        const post = this.posts.find(p => p.id === id);
        if (post) {
            post.resolved = !post.resolved;
            this.saveData();
            this.renderPosts();
        }
    }

    // 게시물 렌더링
    renderPosts() {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        const activePosts = this.posts.filter(p => !p.resolved);
        const resolvedPosts = this.posts.filter(p => p.resolved);

        let html = '';

        // 토론 중 섹션
        if (activePosts.length > 0) {
            html += '<div class="posts-section">';
            html += '<h3 class="section-title">토론 중...</h3>';
            html += '<div class="posts-table-wrapper">';
            html += '<table class="posts-table">';
            html += '<thead><tr>';
            html += '<th>해결</th>';
            html += '<th>작성자</th>';
            html += '<th>카테고리</th>';
            html += '<th>언어방향</th>';
            html += '<th>KR</th>';
            html += '<th>JP</th>';
            html += '<th>의견</th>';
            html += '<th>비고/예시문</th>';
            html += '<th>의미(AI)</th>';
            html += '<th></th>';
            html += '</tr></thead>';
            html += '<tbody>';
            html += activePosts.map(post => this.renderPost(post)).join('');
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            html += '<div style="text-align: center; margin-top: 16px;">';
            html += '<button id="newPostBtn" class="btn btn-primary" style="font-size: 1em; padding: 8px 16px; color: #ffffff;">토론 등록하기</button>';
            html += '</div>';
            html += '</div>';
        } else {
            // 토론 중 게시물이 없을 때도 버튼 표시
            html += '<div class="posts-section">';
            html += '<h3 class="section-title">토론 중...</h3>';
            html += '<div style="text-align: center; margin-top: 16px;">';
            html += '<button id="newPostBtn" class="btn btn-primary" style="font-size: 1em; padding: 8px 16px; color: #ffffff;">토론 등록하기</button>';
            html += '</div>';
            html += '</div>';
        }

        // 해결 섹션
        if (resolvedPosts.length > 0) {
            html += '<div class="posts-section">';
            html += '<h3 class="section-title">해결!</h3>';
            html += '<div class="posts-table-wrapper">';
            html += '<table class="posts-table">';
            html += '<thead><tr>';
            html += '<th>해결</th>';
            html += '<th>작성자</th>';
            html += '<th>카테고리</th>';
            html += '<th>언어방향</th>';
            html += '<th>KR</th>';
            html += '<th>JP</th>';
            html += '<th>의견</th>';
            html += '<th>비고/예시문</th>';
            html += '<th>의미(AI)</th>';
            html += '<th></th>';
            html += '</tr></thead>';
            html += '<tbody>';
            html += resolvedPosts.map(post => this.renderPost(post)).join('');
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    // 개별 게시물 렌더링 (테이블 행)
    renderPost(post) {
        const commentCount = post.comments ? post.comments.length : 0;
        const commentsHtml = post.comments && post.comments.length > 0 ? post.comments.map(comment => {
            const commentDate = new Date(comment.createdAt);
            const commentDateStr = commentDate.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                            <span class="comment-date">${commentDateStr}</span>
                        </div>
                        <div class="comment-header-actions">
                            <button class="btn-edit-comment" onclick="discussionManager.editComment(${post.id}, ${comment.id})" title="수정">✎</button>
                            <button class="btn-delete-comment" onclick="discussionManager.deleteComment(${post.id}, ${comment.id})" title="삭제">-</button>
                        </div>
                    </div>
                    <div class="comment-content">${this.escapeHtml(comment.content).replace(/\n/g, '<br>')}</div>
                    <div class="comment-footer">
                        <button class="btn-comment-like" onclick="event.stopPropagation(); discussionManager.toggleCommentLike(${post.id}, ${comment.id})">
                            <span class="like-icon">❤️</span>
                            <span class="like-count">${comment.likes || 0}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('') : '';

        const commentCountBadge = `<span class="comment-count-badge ${commentCount > 0 ? 'has-comments' : ''}" data-post-id="${post.id}" onclick="discussionManager.toggleCommentsList(${post.id}, event)">💬 ${commentCount}</span>`;

        // 작성자 드롭다운
        const authorOptions = this.authors.map(author =>
            `<option value="${this.escapeHtml(author)}" ${post.author === author ? 'selected' : ''}>${this.escapeHtml(author)}</option>`
        ).join('');
        const authorSelect = `<select class="cell-dropdown" data-field="author" data-post-id="${post.id}" onchange="discussionManager.updateCellValue(${post.id}, 'author', this.value)"><option value="">선택</option>${authorOptions}</select>`;

        // 카테고리 드롭다운 (입력 가능)
        const categoryOptions = this.categories.map(cat =>
            `<option value="${this.escapeHtml(cat)}" ${post.category === cat ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
        ).join('');
        const categorySelect = `<select class="cell-dropdown cell-dropdown-editable" data-field="category" data-post-id="${post.id}" onchange="discussionManager.handleCategoryChange(${post.id}, this.value, this)"><option value="">선택</option>${categoryOptions}<option value="__NEW__">+ 새 카테고리</option></select><input type="text" class="cell-input-new" data-field="category" data-post-id="${post.id}" placeholder="새 카테고리 입력 후 Enter" style="display: none;" onkeypress="if(event.key==='Enter') { discussionManager.addNewCategory(${post.id}, this.value, this); }" onblur="this.style.display='none';">`;

        // 언어방향 드롭다운
        const directionSelect = `<select class="cell-dropdown" data-field="direction" data-post-id="${post.id}" onchange="discussionManager.updateCellValue(${post.id}, 'direction', this.value)"><option value="">선택</option><option value="한일" ${post.direction === '한일' ? 'selected' : ''}>한일</option><option value="일한" ${post.direction === '일한' ? 'selected' : ''}>일한</option></select>`;

        return `
            <tr data-post-id="${post.id}" data-resolved="${post.resolved}">
                <td class="row-resolve">
                    <label class="resolve-checkbox-label">
                        <input type="checkbox" class="resolve-checkbox" ${post.resolved ? 'checked' : ''} onchange="discussionManager.toggleResolved(${post.id})">
                    </label>
                </td>
                <td class="row-author">${authorSelect}</td>
                <td class="row-category">${categorySelect}</td>
                <td class="row-direction">${directionSelect}</td>
                <td class="row-kr editable-cell" data-field="kr" data-post-id="${post.id}" contenteditable="true">${this.escapeHtml(post.kr || '')}</td>
                <td class="row-jp editable-cell" data-field="jp" data-post-id="${post.id}" contenteditable="true">${this.escapeHtml(post.jp || '')}</td>
                <td class="row-opinion opinion-cell-wrapper">
                    <div class="opinion-cell-content">
                        <div class="editable-cell" data-field="content" data-post-id="${post.id}" contenteditable="true">${this.escapeHtml((post.content || '').trim())}</div>
                        ${commentCountBadge}
                    </div>
                    <div class="comments-container-popup" data-post-id="${post.id}" style="display: none;">
                        <div class="comments-list-section">
                            ${commentsHtml || '<div class="comment-empty">아직 의견이 없습니다.</div>'}
                        </div>
                        <div class="comments-form-section">
                            <div class="comment-form-inline">
                                <div class="form-group">
                                    <label>작성자 *</label>
                                    <select class="comment-author-select" data-post-id="${post.id}" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.9em;">
                                        <option value="">선택하세요</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>의견 내용 *</label>
                                    <textarea class="comment-content-input" data-post-id="${post.id}" rows="3" placeholder="의견을 입력하세요" style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.9em; resize: vertical;"></textarea>
                                </div>
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    <button type="button" class="btn btn-primary btn-small submit-comment-btn" data-post-id="${post.id}">의견 작성</button>
                                    <button type="button" class="btn btn-secondary btn-small cancel-comment-btn" data-post-id="${post.id}">취소</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="row-note">
                    <div class="editable-cell editable-note" data-field="note" data-post-id="${post.id}" contenteditable="true">${post.note ? this.escapeHtml(post.note) : ''}</div>
                </td>
                <td class="row-meaning">
                    <div class="meaning-cell-wrapper">
                        <div class="meaning-content" data-post-id="${post.id}" style="white-space: pre-line;">${post.meaning ? this.escapeHtml(post.meaning) : ''}</div>
                    </div>
                </td>
                <td class="row-actions">
                    <button class="btn-delete-post" onclick="discussionManager.deletePost(${post.id})" title="삭제">×</button>
                </td>
            </tr>
        `;
    }

    // 셀 값 업데이트
    updateCellValue(postId, field, value) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            post[field] = value;
            this.saveData();
        }
    }

    // 카테고리 변경 처리
    handleCategoryChange(postId, value, selectElement) {
        if (value === '__NEW__') {
            const inputElement = selectElement.nextElementSibling;
            if (inputElement) {
                inputElement.style.display = 'block';
                inputElement.focus();
            }
        } else {
            this.updateCellValue(postId, 'category', value);
            this.renderPosts();
        }
    }

    // 새 카테고리 추가
    addNewCategory(postId, categoryName, inputElement) {
        if (categoryName.trim() && !this.categories.includes(categoryName.trim())) {
            this.categories.push(categoryName.trim());
            this.saveCategories();
            this.updateCellValue(postId, 'category', categoryName.trim());
            this.renderPosts();
        } else {
            inputElement.style.display = 'none';
        }
    }

    // 편집 가능한 셀 이벤트 리스너 연결
    attachEditableCellListeners() {
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('focus', function() {
                this.style.backgroundColor = '#fff9e6';
            });
            cell.addEventListener('blur', function() {
                this.style.backgroundColor = '';
                const postId = parseInt(this.dataset.postId);
                const field = this.dataset.field;
                const value = this.textContent.trim();
                discussionManager.updateCellValue(postId, field, value);
            });
            cell.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.blur();
                }
            });
        });
    }

    // 의견 목록 토글
    toggleCommentsList(postId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const badge = document.querySelector(`.comment-count-badge[data-post-id="${postId}"]`);
        const commentsContainer = document.querySelector(`.comments-container-popup[data-post-id="${postId}"]`);
        
        if (!badge) return;
        
        const isActive = badge.classList.contains('active');
        
        if (isActive) {
            // 닫기
            badge.classList.remove('active');
            if (commentsContainer) {
                commentsContainer.style.display = 'none';
                // 입력 필드 초기화
                const authorSelect = commentsContainer.querySelector('.comment-author-select');
                const contentInput = commentsContainer.querySelector('.comment-content-input');
                if (authorSelect) authorSelect.value = '';
                if (contentInput) contentInput.value = '';
            }
        } else {
            // 다른 모든 댓글 목록 닫기
            const allBadges = document.querySelectorAll('.comment-count-badge.active');
            const allContainers = document.querySelectorAll('.comments-container-popup[style*="display: block"]');
            
            allBadges.forEach(b => {
                if (b.getAttribute('data-post-id') !== postId.toString()) {
                    b.classList.remove('active');
                }
            });
            
            allContainers.forEach(container => {
                const containerPostId = container.getAttribute('data-post-id');
                if (containerPostId !== postId.toString()) {
                    container.style.display = 'none';
                    // 입력 필드 초기화
                    const authorSelect = container.querySelector('.comment-author-select');
                    const contentInput = container.querySelector('.comment-content-input');
                    if (authorSelect) authorSelect.value = '';
                    if (contentInput) contentInput.value = '';
                }
            });
            
            // 열기
            badge.classList.add('active');
            if (commentsContainer) {
                commentsContainer.style.display = 'block';
                // 작성자 드롭다운 업데이트
                this.updateCommentFormAuthorDropdown(postId);
            }
        }
    }

    // 댓글 작성 폼의 작성자 드롭다운 업데이트
    updateCommentFormAuthorDropdown(postId) {
        const select = document.querySelector(`.comment-author-select[data-post-id="${postId}"]`);
        if (!select) return;
        
        select.innerHTML = '<option value="">선택하세요</option>';
        this.authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            select.appendChild(option);
        });
    }

    // 댓글 추가
    addComment(postId) {
        const container = document.querySelector(`.comments-container-popup[data-post-id="${postId}"]`);
        if (!container) return;

        const authorSelect = container.querySelector('.comment-author-select');
        const contentInput = container.querySelector('.comment-content-input');

        if (!authorSelect || !contentInput) return;

        const author = authorSelect.value.trim();
        const content = contentInput.value.trim();

        if (!author || !content) {
            alert('작성자와 의견 내용을 모두 입력해주세요.');
            return;
        }

        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        if (!post.comments) {
            post.comments = [];
        }

        const newCommentId = post.comments.length > 0 ? Math.max(...post.comments.map(c => c.id)) + 1 : 1;
        const newComment = {
            id: newCommentId,
            author,
            content,
            likes: 0,
            likedBy: [],
            createdAt: new Date().toISOString()
        };

        post.comments.push(newComment);
        this.saveData();
        this.renderPosts();
        
        // 입력 필드 초기화
        authorSelect.value = '';
        contentInput.value = '';
    }

    // 댓글 삭제
    deleteComment(postId, commentId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        if (confirm('정말 이 의견을 삭제하시겠습니까?')) {
            post.comments = post.comments.filter(c => c.id !== commentId);
            this.saveData();
            this.renderPosts();
        }
    }

    // 댓글 편집
    editComment(postId, commentId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        if (!commentItem) return;

        const commentContentDiv = commentItem.querySelector('.comment-content');
        const commentHeader = commentItem.querySelector('.comment-header');
        
        // 현재 내용 저장
        const currentContent = commentContentDiv.textContent;
        const currentAuthor = comment.author;

        // 작성자 드롭다운 생성
        const authorOptions = this.authors.map(author =>
            `<option value="${this.escapeHtml(author)}" ${comment.author === author ? 'selected' : ''}>${this.escapeHtml(author)}</option>`
        ).join('');
        const authorSelect = `<select class="comment-edit-author-select" data-post-id="${postId}" data-comment-id="${commentId}" style="padding: 4px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.9em; background: white; cursor: pointer;"><option value="">선택하세요</option>${authorOptions}</select>`;

        // 편집 모드로 변경
        commentContentDiv.innerHTML = `
            <textarea class="comment-edit-textarea" rows="3" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.9em; resize: vertical; font-family: inherit;">${this.escapeHtml(currentContent)}</textarea>
        `;
        
        // 작성자 부분을 드롭다운으로 교체
        const authorSpan = commentHeader.querySelector('.comment-author');
        if (authorSpan) {
            authorSpan.outerHTML = authorSelect;
        }

        // 편집 버튼을 저장/취소 버튼으로 교체
        const editBtn = commentItem.querySelector('.btn-edit-comment');
        const deleteBtn = commentItem.querySelector('.btn-delete-comment');
        if (editBtn && deleteBtn) {
            editBtn.outerHTML = `
                <button class="btn-save-comment" onclick="discussionManager.saveCommentEdit(${postId}, ${commentId})" title="저장">✓</button>
            `;
            deleteBtn.outerHTML = `
                <button class="btn-cancel-comment-edit" onclick="discussionManager.cancelCommentEdit(${postId}, ${commentId}, '${this.escapeHtml(currentContent)}', '${this.escapeHtml(currentAuthor)}')" title="취소">×</button>
            `;
        }
    }

    // 댓글 편집 저장
    saveCommentEdit(postId, commentId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        if (!commentItem) return;

        const textarea = commentItem.querySelector('.comment-edit-textarea');
        const authorSelect = commentItem.querySelector('.comment-edit-author-select');
        
        if (!textarea || !authorSelect) return;

        const newContent = textarea.value.trim();
        const newAuthor = authorSelect.value.trim();

        if (!newContent) {
            alert('의견 내용을 입력해주세요.');
            return;
        }

        if (!newAuthor) {
            alert('작성자를 선택해주세요.');
            return;
        }

        comment.content = newContent;
        comment.author = newAuthor;
        this.saveData();
        this.renderPosts();
    }

    // 댓글 편집 취소
    cancelCommentEdit(postId, commentId, originalContent, originalAuthor) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        // 원래 내용으로 복원
        comment.content = originalContent;
        comment.author = originalAuthor;
        this.saveData();
        this.renderPosts();
    }

    // 댓글 좋아요 토글
    toggleCommentLike(postId, commentId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        // 로컬 스토리지에서 사용자 ID 가져오기 또는 생성
        let userId = localStorage.getItem('discussionUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('discussionUserId', userId);
        }

        if (!comment.likedBy) {
            comment.likedBy = [];
        }

        const likedIndex = comment.likedBy.indexOf(userId);
        if (likedIndex > -1) {
            // 이미 좋아요를 누른 경우 취소
            comment.likedBy.splice(likedIndex, 1);
            comment.likes = Math.max(0, comment.likes - 1);
        } else {
            // 좋아요 추가
            comment.likedBy.push(userId);
            comment.likes = (comment.likes || 0) + 1;
        }

        this.saveData();
        this.renderPosts();
    }

    // 의미 파싱 (한국어와 일본어를 엔터로 구분, 라벨 제거, 불렛포인트 처리)
    parseMeaning(text) {
        // 줄 단위로 파싱하여 한국어와 일본어 의미를 완전히 추출
        const lines = text.split('\n');
        let krMeaning = '';
        let jpMeaning = '';
        let currentSection = null;
        let currentContent = [];
        
        for (let line of lines) {
            const trimmedLine = line.trim();
            
            // 한국어 라벨 확인
            if (/^[•\-]?\s*한국어[:\s]/i.test(trimmedLine)) {
                // 이전 섹션 저장
                if (currentSection === 'kr' && currentContent.length > 0) {
                    krMeaning = currentContent.join(' ').trim();
                }
                currentSection = 'kr';
                currentContent = [];
                // 라벨 제거하고 내용 추출
                let content = trimmedLine.replace(/^[•\-]?\s*한국어[:\s]*/i, '').trim();
                if (content) currentContent.push(content);
            }
            // 일본어 라벨 확인
            else if (/^[•\-]?\s*(?:일본어|日本語)[:\s]/i.test(trimmedLine)) {
                // 이전 섹션 저장
                if (currentSection === 'kr' && currentContent.length > 0) {
                    krMeaning = currentContent.join(' ').trim();
                } else if (currentSection === 'jp' && currentContent.length > 0) {
                    jpMeaning = currentContent.join(' ').trim();
                }
                currentSection = 'jp';
                currentContent = [];
                // 라벨 제거하고 내용 추출
                let content = trimmedLine.replace(/^[•\-]?\s*(?:일본어|日本語)[:\s]*/i, '').trim();
                if (content) currentContent.push(content);
            }
            // 현재 섹션에 내용 추가
            else if (currentSection && trimmedLine) {
                currentContent.push(trimmedLine);
            }
        }
        
        // 마지막 섹션 저장
        if (currentSection === 'kr' && currentContent.length > 0) {
            krMeaning = currentContent.join(' ').trim();
        } else if (currentSection === 'jp' && currentContent.length > 0) {
            jpMeaning = currentContent.join(' ').trim();
        }
        
        // 정리 작업
        if (krMeaning) {
            // 마크다운 볼드(**텍스트**) 제거
            krMeaning = krMeaning.replace(/\*\*/g, '').trim();
            // 콜론 제거 (라벨 뒤의 콜론은 이미 제거되었지만, 의미 안에 있는 콜론도 제거)
            krMeaning = krMeaning.replace(/^:\s*/, '').trim();
        }
        
        if (jpMeaning) {
            // 마크다운 볼드(**텍스트**) 제거
            jpMeaning = jpMeaning.replace(/\*\*/g, '').trim();
            // 콜론 제거
            jpMeaning = jpMeaning.replace(/^:\s*/, '').trim();
        }
        
        // 파싱이 실패하면 원본 텍스트에서 라벨만 제거
        if (!krMeaning && !jpMeaning) {
            let cleaned = text;
            // 라벨 제거
            cleaned = cleaned.replace(/^[•\-]\s*한국어[:\s]*/i, '').trim();
            cleaned = cleaned.replace(/[•\-]\s*(?:일본어|日本語)[:\s]*/i, '').trim();
            // 마크다운 볼드(**텍스트**) 제거
            cleaned = cleaned.replace(/\*\*/g, '').trim();
            // 콜론 제거
            cleaned = cleaned.replace(/:\s*/g, ' ').trim();
            return cleaned;
        }
        
        // 한국어와 일본어를 엔터로 구분하고 불렛포인트 추가
        const result = [];
        if (krMeaning) {
            // 콜론 제거
            krMeaning = krMeaning.replace(/:\s*/g, ' ').trim();
            result.push('• ' + krMeaning);
        }
        if (jpMeaning) {
            // 콜론 제거
            jpMeaning = jpMeaning.replace(/:\s*/g, ' ').trim();
            result.push('• ' + jpMeaning);
        }
        
        return result.join('\n');
    }

    // AI로 의미 생성
    async generateMeaning(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const kr = post.kr || '';
        const jp = post.jp || '';
        const direction = post.direction || '';

        // 한국어 또는 일본어 중 하나는 필수
        if (!kr && !jp) {
            alert('한국어 또는 일본어 중 하나는 입력되어 있어야 합니다.');
            return;
        }

        // API 키 확인
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            alert('Claude API 키가 필요합니다. 코퍼스 페이지에서 API 키를 설정해주세요.');
            return;
        }

        // 로딩 표시
        const meaningCell = document.querySelector(`.meaning-content[data-post-id="${postId}"]`);
        if (meaningCell) {
            meaningCell.textContent = '생성 중...';
            meaningCell.style.color = '#999';
        }

        try {
            // 한국어와 일본어 중 하나만 입력되어도 둘 다 생성
            let prompt = '';
            if (kr && jp) {
                // 둘 다 입력된 경우
                prompt = `다음은 ${direction === '한일' ? '한국어에서 일본어로' : '일본어에서 한국어로'} 번역된 용어입니다.

한국어: ${kr}
일본어: ${jp}

이 용어의 사전적 정의를 각 언어로 한 문장씩 짧고 명확하게 작성해주세요. 외부 사전을 참조하지 말고 일반적인 사전적 의미만 알려주세요.

형식:
• 한국어: [한 문장으로 된 사전적 정의]
• 일본어: [한 문장으로 된 사전적 정의]`;
            } else if (kr) {
                // 한국어만 입력된 경우 - 둘 다 생성
                prompt = `다음은 한국어 용어입니다.

한국어: ${kr}

이 용어의 사전적 정의를 한국어와 일본어로 각각 한 문장씩 짧고 명확하게 작성해주세요. 외부 사전을 참조하지 말고 일반적인 사전적 의미만 알려주세요.

형식:
• 한국어: [한 문장으로 된 사전적 정의]
• 일본어: [한 문장으로 된 사전적 정의]`;
            } else if (jp) {
                // 일본어만 입력된 경우 - 둘 다 생성
                prompt = `다음은 일본어 용어입니다.

일본어: ${jp}

이 용어의 사전적 정의를 한국어와 일본어로 각각 한 문장씩 짧고 명확하게 작성해주세요. 외부 사전을 참조하지 말고 일반적인 사전적 의미만 알려주세요.

형식:
• 한국어: [한 문장으로 된 사전적 정의]
• 일본어: [한 문장으로 된 사전적 정의]`;
            }

            // CORS 프록시를 통해 API 호출
            // 로컬 서버가 있으면 사용, 없으면 공개 프록시 사용
            const proxyUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? '/api/claude'  // 로컬 서버 사용
                : 'https://cors-anywhere.herokuapp.com/https://api.anthropic.com/v1/messages';  // 공개 프록시 (임시)
            
            // 로컬 서버 사용 시
            if (proxyUrl === '/api/claude') {
                console.log('[DEBUG] 로컬 서버를 통해 API 호출 시도');
                console.log('[DEBUG] 현재 URL:', window.location.href);
                console.log('[DEBUG] API 키 존재:', !!apiKey);
                console.log('[DEBUG] 요청 URL:', window.location.origin + '/api/claude');
                console.log('[DEBUG] fetch 호출 시작...');
                
                const response = await fetch('/api/claude', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        apiKey: apiKey.trim(),
                        model: 'claude-sonnet-4-5-20250929',
                        max_tokens: 200,
                        temperature: 0.3,
                        system: 'You are a helpful assistant that explains the meaning of Korean-Japanese translation terms concisely.',
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ]
                    })
                });
                
                console.log('[DEBUG] fetch 호출 완료');
                console.log('[DEBUG] 응답 상태:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[DEBUG] 응답 오류:', errorText);
                    // 로컬 서버가 없으면 직접 호출 시도 (CORS 오류 발생하지만 사용자에게 안내)
                    throw new Error('로컬 서버가 실행되지 않았습니다. Python 서버를 실행해주세요: python server.py');
                }
                
                const data = await response.json();
                console.log('[DEBUG] 응답 데이터 받음');
                
                if (!data.content || !data.content[0] || !data.content[0].text) {
                    throw new Error('API 응답 형식이 올바르지 않습니다.');
                }
                
                let meaning = data.content[0].text.trim();
                
                if (!meaning) {
                    throw new Error('의미를 생성할 수 없습니다.');
                }
                
                // 한국어와 일본어 의미를 파싱하여 엔터로 구분
                meaning = this.parseMeaning(meaning);
                
                // 데이터 업데이트
                post.meaning = meaning;
                this.saveData();
                this.renderPosts();
                return;
            }
            
            // 직접 API 호출 (CORS 오류 발생 가능)
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey.trim(),
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 200,
                    temperature: 0.3,
                    system: 'You are a helpful assistant that explains the meaning of Korean-Japanese translation terms concisely.',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    const responseText = await response.text();
                    console.error('API 오류 응답:', responseText);
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    console.error('응답 파싱 실패:', e);
                }
                
                let errorMessage = `API 오류: ${response.status}`;
                
                if (response.status === 401) {
                    errorMessage = 'API 키가 유효하지 않습니다. API 키를 확인해주세요.';
                } else if (response.status === 429) {
                    errorMessage = 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
                } else if (errorData.error) {
                    if (errorData.error.message) {
                        errorMessage = errorData.error.message;
                    } else if (errorData.error.type) {
                        errorMessage = `오류 타입: ${errorData.error.type}`;
                    }
                }
                
                console.error('API 오류 상세:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                });
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('API 응답 형식이 올바르지 않습니다.');
            }
            
            let meaning = data.content[0].text.trim();
            
            if (!meaning) {
                throw new Error('의미를 생성할 수 없습니다.');
            }
            
            // 한국어와 일본어 의미를 파싱하여 엔터로 구분
            meaning = this.parseMeaning(meaning);
            
            // 데이터 업데이트
            post.meaning = meaning;
            this.saveData();
            this.renderPosts();
        } catch (error) {
            console.error('의미 생성 오류:', error);
            console.error('오류 상세:', {
                message: error.message,
                stack: error.stack,
                apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : '없음'
            });
            
            if (meaningCell) {
                meaningCell.textContent = '생성 실패';
                meaningCell.style.color = '#e74c3c';
            }
            
            // 더 명확한 오류 메시지 표시
            let errorMsg = error.message || '의미 생성에 실패했습니다.';
            
            // 네트워크 오류인 경우
            if (error.message && error.message.includes('Failed to fetch')) {
                errorMsg = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
            }
            
            alert(errorMsg + '\n\n브라우저 콘솔(F12)에서 상세 오류를 확인할 수 있습니다.');
        }
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 전역 인스턴스
let discussionManager;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    discussionManager = new DiscussionManager();
    
    // 의견 작성 버튼 이벤트 위임
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('submit-comment-btn')) {
            const postId = parseInt(e.target.getAttribute('data-post-id'));
            discussionManager.addComment(postId);
        }
        if (e.target.classList.contains('cancel-comment-btn')) {
            const postId = parseInt(e.target.getAttribute('data-post-id'));
            const container = document.querySelector(`.comments-container-popup[data-post-id="${postId}"]`);
            if (container) {
                container.style.display = 'none';
                const badge = document.querySelector(`.comment-count-badge[data-post-id="${postId}"]`);
                if (badge) badge.classList.remove('active');
            }
        }
    });
    
    // 편집 가능한 셀 이벤트 리스너 연결 (렌더링 후)
    setTimeout(() => {
        discussionManager.attachEditableCellListeners();
    }, 100);
});
