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
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('discussion', 'posts');
                if (data && data.posts) {
                    this.posts = data.posts.map(post => {
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
                    // LocalStorage에도 백업 저장
                    localStorage.setItem('discussionPosts', JSON.stringify(this.posts));
                    
                    // 실시간 동기화 설정
                    FirestoreHelper.onSnapshot('discussion', 'posts', (data) => {
                        if (data && data.posts) {
                            // 로컬 posts를 맵으로 변환하여 meaning 필드 보존
                            const localPostsMap = new Map();
                            this.posts.forEach(localPost => {
                                if (localPost.meaning) {
                                    localPostsMap.set(localPost.id, localPost.meaning);
                                }
                            });
                            
                            this.posts = data.posts.map(post => {
                                // 로컬에 meaning이 있으면 보존
                                const localMeaning = localPostsMap.get(post.id);
                                
                                if (post.term && !post.kr) {
                                    return {
                                        ...post,
                                        kr: post.term,
                                        jp: post.term,
                                        category: post.category || '',
                                        meaning: localMeaning || post.meaning || ''
                                    };
                                }
                                return {
                                    ...post,
                                    kr: post.kr || '',
                                    jp: post.jp || '',
                                    category: post.category || '',
                                    meaning: localMeaning || post.meaning || ''
                                };
                            });
                            localStorage.setItem('discussionPosts', JSON.stringify(this.posts));
                            this.renderPosts();
                        }
                    });
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 토론 데이터 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
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
    async saveData() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('discussionPosts', JSON.stringify(this.posts));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('discussion', 'posts', {
                    posts: this.posts
                });
            }
        } catch (error) {
            console.error('Firestore에 토론 데이터 저장 실패:', error);
        }
    }

    // 작성자 로드
    async loadAuthors() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('discussion', 'authors');
                if (data && data.authors) {
                    this.authors = data.authors;
                    localStorage.setItem('discussionAuthors', JSON.stringify(this.authors));
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 작성자 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedAuthors = localStorage.getItem('discussionAuthors');
        if (savedAuthors) {
            this.authors = JSON.parse(savedAuthors);
        } else {
            this.authors = [];
        }
    }

    // 작성자 저장
    async saveAuthors() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('discussionAuthors', JSON.stringify(this.authors));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('discussion', 'authors', {
                    authors: this.authors
                });
            }
        } catch (error) {
            console.error('Firestore에 작성자 저장 실패:', error);
        }
    }

    // 카테고리 로드
    async loadCategories() {
        try {
            // Firestore에서 먼저 시도
            if (window.FirestoreHelper) {
                const data = await FirestoreHelper.load('discussion', 'categories');
                if (data && data.categories) {
                    this.categories = data.categories;
                    localStorage.setItem('discussionCategories', JSON.stringify(this.categories));
                    return;
                }
            }
        } catch (error) {
            console.log('Firestore에서 카테고리 로드 실패, LocalStorage 사용:', error);
        }

        // LocalStorage에서 로드
        const savedCategories = localStorage.getItem('discussionCategories');
        if (savedCategories) {
            this.categories = JSON.parse(savedCategories);
        } else {
            this.categories = [];
        }
    }

    // 카테고리 저장
    async saveCategories() {
        // LocalStorage에 저장 (즉시 반응)
        localStorage.setItem('discussionCategories', JSON.stringify(this.categories));
        
        // Firestore에도 저장 (비동기)
        try {
            if (window.FirestoreHelper) {
                await FirestoreHelper.save('discussion', 'categories', {
                    categories: this.categories
                });
            }
        } catch (error) {
            console.error('Firestore에 카테고리 저장 실패:', error);
        }
    }

    // API 키 관련 이벤트 리스너 설정
    setupApiKeyListeners() {
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        const apiKeyInput = document.getElementById('claudeApiKeyInput');
        
        // API 키 상태 표시 업데이트 함수
        const updateApiKeyStatus = () => {
            const apiKey = localStorage.getItem('claude_api_key');
            const apiKeySection = document.getElementById('apiKeySection');
            const statusText = document.getElementById('apiKeyStatus');
            
            // API 키가 있으면 섹션 숨기기, 없으면 표시
            if (apiKeySection) {
                if (apiKey && apiKey.trim()) {
                    apiKeySection.style.display = 'none';
                } else {
                    apiKeySection.style.display = 'block';
                }
            }
            
            if (statusText) {
                if (apiKey && apiKey.trim()) {
                    statusText.textContent = '✅ API 키가 저장되어 있습니다. 번역어 자동 제안(AI) 기능을 사용할 수 있습니다.';
                    statusText.style.color = '#27ae60';
                } else {
                    statusText.textContent = '⚠️ API 키가 없습니다. 번역어 자동 제안(AI) 기능을 사용할 수 없습니다.';
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
                    alert('✅ API 키가 저장되었습니다. 이제 번역어 자동 제안(AI) 기능을 사용할 수 있습니다.');
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
                document.getElementById('postForm').reset();
                document.getElementById('postForm').removeAttribute('data-edit-id');
                document.getElementById('modalTitle').textContent = '토론 등록하기';
                document.getElementById('postModal').classList.add('show');
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

    // 게시물 수정
    editPost(id) {
        const post = this.posts.find(p => p.id === id);
        if (!post) return;

        // 폼에 기존 데이터 채우기
        document.getElementById('postAuthor').value = post.author || '';
        document.getElementById('postCategory').value = post.category || '';
        document.getElementById('postDirection').value = post.direction || '';
        document.getElementById('postKR').value = post.kr || '';
        document.getElementById('postJP').value = post.jp || '';
        document.getElementById('postContent').value = post.content || '';
        document.getElementById('postNote').value = post.note || '';

        // 수정 모드로 설정
        document.getElementById('postForm').setAttribute('data-edit-id', id);
        document.getElementById('modalTitle').textContent = '토론 수정하기';
        
        // 작성자 드롭다운 업데이트
        this.updateAuthorDropdown();
        
        // 팝업 열기
        document.getElementById('postModal').classList.add('show');
    }

    // 게시물 추가 또는 수정
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

        // 수정 모드인지 확인
        const editId = document.getElementById('postForm').getAttribute('data-edit-id');
        
        if (editId) {
            // 수정 모드
            const post = this.posts.find(p => p.id === parseInt(editId));
            if (post) {
                post.author = author;
                post.category = category || '';
                post.direction = direction;
                post.kr = kr;
                post.jp = jp;
                post.content = content;
                post.note = note || '';
                // meaning은 유지
            }
        } else {
            // 추가 모드
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
            
            // 자동으로 번역어 자동 제안(AI) 생성 (조용히, alert 없이)
            this.generateMeaning(newId, true);
        }

        this.saveData();
        this.renderPosts();
        document.getElementById('postModal').classList.remove('show');
        document.getElementById('postForm').reset();
        document.getElementById('postForm').removeAttribute('data-edit-id');
    }

    // 게시물 삭제
    deletePost(id) {
        if (confirm('정말 이 게시물을 삭제하시겠습니까?')) {
            this.posts = this.posts.filter(p => p.id !== id);
            this.saveData();
            this.renderPosts();
        }
    }

    // 번역어 자동 제안(AI) 삭제
    deleteMeaning(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            post.meaning = '';
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

        // 디버깅: this.posts 배열의 meaning 확인
        console.log('[DEBUG] renderPosts - this.posts 배열:', this.posts.map(p => ({ id: p.id, meaning: p.meaning ? p.meaning.substring(0, 50) + '...' : '(empty)' })));

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
            html += '<th>번역어 자동 제안(AI)</th>';
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
            html += '<h3 class="section-title resolved-title">해결!</h3>';
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
            html += '<th>번역어 자동 제안(AI)</th>';
            html += '<th></th>';
            html += '</tr></thead>';
            html += '<tbody>';
            html += resolvedPosts.map(post => this.renderPost(post)).join('');
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            html += '</div>';
        }

        console.log('[DEBUG] renderPosts - container.innerHTML 설정 전');
        console.log('[DEBUG] renderPosts - html 길이:', html ? html.length : 0);
        container.innerHTML = html;
        console.log('[DEBUG] renderPosts - container.innerHTML 설정 후');
        
        // 의미가 제대로 렌더링되었는지 확인
        const meaningCells = document.querySelectorAll('.meaning-content');
        console.log('[DEBUG] renderPosts - 의미 셀 개수:', meaningCells.length);
        meaningCells.forEach(cell => {
            const postId = cell.getAttribute('data-post-id');
            const meaning = cell.textContent;
            console.log(`[DEBUG] renderPosts - postId: ${postId}, meaning: ${meaning ? meaning.substring(0, 50) + '...' : '(empty)'}`);
        });
    }

    // 개별 게시물 렌더링 (테이블 행)
    renderPost(post) {
        console.log(`[DEBUG] renderPost - postId: ${post.id}, post.meaning:`, post.meaning ? post.meaning.substring(0, 50) + '...' : '(empty)');
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
                            <button class="btn-edit-comment" onclick="window.discussionManager && window.discussionManager.editComment(${post.id}, ${comment.id})" title="수정">✎</button>
                            <button class="btn-delete-comment" onclick="window.discussionManager && window.discussionManager.deleteComment(${post.id}, ${comment.id})" title="삭제">-</button>
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

        const commentCountBadge = `<span class="comment-count-badge ${commentCount > 0 ? 'has-comments' : ''}" data-post-id="${post.id}" onclick="window.discussionManager && window.discussionManager.toggleCommentsList(${post.id}, event)">💬 ${commentCount}</span>`;

        // 작성자 드롭다운
        const authorOptions = this.authors.map(author =>
            `<option value="${this.escapeHtml(author)}" ${post.author === author ? 'selected' : ''}>${this.escapeHtml(author)}</option>`
        ).join('');
        const authorSelect = `<select class="cell-dropdown" data-field="author" data-post-id="${post.id}" onchange="window.discussionManager && window.discussionManager.updateCellValue(${post.id}, 'author', this.value)"><option value="">선택</option>${authorOptions}</select>`;

        // 카테고리 드롭다운 (입력 가능)
        const categoryOptions = this.categories.map(cat =>
            `<option value="${this.escapeHtml(cat)}" ${post.category === cat ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
        ).join('');
        const categorySelect = `<select class="cell-dropdown cell-dropdown-editable" data-field="category" data-post-id="${post.id}" onchange="window.discussionManager && window.discussionManager.handleCategoryChange(${post.id}, this.value, this)"><option value="">선택</option>${categoryOptions}<option value="__NEW__">+ 새 카테고리</option></select><input type="text" class="cell-input-new" data-field="category" data-post-id="${post.id}" placeholder="새 카테고리 입력 후 Enter" style="display: none;" onkeypress="if(event.key==='Enter') { window.discussionManager && window.discussionManager.addNewCategory(${post.id}, this.value, this); }" onblur="this.style.display='none';">`;

        // 언어방향 드롭다운
        const directionSelect = `<select class="cell-dropdown" data-field="direction" data-post-id="${post.id}" onchange="window.discussionManager && window.discussionManager.updateCellValue(${post.id}, 'direction', this.value)"><option value="">선택</option><option value="한일" ${post.direction === '한일' ? 'selected' : ''}>한일</option><option value="일한" ${post.direction === '일한' ? 'selected' : ''}>일한</option></select>`;

        return `
            <tr data-post-id="${post.id}" data-resolved="${post.resolved}">
                <td class="row-resolve">
                    <label class="resolve-checkbox-label">
                        <input type="checkbox" class="resolve-checkbox" ${post.resolved ? 'checked' : ''} onchange="window.discussionManager && window.discussionManager.toggleResolved(${post.id})">
                    </label>
                </td>
                <td class="row-author">${authorSelect}</td>
                <td class="row-category">${categorySelect}</td>
                <td class="row-direction">${directionSelect}</td>
                <td class="row-kr">${this.escapeHtml(post.kr || '')}</td>
                <td class="row-jp">${this.escapeHtml(post.jp || '')}</td>
                <td class="row-opinion opinion-cell-wrapper">
                    <div class="opinion-cell-content">
                        <div>${this.escapeHtml((post.content || '').trim())}</div>
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
                    <div class="editable-note">${post.note ? this.escapeHtml(post.note) : ''}</div>
                </td>
                <td class="row-meaning">
                    <div class="meaning-cell-wrapper">
                        <div class="meaning-content" data-post-id="${post.id}" style="white-space: pre-line;">${post.meaning ? this.escapeHtml(post.meaning) : ''}</div>
                        <button class="btn-generate-meaning" onclick="window.discussionManager && window.discussionManager.generateMeaning(${post.id}, false)" title="번역어 자동 제안(AI)">💡</button>
                    </div>
                </td>
                <td class="row-actions">
                    <button class="btn-edit-post" onclick="window.discussionManager && window.discussionManager.editPost(${post.id})" title="수정">-</button>
                    <button class="btn-delete-post" onclick="window.discussionManager && window.discussionManager.deletePost(${post.id})" title="삭제">×</button>
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
    // 셀 클릭 편집 기능 제거됨 - 수정은 팝업을 통해서만 가능
    attachEditableCellListeners() {
        // 기능 제거됨
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
                <button class="btn-save-comment" onclick="window.discussionManager && window.discussionManager.saveCommentEdit(${postId}, ${commentId})" title="저장">✓</button>
            `;
            deleteBtn.outerHTML = `
                <button class="btn-cancel-comment-edit" onclick="window.discussionManager && window.discussionManager.cancelCommentEdit(${postId}, ${commentId}, '${this.escapeHtml(currentContent)}', '${this.escapeHtml(currentAuthor)}')" title="취소">×</button>
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

    // 번역어 제안 파싱 (불렛포인트 리스트로 변환)
    parseTranslationSuggestions(text) {
        console.log('[DEBUG] parseTranslationSuggestions 입력:', text);
        const lines = text.split('\n');
        const suggestions = [];
        
        for (let line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // 불렛포인트 제거 (•, -, ・ 등)
            let cleaned = trimmedLine.replace(/^[•\-・]\s*/, '').trim();
            // 마크다운 볼드 제거
            cleaned = cleaned.replace(/\*\*/g, '').trim();
            // 숫자로 시작하는 경우 제거 (1. 2. 등)
            cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '').trim();
            // 괄호 제거
            cleaned = cleaned.replace(/^[\(\)\[\]]\s*/, '').trim();
            
            if (cleaned) {
                suggestions.push(cleaned);
            }
        }
        
        // 2~3개만 선택 (최대 3개)
        const result = suggestions.slice(0, 3).map(s => '• ' + s).join('\n');
        console.log('[DEBUG] parseTranslationSuggestions 최종 반환값:', result);
        return result || text; // 파싱 실패 시 원본 반환
    }

    // 의미 파싱 (한국어와 일본어를 엔터로 구분, 라벨 제거, 불렛포인트 처리)
    parseMeaning(text) {
        console.log('[DEBUG] parseMeaning 입력:', text);
        // 줄 단위로 파싱하여 한국어와 일본어 의미를 완전히 추출
        const lines = text.split('\n');
        let krMeaning = '';
        let jpMeaning = '';
        let currentSection = null;
        let currentContent = [];
        
        for (let line of lines) {
            const trimmedLine = line.trim();
            console.log('[DEBUG] 파싱 중인 줄:', trimmedLine, '현재 섹션:', currentSection);
            
            // 한국어 라벨 확인 (마크다운 볼드 포함, 라벨만 있는 경우도 처리)
            // • 한국어: 또는 한국어: 패턴 모두 인식
            if (/^[•\-・]?\s*\*\*?\s*한국어[:\s]/i.test(trimmedLine) || /^[•\-・]?\s*한국어[:\s]/i.test(trimmedLine) || /한국어[:\s]/i.test(trimmedLine)) {
                // 이전 섹션 저장
                if (currentSection === 'kr' && currentContent.length > 0) {
                    krMeaning = currentContent.join(' ').trim();
                }
                currentSection = 'kr';
                currentContent = [];
                // 라벨 제거하고 내용 추출 (마크다운 볼드 포함)
                let content = trimmedLine.replace(/^[•\-・]?\s*\*\*?\s*한국어[:\s]*\*\*?\s*/i, '').trim(); // **한국어:** 패턴
                content = content.replace(/^[•\-・]?\s*한국어[:\s]*/i, '').trim(); // 한국어: 패턴
                // 라벨이 줄 중간에 있어도 인식
                if (content === trimmedLine && /한국어[:\s]/i.test(trimmedLine)) {
                    content = trimmedLine.replace(/.*?한국어[:\s]*/i, '').trim();
                }
                if (content) {
                    currentContent.push(content);
                    console.log('[DEBUG] 한국어 내용 추가:', content);
                }
            }
            // 일본어 라벨 확인 (마크다운 볼드 포함, 日本語: 패턴도 처리)
            // • 日本語: 또는 日本語: 패턴 모두 인식
            else if (/^[•\-・]?\s*\*\*?\s*(?:일본어|日本語)[:\s]/i.test(trimmedLine) || /^[•\-・]?\s*(?:일본어|日本語)[:\s]/i.test(trimmedLine) || /(?:일본어|日本語)[:\s]/i.test(trimmedLine)) {
                // 이전 섹션 저장
                if (currentSection === 'kr' && currentContent.length > 0) {
                    krMeaning = currentContent.join(' ').trim();
                    console.log('[DEBUG] 한국어 의미 저장:', krMeaning);
                } else if (currentSection === 'jp' && currentContent.length > 0) {
                    jpMeaning = currentContent.join(' ').trim();
                    console.log('[DEBUG] 일본어 의미 저장:', jpMeaning);
                }
                currentSection = 'jp';
                currentContent = [];
                // 라벨 제거하고 내용 추출 (마크다운 볼드 포함)
                let content = trimmedLine.replace(/^[•\-・]?\s*\*\*?\s*(?:일본어|日本語)[:\s]*\*\*?\s*/i, '').trim(); // **日本語:** 패턴
                content = content.replace(/^[•\-・]?\s*(?:일본어|日本語)[:\s]*/i, '').trim(); // 日本語: 패턴
                // 라벨이 줄 중간에 있어도 인식
                if (content === trimmedLine && /(?:일본어|日本語)[:\s]/i.test(trimmedLine)) {
                    content = trimmedLine.replace(/.*?(?:일본어|日本語)[:\s]*/i, '').trim();
                }
                if (content) {
                    currentContent.push(content);
                    console.log('[DEBUG] 일본어 내용 추가:', content);
                }
            }
            // 현재 섹션에 내용 추가 (해시태그 제거)
            else if (currentSection && trimmedLine) {
                // 해시태그 제거
                let cleanLine = trimmedLine.replace(/#[^\s]*/g, '').trim();
                // 불필요한 불렛포인트나 구분자 제거
                cleanLine = cleanLine.replace(/^[•・\-]\s*/, '').trim();
                if (cleanLine) {
                    currentContent.push(cleanLine);
                    console.log('[DEBUG] 현재 섹션에 내용 추가:', currentSection, cleanLine);
                }
            }
        }
        
        // 마지막 섹션 저장
        if (currentSection === 'kr' && currentContent.length > 0) {
            krMeaning = currentContent.join(' ').trim();
            console.log('[DEBUG] 마지막 한국어 의미 저장:', krMeaning);
        } else if (currentSection === 'jp' && currentContent.length > 0) {
            jpMeaning = currentContent.join(' ').trim();
            console.log('[DEBUG] 마지막 일본어 의미 저장:', jpMeaning);
        }
        
        // 정리 작업
        if (krMeaning) {
            // 마크다운 볼드(**텍스트**) 제거
            krMeaning = krMeaning.replace(/\*\*/g, '').trim();
            // 해시태그 제거
            krMeaning = krMeaning.replace(/#[^\s]*/g, '').trim();
            // 콜론 제거 (라벨 뒤의 콜론은 이미 제거되었지만, 의미 안에 있는 콜론도 제거)
            krMeaning = krMeaning.replace(/^:\s*/, '').trim();
            // 라벨 제거
            krMeaning = krMeaning.replace(/^(?:한국어|日本語|일본어)[:\s]+/i, '').trim();
            // 불필요한 불렛포인트나 구분자 제거
            krMeaning = krMeaning.replace(/^[•・\-]\s*/, '').trim();
        }
        
        if (jpMeaning) {
            // 마크다운 볼드(**텍스트**) 제거
            jpMeaning = jpMeaning.replace(/\*\*/g, '').trim();
            // 해시태그 제거
            jpMeaning = jpMeaning.replace(/#[^\s]*/g, '').trim();
            // 콜론 제거
            jpMeaning = jpMeaning.replace(/^:\s*/, '').trim();
            // 라벨 제거
            jpMeaning = jpMeaning.replace(/^(?:한국어|日本語|일본어)[:\s]+/i, '').trim();
            // 불필요한 불렛포인트나 구분자 제거
            jpMeaning = jpMeaning.replace(/^[•・\-]\s*/, '').trim();
        }
        
        console.log('[DEBUG] 정리 후 krMeaning:', krMeaning, 'jpMeaning:', jpMeaning);
        
        // 파싱이 실패하면 원본 텍스트에서 라벨만 제거
        if (!krMeaning && !jpMeaning) {
            console.log('[DEBUG] 파싱 실패 - 원본 텍스트에서 라벨만 제거:', text);
            let cleaned = text;
            // 라벨 제거 (더 포괄적인 패턴)
            cleaned = cleaned.replace(/^[•\-・]?\s*\*\*?\s*한국어[:\s]*\*\*?\s*/gi, '').trim();
            cleaned = cleaned.replace(/^[•\-・]?\s*한국어[:\s]*/gi, '').trim();
            cleaned = cleaned.replace(/[•\-・]?\s*\*\*?\s*(?:일본어|日本語)[:\s]*\*\*?\s*/gi, '').trim();
            cleaned = cleaned.replace(/[•\-・]?\s*(?:일본어|日本語)[:\s]*/gi, '').trim();
            // 마크다운 볼드(**텍스트**) 제거
            cleaned = cleaned.replace(/\*\*/g, '').trim();
            // 콜론 제거
            cleaned = cleaned.replace(/:\s*/g, ' ').trim();
            // 빈 줄 제거
            cleaned = cleaned.replace(/\n\s*\n/g, '\n').trim();
            console.log('[DEBUG] 파싱 실패 후 정리된 텍스트:', cleaned);
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
        
        const finalResult = result.join('\n');
        console.log('[DEBUG] parseMeaning 최종 반환값:', finalResult);
        return finalResult;
    }

    // AI로 의미 생성
    async generateMeaning(postId, silent = false) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const kr = post.kr || '';
        const jp = post.jp || '';
        const direction = post.direction || '';
        const note = post.note || ''; // 비고/예시문

        // 언어방향 확인
        if (!direction || (direction !== '한일' && direction !== '일한')) {
            if (!silent) alert('언어 방향을 선택해주세요.');
            return;
        }

        // 언어방향에 따라 소스 텍스트 확인
        let sourceText = '';
        let targetLanguage = '';
        if (direction === '한일') {
            if (!kr) {
                if (!silent) alert('한일 번역의 경우 KR 셀에 한국어 용어를 입력해주세요.');
                return;
            }
            sourceText = kr;
            targetLanguage = '일본어';
        } else { // 일한
            if (!jp) {
                if (!silent) alert('일한 번역의 경우 JP 셀에 일본어 용어를 입력해주세요.');
                return;
            }
            sourceText = jp;
            targetLanguage = '한국어';
        }

        // API 키 확인
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) {
            if (!silent) alert('Claude API 키가 필요합니다. 코퍼스 페이지에서 API 키를 설정해주세요.');
            return;
        }

        // 로딩 표시
        const meaningCell = document.querySelector(`.meaning-content[data-post-id="${postId}"]`);
        if (meaningCell) {
            meaningCell.textContent = '생성 중...';
            meaningCell.style.color = '#999';
        }

        try {
            // 번역어 자동 제안(AI) 프롬프트
            let prompt = '';
            
            if (note && note.trim()) {
                // 비고/예시문이 있는 경우: 문맥을 강조하여 프롬프트 작성
                prompt = `${direction === '한일' ? '한국어' : '일본어'} 용어: ${sourceText}

비고/예시문:
${note}

위 예시문의 문맥을 고려하여 "${sourceText}"를 ${targetLanguage}로 번역할 때 사용할 수 있는 번역어를 2~3개 제안해주세요.

형식:
• [번역어 1]
• [번역어 2]
• [번역어 3] (선택사항)

각 번역어는 한 줄씩 불렛포인트로 작성해주세요.`;
            } else {
                // 비고/예시문이 없는 경우: 일반적인 번역어 제안
                prompt = `다음은 ${direction === '한일' ? '한국어' : '일본어'} 용어입니다.

${direction === '한일' ? '한국어' : '일본어'}: ${sourceText}

이 용어를 ${targetLanguage}로 번역할 때 사용할 수 있는 번역어를 2~3개 제안해주세요.

형식:
• [번역어 1]
• [번역어 2]
• [번역어 3] (선택사항)

각 번역어는 한 줄씩 불렛포인트로 작성해주세요.`;
            }

            // Netlify Functions 또는 로컬 서버를 통해 API 호출
            let apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
            
            // apiUrl이 상대 경로인 경우에만 origin 추가
            if (apiUrl.startsWith('/')) {
                apiUrl = window.location.origin + apiUrl;
            }
            
            console.log('[DEBUG] API 호출 시도');
            console.log('[DEBUG] 현재 URL:', window.location.href);
            console.log('[DEBUG] API 키 존재:', !!apiKey);
            console.log('[DEBUG] 요청 URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 200,
                    temperature: 0.3,
                    system: 'You are a helpful assistant that suggests appropriate translations for Korean-Japanese terms.',
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
                let errorMessage = `API 오류: ${response.status}`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorData.error;
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 원본 텍스트 사용
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('[DEBUG] 응답 데이터 받음:', JSON.stringify(data, null, 2));
            
            // API 응답에서 텍스트 추출 (원래 방식으로 복원)
            if (!data.content || !data.content[0] || !data.content[0].text) {
                console.error('[DEBUG] API 응답 형식 오류:', data);
                throw new Error('API 응답 형식이 올바르지 않습니다.');
            }
            
            let suggestions = data.content[0].text.trim();
            console.log('[DEBUG] 추출된 번역어 제안 텍스트 (전체):', suggestions);
            console.log('[DEBUG] 번역어 제안 길이:', suggestions ? suggestions.length : 0);
            
            if (!suggestions) {
                throw new Error('번역어를 생성할 수 없습니다.');
            }
            
            // 번역어 제안을 파싱하여 불렛포인트 리스트로 변환
            console.log('[DEBUG] parseTranslationSuggestions 호출 전:', suggestions);
            suggestions = this.parseTranslationSuggestions(suggestions);
            console.log('[DEBUG] parseTranslationSuggestions 호출 후:', suggestions);
            
            // 데이터 업데이트
            console.log('[DEBUG] post.meaning에 저장할 값:', suggestions);
            post.meaning = suggestions;
            console.log('[DEBUG] post.meaning 저장 후:', post.meaning);
            this.saveData();
            console.log('[DEBUG] renderPosts 호출 전');
            this.renderPosts();
            console.log('[DEBUG] renderPosts 호출 후');
        } catch (error) {
            console.error('번역어 제안 생성 오류:', error);
            console.error('오류 상세:', {
                message: error.message,
                stack: error.stack,
                apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : '없음'
            });
            
            if (meaningCell) {
                meaningCell.textContent = '생성 실패: ' + (error.message || '알 수 없는 오류');
                meaningCell.style.color = '#e74c3c';
            }
            
            // 더 명확한 오류 메시지 표시
            let errorMsg = error.message || '번역어 제안 생성에 실패했습니다.';
            console.error('[DEBUG] 최종 오류 메시지:', errorMsg);
            
            // 네트워크 오류인 경우
            if (error.message && error.message.includes('Failed to fetch')) {
                errorMsg = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
            }
            
            // silent 모드가 아닐 때만 alert 표시
            if (!silent) {
                alert(errorMsg + '\n\n브라우저 콘솔(F12)에서 상세 오류를 확인할 수 있습니다.');
            }
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
    // 전역에서 접근 가능하도록 window에 할당
    window.discussionManager = discussionManager;
    
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
    
    // 셀 클릭 편집 기능 제거됨 - 수정은 팝업을 통해서만 가능
});
