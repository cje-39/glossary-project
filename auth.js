// 인증 관리
(function() {
    const HUB_PAGE = 'hub.html';
    
    // 현재 페이지가 hub인지 확인
    function isHubPage() {
        const pathname = window.location.pathname;
        const href = window.location.href;
        const filename = pathname.split('/').pop() || '';
        
        // index.html이면 hub가 아님
        if (filename === 'index.html' || pathname.includes('index.html') || href.includes('index.html')) {
            return false;
        }
        
        // hub.html만 hub 페이지로 인식
        if (filename === HUB_PAGE || pathname.endsWith('/hub.html')) {
            return true;
        }
        
        // 루트 경로('/')인 경우, index.html이 아닌 경우만 hub로 인식
        // 하지만 명시적으로 hub.html이 아니면 false
        if (pathname === '/' || pathname === '') {
            // index.html이 명시적으로 있으면 false
            if (href.includes('index.html')) {
                return false;
            }
            // 그 외에는 hub로 간주 (기본 페이지가 hub일 수 있음)
            return true;
        }
        
        return false;
    }
    
    // 로그인 상태 확인 및 리다이렉트
    function checkAuthAndRedirect() {
        if (isHubPage()) {
            // hub 페이지는 로그인 체크만 하고 리다이렉트하지 않음
            return;
        }
        
        // 다른 페이지는 로그인 상태 확인
        if (window.AuthHelper && !window.AuthHelper.isAuthenticated()) {
            // 로그인 안 되어있으면 hub로 리다이렉트
            window.location.href = HUB_PAGE;
        }
    }
    
    // 사용자명 표시 및 프로필 드롭다운 추가
    function addUserDisplay() {
        // 이미 추가되어 있으면 스킵
        if (document.getElementById('userDisplay')) {
            return;
        }
        
        const user = window.AuthHelper.getCurrentUser();
        if (!user) return;
        
        // 사용자명 가져오기 (이메일 또는 displayName)
        const userName = user.displayName || user.email?.split('@')[0] || '사용자';
        
        const userDisplay = document.createElement('div');
        userDisplay.id = 'userDisplay';
        userDisplay.className = 'user-display';
        
        // 사용자명 텍스트
        const userNameText = document.createElement('span');
        userNameText.className = 'user-name';
        userNameText.textContent = userName;
        
        // 프로필 아이콘
        const profileIcon = document.createElement('div');
        profileIcon.className = 'user-profile-icon';
        profileIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="12" r="6" fill="white"/><path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white"/></svg>';
        
        userDisplay.appendChild(userNameText);
        userDisplay.appendChild(profileIcon);
        
        // 드롭다운 메뉴
        const dropdown = document.createElement('div');
        dropdown.id = 'userDropdown';
        dropdown.className = 'user-dropdown';
        dropdown.style.display = 'none';
        
        const profileOption = document.createElement('div');
        profileOption.className = 'user-dropdown-item';
        profileOption.textContent = '프로필';
        profileOption.onclick = (e) => {
            e.stopPropagation();
            hideUserDropdown();
            // 프로필 모달 표시 (hub 페이지인 경우) 또는 hub로 이동
            if (window.showChangePasswordModal) {
                window.showChangePasswordModal();
            } else {
                // 다른 페이지에서는 hub로 이동
                window.location.href = HUB_PAGE;
            }
        };
        
        const logoutOption = document.createElement('div');
        logoutOption.className = 'user-dropdown-item';
        logoutOption.textContent = '로그아웃';
        logoutOption.onclick = async (e) => {
            e.stopPropagation();
            try {
                await window.AuthHelper.signOut();
                window.location.href = HUB_PAGE;
            } catch (error) {
                console.error('로그아웃 실패:', error);
                alert('로그아웃에 실패했습니다.');
            }
        };
        
        dropdown.appendChild(profileOption);
        dropdown.appendChild(logoutOption);
        
        userDisplay.appendChild(dropdown);
        
        // 클릭 이벤트
        userDisplay.onclick = (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            if (isOpen) {
                hideUserDropdown();
            } else {
                showUserDropdown();
            }
        };
        
        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', (e) => {
            if (!userDisplay.contains(e.target)) {
                hideUserDropdown();
            }
        });
        
        // body의 첫 번째 자식으로 추가
        const body = document.body;
        if (body.firstChild) {
            body.insertBefore(userDisplay, body.firstChild);
        } else {
            body.appendChild(userDisplay);
        }
    }
    
    // 사용자 드롭다운 표시
    function showUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }
    
    // 사용자 드롭다운 숨기기
    function hideUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    // 초기화
    async function init() {
        // Firebase 초기화 대기
        if (typeof initFirebase === 'function') {
            try {
                await initFirebase();
            } catch (error) {
                console.error('Firebase 초기화 실패:', error);
            }
        }
        
        // Firebase SDK 로드 대기
        if (typeof waitForFirebaseSDK === 'function') {
            try {
                await waitForFirebaseSDK();
            } catch (error) {
                console.error('Firebase SDK 로드 실패:', error);
            }
        }
        
        // 인증 상태 리스너
        if (window.AuthHelper) {
            window.AuthHelper.onAuthStateChanged((user) => {
                const userDisplay = document.getElementById('userDisplay');
                
                if (user) {
                    // 로그인 상태
                    // hub 페이지에서만 사용자 표시 추가
                    if (isHubPage()) {
                        // 기존 프로필이 있으면 제거 후 다시 추가 (위치 보정)
                        if (userDisplay) {
                            userDisplay.remove();
                        }
                        addUserDisplay();
                    } else {
                        // 다른 페이지(index.html 등)에서는 사용자 표시 제거
                        if (userDisplay) {
                            userDisplay.remove();
                        }
                        checkAuthAndRedirect();
                    }
                } else {
                    // 로그아웃 상태
                    if (userDisplay) {
                        userDisplay.remove();
                    }
                    checkAuthAndRedirect();
                }
            });
        } else {
            // AuthHelper가 없으면 잠시 후 다시 시도
            setTimeout(init, 100);
        }
        
        // 초기 로드 시에도 프로필 제거 (index.html인 경우)
        if (!isHubPage()) {
            const existingUserDisplay = document.getElementById('userDisplay');
            if (existingUserDisplay) {
                existingUserDisplay.remove();
            }
        }
    }
    
    // DOM 로드 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
