// 알림 관리 시스템
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // DOM이 준비될 때까지 대기
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        await this.loadNotifications();
        this.setupEventListeners();
        this.updateBadge();
        this.renderNotifications();
        
        // 실시간 업데이트 리스너 설정
        this.setupRealtimeListener();
        
        this.initialized = true;
    }

    // Firebase Realtime Database 리스너 설정
    setupRealtimeListener() {
        if (window.RealtimeDBHelper) {
            RealtimeDBHelper.onValue('notifications', (data) => {
                console.log('알림 데이터 수신:', data);
                if (data) {
                    // 데이터를 배열로 변환
                    this.notifications = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    })).sort((a, b) => {
                        // 최신순 정렬
                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    });
                    console.log('알림 배열 변환 완료:', this.notifications.length, '개');
                    this.updateBadge();
                    this.renderNotifications();
                } else {
                    console.log('알림 데이터가 없습니다.');
                    this.notifications = [];
                    this.updateBadge();
                    this.renderNotifications();
                }
            });
        } else {
            console.warn('RealtimeDBHelper가 로드되지 않았습니다.');
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 알림 벨 클릭
        const bell = document.getElementById('notificationBell');
        if (bell) {
            // 기존 이벤트 리스너가 있다면 제거 (중복 방지)
            const newClickHandler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('알림 벨 클릭됨');
                this.showModal();
            };
            
            // 기존 핸들러 제거를 위해 클론 후 교체
            const bellClone = bell.cloneNode(true);
            bell.parentNode.replaceChild(bellClone, bell);
            
            // 새 핸들러 추가
            const bellElement = document.getElementById('notificationBell');
            if (bellElement) {
                bellElement.addEventListener('click', newClickHandler);
                console.log('알림 벨 이벤트 리스너 등록 완료');
            }
        } else {
            console.warn('notificationBell 요소를 찾을 수 없습니다.');
        }

        // 모두 읽음 버튼
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }

        // 모달 닫기 버튼
        const closeModal = document.getElementById('closeNotificationModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hideModal();
            });
        }

        // 모달 배경 클릭 시 닫기
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }

    // 모달 표시
    showModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            // 모달을 열 때 알림 다시 로드 및 렌더링
            this.loadNotifications().then(() => {
                this.renderNotifications();
                this.updateUnreadCountDisplay();
                // 모달을 화면 중앙에 표시
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                console.log('알림 모달 열림, 알림 개수:', this.notifications.length);
            });
        } else {
            console.error('notificationModal 요소를 찾을 수 없습니다.');
        }
    }

    // 모달 숨기기
    hideModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('알림 모달 닫힘');
        }
    }

    // 알림 로드
    async loadNotifications() {
        try {
            console.log('알림 로드 시작...');
            if (window.RealtimeDBHelper) {
                console.log('RealtimeDBHelper 사용');
                const data = await RealtimeDBHelper.get('notifications');
                console.log('RealtimeDB에서 가져온 데이터:', data);
                if (data) {
                    // 객체를 배열로 변환
                    this.notifications = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    })).sort((a, b) => {
                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    });
                    console.log('알림 로드 완료:', this.notifications.length, '개');
                } else {
                    console.log('RealtimeDB에 알림 데이터가 없습니다.');
                    this.notifications = [];
                }
            } else {
                console.log('RealtimeDBHelper 없음, LocalStorage 사용');
                // LocalStorage 폴백
                const saved = localStorage.getItem('notifications');
                if (saved) {
                    this.notifications = JSON.parse(saved);
                    console.log('LocalStorage에서 알림 로드:', this.notifications.length, '개');
                } else {
                    console.log('LocalStorage에도 알림 데이터가 없습니다.');
                    this.notifications = [];
                }
            }
        } catch (error) {
            console.error('알림 로드 실패:', error);
            this.notifications = [];
        }
    }

    // 알림 저장
    async saveNotifications() {
        try {
            if (window.RealtimeDBHelper) {
                // 배열을 객체로 변환
                const data = {};
                this.notifications.forEach(notif => {
                    data[notif.id] = {
                        type: notif.type,
                        pageUrl: notif.pageUrl,
                        pageId: notif.pageId,
                        korean: notif.korean,
                        japanese: notif.japanese,
                        read: notif.read,
                        createdAt: notif.createdAt,
                        category: notif.category || null
                    };
                });
                await RealtimeDBHelper.set('notifications', data);
            }
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('알림 저장 실패:', error);
        }
    }

    // 알림 생성
    async createNotification(notificationData) {
        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: notificationData.type || 'new_term',
            pageUrl: notificationData.pageUrl || '',
            pageId: notificationData.pageId || '',
            korean: notificationData.korean || '',
            japanese: notificationData.japanese || '',
            read: false,
            createdAt: notificationData.createdAt || new Date().toISOString(),
            category: notificationData.category || null
        };

        this.notifications.unshift(notification); // 최신순으로 앞에 추가
        await this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();

        return notification;
    }

    // 알림 읽음 처리
    async markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            await this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    }

    // 모두 읽음 처리
    async markAllAsRead() {
        let changed = false;
        this.notifications.forEach(notif => {
            if (!notif.read) {
                notif.read = true;
                changed = true;
            }
        });

        if (changed) {
            await this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    }

    // 알림 삭제
    async deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        await this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    // 알림 등록 (용어집에 추가)
    async registerTerm(notificationId, category = null) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) {
            return;
        }

        try {
            // 용어집에 추가
            if (window.glossaryManager) {
                const manager = window.glossaryManager;
                const korean = notification.korean.trim();
                const japanese = notification.japanese.trim();
                const selectedCategories = category ? [category] : [];

                if (!korean || !japanese) {
                    throw new Error('한국어와 일본어는 필수 입력 항목입니다.');
                }

                // 중복 체크
                const isDuplicate = manager.terms.some(t => 
                    t.korean === korean && t.japanese === japanese
                );

                if (isDuplicate) {
                    alert('이미 등록된 용어입니다.');
                    await this.deleteNotification(notificationId);
                    return;
                }

                // 새 ID 생성
                let newId = 1;
                if (manager.terms.length > 0) {
                    const maxId = Math.max(...manager.terms.map(t => t.id || 0));
                    newId = maxId >= 1 ? maxId + 1 : 1;
                }

                // 용어 추가
                manager.terms.push({
                    id: newId,
                    korean,
                    japanese,
                    category: selectedCategories,
                    notes: `Confluence 페이지에서 자동 추출: ${notification.pageUrl}`,
                    updatedAt: new Date().toISOString()
                });

                // 데이터 저장
                await manager.saveData();
                
                // 필터링 및 렌더링 업데이트
                manager.filterTerms();
                
                // 카테고리 뷰면 카드 다시 렌더링
                if (manager.currentView === 'categories') {
                    manager.renderCategoryCardsInitial();
                }

                // 알림 삭제
                await this.deleteNotification(notificationId);
                
                alert('용어가 성공적으로 등록되었습니다.');
            } else {
                throw new Error('GlossaryManager가 로드되지 않았습니다.');
            }
        } catch (error) {
            console.error('용어 등록 실패:', error);
            alert('용어 등록에 실패했습니다: ' + error.message);
        }
    }

    // 알림 무시
    async ignoreNotification(notificationId) {
        await this.deleteNotification(notificationId);
    }

    // 배지 업데이트
    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        this.updateUnreadCountDisplay();
    }

    // 읽지 않은 알림 개수 표시 업데이트
    updateUnreadCountDisplay() {
        const unreadCountDisplay = document.getElementById('unreadCountDisplay');
        if (unreadCountDisplay) {
            unreadCountDisplay.textContent = this.unreadCount;
        }
    }

    // 알림 목록 렌더링
    renderNotifications() {
        const list = document.getElementById('notificationList');
        const noNotifications = document.getElementById('noNotifications');
        
        console.log('알림 렌더링 시작:', {
            listExists: !!list,
            notificationsCount: this.notifications.length,
            notifications: this.notifications
        });
        
        if (!list) {
            console.error('notificationList 요소를 찾을 수 없습니다.');
            return;
        }

        if (this.notifications.length === 0) {
            list.innerHTML = '';
            if (noNotifications) {
                noNotifications.style.display = 'block';
            }
            console.log('알림이 없어서 "알림이 없습니다" 메시지 표시');
            return;
        }

        if (noNotifications) {
            noNotifications.style.display = 'none';
        }
        
        console.log('알림 목록 렌더링 중:', this.notifications.length, '개');

        try {
            list.innerHTML = this.notifications.map(notif => {
                const readClass = notif.read ? 'read' : 'unread';
                const timeAgo = this.getTimeAgo(notif.createdAt || new Date().toISOString());
                const korean = notif.korean || '(한국어 없음)';
                const japanese = notif.japanese || '(일본어 없음)';
                
                return `
                    <div class="notification-item ${readClass}" data-id="${notif.id}" style="border-bottom: 1px solid #f0f0f0; ${!notif.read ? 'background: #f8f9ff;' : ''}">
                        <div class="notification-content" style="padding: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        ${!notif.read ? '<div style="width: 8px; height: 8px; background: #2b68dc; border-radius: 50%; flex-shrink: 0;"></div>' : ''}
                                        <div style="font-weight: ${notif.read ? '400' : '600'}; color: #333; font-size: 14px;">
                                            새로운 용어가 감지되었습니다
                                        </div>
                                    </div>
                                    <div style="font-size: 13px; color: #666; margin-bottom: 6px; line-height: 1.6;">
                                        <div style="margin-bottom: 4px;"><strong>한국어:</strong> ${this.escapeHtml(korean)}</div>
                                        <div><strong>日本語:</strong> ${this.escapeHtml(japanese)}</div>
                                    </div>
                                    <div style="font-size: 11px; color: #999; margin-top: 6px;">
                                        ${timeAgo}
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button class="btn-register-term btn btn-primary" style="flex: 1; padding: 8px 16px; font-size: 13px;" data-id="${notif.id}">
                                    등록
                                </button>
                                <button class="btn-ignore-term btn btn-secondary" style="flex: 1; padding: 8px 16px; font-size: 13px;" data-id="${notif.id}">
                                    무시
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            console.log('알림 목록 HTML 생성 완료:', list.innerHTML.length, '문자');
        } catch (error) {
            console.error('알림 목록 렌더링 중 오류:', error);
            list.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">알림을 표시하는 중 오류가 발생했습니다.</div>';
        }

        // 이벤트 리스너 추가
        list.querySelectorAll('.btn-register-term').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notificationId = btn.getAttribute('data-id');
                await this.showRegisterModal(notificationId);
            });
        });

        list.querySelectorAll('.btn-ignore-term').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notificationId = btn.getAttribute('data-id');
                if (confirm('이 알림을 무시하시겠습니까?')) {
                    await this.ignoreNotification(notificationId);
                }
            });
        });

        // 알림 항목 클릭 시 읽음 처리
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.closest('button')) {
                    const notificationId = item.getAttribute('data-id');
                    await this.markAsRead(notificationId);
                }
            });
        });
    }

    // 등록 모달 표시
    async showRegisterModal(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // 카테고리 선택 모달 생성
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>용어 등록</h2>
                    <span class="close-modal" style="cursor: pointer; font-size: 24px; font-weight: bold;">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>한국어</label>
                        <input type="text" id="modalKorean" value="${this.escapeHtml(notification.korean)}" readonly style="background: #f5f5f5;">
                    </div>
                    <div class="form-group">
                        <label>日本語</label>
                        <input type="text" id="modalJapanese" value="${this.escapeHtml(notification.japanese)}" readonly style="background: #f5f5f5;">
                    </div>
                    <div class="form-group">
                        <label>카테고리 선택</label>
                        <div id="modalCategoryCheckboxes" class="category-checkboxes">
                            <!-- 카테고리 체크박스가 여기에 동적으로 추가됩니다 -->
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-primary" id="modalConfirmBtn">등록</button>
                        <button type="button" class="btn btn-secondary close-modal">취소</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 카테고리 체크박스 렌더링
        const checkboxesContainer = modal.querySelector('#modalCategoryCheckboxes');
        if (checkboxesContainer && window.glossaryManager) {
            window.glossaryManager.categories.forEach(category => {
                const checkbox = document.createElement('div');
                checkbox.className = 'category-checkbox-item';
                checkbox.innerHTML = `
                    <input type="checkbox" id="modalCat_${category}" value="${category}" name="modalCategory">
                    <label for="modalCat_${category}">${category}</label>
                `;
                checkboxesContainer.appendChild(checkbox);
            });
        }

        // 모달 닫기
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 등록 버튼
        const confirmBtn = modal.querySelector('#modalConfirmBtn');
        confirmBtn.addEventListener('click', async () => {
            const selectedCategories = Array.from(modal.querySelectorAll('input[name="modalCategory"]:checked'))
                .map(cb => cb.value);
            
            const category = selectedCategories.length > 0 ? selectedCategories[0] : null;
            await this.registerTerm(notificationId, category);
            closeModal();
        });
    }

    // 시간 경과 표시
    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        return date.toLocaleDateString('ko-KR');
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 전역 인스턴스 생성 (초기화는 DOM 준비 후)
window.NotificationManager = new NotificationManager();

// DOM 준비 후 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.NotificationManager) {
            window.NotificationManager.init();
        }
    });
} else {
    // 이미 로드된 경우
    setTimeout(() => {
        if (window.NotificationManager) {
            window.NotificationManager.init();
        }
    }, 100);
}
