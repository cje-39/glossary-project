// Hub 페이지 인증 관리
(function() {
    const loginModal = document.getElementById('loginModal');
    const hubContent = document.getElementById('hubContent');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    // 로그인 처리
    async function handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const rememberMe = document.getElementById('rememberLogin').checked;
        
        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }
        
        try {
            // 로그인 버튼 비활성화
            const submitBtn = loginForm.querySelector('.login-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '로그인 중...';
            
            await window.AuthHelper.signInWithEmailAndPassword(email, password, rememberMe);
            
            // 로그인 성공
            hideLoginModal();
            showHubContent();
            
        } catch (error) {
            // 로그인 실패
            let errorMessage = '로그인에 실패했습니다.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 이메일입니다.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = '비밀번호가 틀렸습니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            }
            
            showError(errorMessage);
            
            // 로그인 버튼 다시 활성화
            const submitBtn = loginForm.querySelector('.login-submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
        }
    }
    
    // 에러 메시지 표시
    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
    
    // 에러 메시지 숨기기
    function hideError() {
        loginError.style.display = 'none';
    }
    
    // 로그인 모달 표시
    function showLoginModal() {
        if (loginModal) {
            loginModal.style.display = 'flex';
            document.getElementById('loginEmail').focus();
        }
    }
    
    // 로그인 모달 숨기기
    function hideLoginModal() {
        if (loginModal) {
            loginModal.style.display = 'none';
            loginForm.reset();
            hideError();
        }
    }
    
    // Hub 콘텐츠 표시
    function showHubContent() {
        if (hubContent) {
            hubContent.style.display = 'block';
        }
    }
    
    // Hub 콘텐츠 숨기기
    function hideHubContent() {
        if (hubContent) {
            hubContent.style.display = 'none';
        }
    }
    
    // 비밀번호 재설정 처리
    async function handlePasswordReset(e) {
        e.preventDefault();
        
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        const email = document.getElementById('resetEmail').value.trim();
        const resetError = document.getElementById('resetPasswordError');
        const resetSuccess = document.getElementById('resetPasswordSuccess');
        
        if (!email) {
            showResetError('이메일을 입력해주세요.');
            return;
        }
        
        try {
            const submitBtn = resetPasswordForm.querySelector('.login-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '발송 중...';
            
            await window.AuthHelper.sendPasswordResetEmail(email);
            
            console.log('[DEBUG] 비밀번호 재설정 이메일 발송 성공:', email);
            
            // 성공 메시지
            hideResetError();
            resetSuccess.textContent = `비밀번호 재설정 링크가 ${email}로 발송되었습니다. 스팸 폴더도 확인해주세요.`;
            resetSuccess.style.display = 'block';
            
            // 5초 후 모달 닫기
            setTimeout(() => {
                hideResetPasswordModal();
            }, 5000);
            
        } catch (error) {
            console.error('[DEBUG] 비밀번호 재설정 오류:', error);
            let errorMessage = '비밀번호 재설정 이메일 발송에 실패했습니다.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 이메일입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
            } else {
                errorMessage = `오류: ${error.message || error.code || '알 수 없는 오류'}`;
            }
            
            showResetError(errorMessage);
            
            const submitBtn = resetPasswordForm.querySelector('.login-submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = '재설정 링크 보내기';
        }
    }
    
    // 사용자 이름 변경 처리
    async function handleDisplayNameChange(e) {
        e.preventDefault();
        
        const changeDisplayNameForm = document.getElementById('changeDisplayNameForm');
        const displayName = document.getElementById('displayName').value.trim();
        const changeDisplayNameError = document.getElementById('changeDisplayNameError');
        const changeDisplayNameSuccess = document.getElementById('changeDisplayNameSuccess');
        
        if (!displayName) {
            showChangeDisplayNameError('사용자 이름을 입력해주세요.');
            return;
        }
        
        if (displayName.length < 2) {
            showChangeDisplayNameError('사용자 이름은 최소 2자 이상이어야 합니다.');
            return;
        }
        
        try {
            const submitBtn = changeDisplayNameForm.querySelector('.login-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '변경 중...';
            
            await window.AuthHelper.updateDisplayName(displayName);
            
            // 성공 메시지
            hideChangeDisplayNameError();
            changeDisplayNameSuccess.textContent = '사용자 이름이 성공적으로 변경되었습니다.';
            changeDisplayNameSuccess.style.display = 'block';
            
            // 사용자 표시 업데이트
            if (window.addUserDisplay) {
                // 기존 사용자 표시 제거 후 다시 추가
                const existingDisplay = document.getElementById('userDisplay');
                if (existingDisplay) {
                    existingDisplay.remove();
                }
                window.addUserDisplay();
            }
            
            // 2초 후 메시지 숨기기
            setTimeout(() => {
                changeDisplayNameSuccess.style.display = 'none';
            }, 2000);
            
            submitBtn.disabled = false;
            submitBtn.textContent = '이름 변경';
            
        } catch (error) {
            let errorMessage = '사용자 이름 변경에 실패했습니다.';
            
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = '보안을 위해 다시 로그인해주세요.';
            } else {
                errorMessage = `오류: ${error.message || error.code || '알 수 없는 오류'}`;
            }
            
            showChangeDisplayNameError(errorMessage);
            
            const submitBtn = changeDisplayNameForm.querySelector('.login-submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = '이름 변경';
        }
    }
    
    function showChangeDisplayNameError(message) {
        const error = document.getElementById('changeDisplayNameError');
        const success = document.getElementById('changeDisplayNameSuccess');
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
        }
        if (success) {
            success.style.display = 'none';
        }
    }
    
    function hideChangeDisplayNameError() {
        const error = document.getElementById('changeDisplayNameError');
        if (error) {
            error.style.display = 'none';
        }
    }
    
    // 비밀번호 변경 처리
    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const changePasswordForm = document.getElementById('changePasswordForm');
        const currentPassword = document.getElementById('currentPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const changeError = document.getElementById('changePasswordError');
        const changeSuccess = document.getElementById('changePasswordSuccess');
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showChangeError('모든 필드를 입력해주세요.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showChangeError('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        
        if (newPassword.length < 6) {
            showChangeError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }
        
        try {
            const submitBtn = changePasswordForm.querySelector('.login-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '변경 중...';
            
            await window.AuthHelper.updatePassword(currentPassword, newPassword);
            
            // 성공 메시지
            hideChangeError();
            changeSuccess.textContent = '비밀번호가 성공적으로 변경되었습니다.';
            changeSuccess.style.display = 'block';
            
            // 폼 초기화
            changePasswordForm.reset();
            
            // 2초 후 모달 닫기
            setTimeout(() => {
                hideChangePasswordModal();
            }, 2000);
            
        } catch (error) {
            let errorMessage = '비밀번호 변경에 실패했습니다.';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = '현재 비밀번호가 틀렸습니다.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = '비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = '보안을 위해 다시 로그인해주세요.';
            }
            
            showChangeError(errorMessage);
            
            const submitBtn = changePasswordForm.querySelector('.login-submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = '비밀번호 변경';
        }
    }
    
    // 비밀번호 재설정 모달 관련 함수
    function showResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('resetEmail').focus();
        }
    }
    
    function hideResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (modal) {
            modal.style.display = 'none';
            if (resetPasswordForm) resetPasswordForm.reset();
            hideResetError();
            const resetSuccess = document.getElementById('resetPasswordSuccess');
            if (resetSuccess) resetSuccess.style.display = 'none';
        }
    }
    
    function showResetError(message) {
        const resetError = document.getElementById('resetPasswordError');
        if (resetError) {
            resetError.textContent = message;
            resetError.style.display = 'block';
        }
    }
    
    function hideResetError() {
        const resetError = document.getElementById('resetPasswordError');
        if (resetError) {
            resetError.style.display = 'none';
        }
    }
    
    // 비밀번호 변경 모달 관련 함수 (전역으로 노출)
    function showChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // 현재 사용자 이름 표시
            const user = window.AuthHelper.getCurrentUser();
            if (user) {
                const displayNameInput = document.getElementById('displayName');
                if (displayNameInput) {
                    displayNameInput.value = user.displayName || user.email?.split('@')[0] || '';
                }
            }
            
            document.getElementById('displayName').focus();
        }
    }
    
    // 전역으로 노출
    window.showChangePasswordModal = showChangePasswordModal;
    
    function hideChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        const changePasswordForm = document.getElementById('changePasswordForm');
        const changeDisplayNameForm = document.getElementById('changeDisplayNameForm');
        if (modal) {
            modal.style.display = 'none';
            if (changePasswordForm) changePasswordForm.reset();
            if (changeDisplayNameForm) changeDisplayNameForm.reset();
            hideChangeError();
            hideChangeDisplayNameError();
            const changeSuccess = document.getElementById('changePasswordSuccess');
            if (changeSuccess) changeSuccess.style.display = 'none';
            const changeDisplayNameSuccess = document.getElementById('changeDisplayNameSuccess');
            if (changeDisplayNameSuccess) changeDisplayNameSuccess.style.display = 'none';
        }
    }
    
    function showChangeError(message) {
        const changeError = document.getElementById('changePasswordError');
        if (changeError) {
            changeError.textContent = message;
            changeError.style.display = 'block';
        }
    }
    
    function hideChangeError() {
        const changeError = document.getElementById('changePasswordError');
        if (changeError) {
            changeError.style.display = 'none';
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
        
        // 로그인 폼 제출 이벤트
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // 비밀번호 재설정 폼
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', handlePasswordReset);
        }
        
        // 비밀번호 변경 폼
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', handlePasswordChange);
        }
        
        // 사용자 이름 변경 폼
        const changeDisplayNameForm = document.getElementById('changeDisplayNameForm');
        if (changeDisplayNameForm) {
            changeDisplayNameForm.addEventListener('submit', handleDisplayNameChange);
        }
        
        // 비밀번호 재설정 링크 클릭
        
        // 취소 버튼
        const cancelResetBtn = document.getElementById('cancelResetBtn');
        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', () => {
                hideResetPasswordModal();
                showLoginModal();
            });
        }
        
        const cancelChangeBtn = document.getElementById('cancelChangeBtn');
        if (cancelChangeBtn) {
            cancelChangeBtn.addEventListener('click', () => {
                hideChangePasswordModal();
            });
        }
        
        // 프로필 모달 닫기 버튼 (X)
        const closeProfileModal = document.getElementById('closeProfileModal');
        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => {
                hideChangePasswordModal();
            });
        }
        
        // Enter 키 이벤트
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (emailInput && passwordInput) {
            [emailInput, passwordInput].forEach(input => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        loginForm.dispatchEvent(new Event('submit'));
                    }
                });
            });
        }
        
        // 인증 상태 확인
        if (window.AuthHelper) {
            window.AuthHelper.onAuthStateChanged((user) => {
                if (user) {
                    // 로그인 상태
                    hideLoginModal();
                    showHubContent();
                } else {
                    // 로그아웃 상태
                    showLoginModal();
                    hideHubContent();
                }
            });
        } else {
            // AuthHelper가 없으면 잠시 후 다시 시도
            setTimeout(init, 100);
        }
    }
    
    // DOM 로드 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
