// Netlify Functions 설정
// Firebase Hosting에서 Netlify Functions를 사용합니다.

const NETLIFY_SITE_URL = 'https://monumental-kringle-4c13b3.netlify.app'; // Netlify 사이트 URL

// API 엔드포인트 URL 생성 함수
function getClaudeApiUrl() {
    // 현재 호스트가 Firebase인지 확인
    const isFirebase = window.location.hostname.includes('firebaseapp.com') || 
                       window.location.hostname.includes('web.app');
    
    // Firebase인 경우 Netlify Functions 사용 (CORS 허용 필요)
    if (isFirebase && NETLIFY_SITE_URL) {
        return `${NETLIFY_SITE_URL}/.netlify/functions/claude`;
    }
    
    // 로컬 개발 환경
    return '/api/claude';
}

// Confluence API 엔드포인트 URL 생성 함수
function getConfluenceApiUrl() {
    // 현재 호스트가 Firebase인지 확인
    const isFirebase = window.location.hostname.includes('firebaseapp.com') || 
                       window.location.hostname.includes('web.app');
    
    // Firebase인 경우 Netlify Functions 사용 (CORS 허용 필요)
    if (isFirebase && NETLIFY_SITE_URL) {
        return `${NETLIFY_SITE_URL}/.netlify/functions/confluence`;
    }
    
    // 로컬 개발 환경
    return '/api/confluence';
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.getClaudeApiUrl = getClaudeApiUrl;
    window.getConfluenceApiUrl = getConfluenceApiUrl;
}
