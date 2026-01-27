// Netlify Functions 설정
// Firebase Hosting에서 Netlify Functions를 사용할 때 필요합니다.
// Netlify 사이트 URL을 여기에 입력하세요.
// 예: https://your-site-name.netlify.app

const NETLIFY_SITE_URL = 'https://monumental-kringle-4c13b3.netlify.app'; // Netlify 사이트 URL

// API 엔드포인트 URL 생성 함수
function getClaudeApiUrl() {
    // 현재 호스트가 Firebase인지 확인
    const isFirebase = window.location.hostname.includes('firebaseapp.com') || 
                       window.location.hostname.includes('web.app');
    
    // Firebase이고 Netlify URL이 설정되어 있으면 Netlify Functions 사용
    if (isFirebase && NETLIFY_SITE_URL) {
        return `${NETLIFY_SITE_URL}/.netlify/functions/claude`;
    }
    
    // 그 외의 경우 (Netlify 또는 로컬)
    return '/api/claude';
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.getClaudeApiUrl = getClaudeApiUrl;
}
