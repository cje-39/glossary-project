// Cloudflare Workers 설정
// Cloudflare Workers를 사용하여 외부 API 호출을 처리합니다.
// Firebase Hosting의 bandwidth 제한을 피하기 위해 사용됩니다.

// Cloudflare Workers URL 설정
const CLOUDFLARE_WORKER_URL = {
  claude: 'https://claude-api-proxy.cje39.workers.dev',
  confluence: 'https://confluence-api-proxy.cje39.workers.dev'
};

// Netlify Functions URL (폴백용)
const NETLIFY_SITE_URL = 'https://monumental-kringle-4c13b3.netlify.app';

// Claude API 엔드포인트 URL 생성 함수
function getClaudeApiUrl() {
    // 현재 호스트가 Firebase인지 확인
    const isFirebase = window.location.hostname.includes('firebaseapp.com') || 
                       window.location.hostname.includes('web.app');
    
    // 로컬 개발 환경 (localhost 또는 127.0.0.1)
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';
    
    // 로컬 환경에서는 기존 API 사용 (회사 방화벽 우회)
    if (isLocal) {
        return '/api/claude';
    }
    
    // Firebase인 경우 Netlify Functions 우선 사용 (Cloudflare Workers 403 오류 대응)
    if (isFirebase && NETLIFY_SITE_URL) {
        return `${NETLIFY_SITE_URL}/.netlify/functions/claude`;
    }
    
    // 기본값
    return '/api/claude';
}

// Confluence API 엔드포인트 URL 생성 함수
function getConfluenceApiUrl() {
    // 현재 호스트가 Firebase인지 확인
    const isFirebase = window.location.hostname.includes('firebaseapp.com') || 
                       window.location.hostname.includes('web.app');
    
    // 로컬 개발 환경 (localhost 또는 127.0.0.1)
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';
    
    // 로컬 환경에서는 기존 API 사용 (회사 방화벽 우회)
    if (isLocal) {
        return '/api/confluence';
    }
    
    // Firebase인 경우 Cloudflare Workers 사용
    if (isFirebase && CLOUDFLARE_WORKER_URL.confluence) {
        return CLOUDFLARE_WORKER_URL.confluence;
    }
    
    // 기본값
    return '/api/confluence';
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.getClaudeApiUrl = getClaudeApiUrl;
    window.getConfluenceApiUrl = getConfluenceApiUrl;
}
