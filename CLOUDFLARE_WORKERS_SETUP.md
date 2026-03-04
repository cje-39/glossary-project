# Cloudflare Workers 배포 가이드

Firebase Hosting의 bandwidth 제한을 피하기 위해 외부 API 호출을 Cloudflare Workers로 처리합니다.

## 📋 사전 준비

1. **Cloudflare 계정 생성**
   - [Cloudflare](https://dash.cloudflare.com/sign-up)에서 계정 생성
   - 무료 플랜으로도 충분합니다

2. **Wrangler CLI 설치**
   ```bash
   npm install -g wrangler
   ```

3. **Cloudflare 로그인**
   ```bash
   wrangler login
   ```

## 🚀 배포 단계

### 1단계: Workers 프로젝트 초기화

```bash
cd workers
```

### 2단계: Claude API Worker 배포

```bash
# Claude Worker 배포
wrangler deploy claude.js --name claude-api-proxy
```

배포 후 출력되는 URL을 복사합니다 (예: `https://claude-api-proxy.your-subdomain.workers.dev`)

### 3단계: Confluence API Worker 배포

```bash
# Confluence Worker 배포
wrangler deploy confluence.js --name confluence-api-proxy
```

배포 후 출력되는 URL을 복사합니다 (예: `https://confluence-api-proxy.your-subdomain.workers.dev`)

### 4단계: 설정 파일 업데이트

`cloudflare-config.js` 파일을 열고 배포된 URL로 업데이트:

```javascript
const CLOUDFLARE_WORKER_URL = {
  claude: 'https://claude-api-proxy.your-subdomain.workers.dev',
  confluence: 'https://confluence-api-proxy.your-subdomain.workers.dev'
};
```

### 5단계: HTML 파일에 cloudflare-config.js 추가

각 HTML 파일 (`index.html`, `discussion.html`, `review.html`, `corpus.html`, `settings.html`)에 다음 스크립트를 추가:

```html
<!-- Cloudflare Workers 설정 (netlify-config.js 대신 또는 함께 사용) -->
<script src="cloudflare-config.js"></script>
```

**중요**: `netlify-config.js`를 제거하거나, `cloudflare-config.js`를 `netlify-config.js`보다 먼저 로드하도록 순서를 조정하세요.

### 6단계: Firebase에 배포

```bash
firebase deploy --only hosting
```

## 🔧 고급 설정

### 커스텀 도메인 사용 (선택적)

1. Cloudflare Dashboard → Workers & Pages → Routes
2. 커스텀 도메인 추가
3. `wrangler.toml` 파일 업데이트

### 환경 변수 사용 (선택적)

Worker에서 환경 변수를 사용하려면:

```bash
# 환경 변수 설정
wrangler secret put CONFLUENCE_EMAIL
wrangler secret put CONFLUENCE_TOKEN
```

코드에서 사용:
```javascript
const email = env.CONFLUENCE_EMAIL;
const token = env.CONFLUENCE_TOKEN;
```

## 📊 Cloudflare Workers vs Firebase Functions

| 기능 | Cloudflare Workers | Firebase Functions |
|------|-------------------|-------------------|
| 무료 플랜 | ✅ 100,000 요청/일 | ✅ 125,000 요청/월 |
| Bandwidth 제한 | ✅ 무제한 (무료) | ❌ 제한 있음 |
| 응답 속도 | ⚡ 매우 빠름 (엣지) | ⚡ 빠름 |
| 배포 | `wrangler deploy` | `firebase deploy` |
| 비용 | 무료 플랜 충분 | 무료 플랜 충분 |

## 🔍 문제 해결

### CORS 오류

Workers 코드에 CORS 헤더가 포함되어 있습니다. 문제가 발생하면:
1. 브라우저 콘솔에서 오류 확인
2. Network 탭에서 요청/응답 헤더 확인

### API 호출 실패

1. **Workers 로그 확인**
   ```bash
   wrangler tail
   ```

2. **브라우저 개발자 도구 확인**
   - Network 탭에서 요청 URL 확인
   - 응답 상태 코드 확인

### URL 업데이트가 반영되지 않음

1. 브라우저 캐시 삭제 (Ctrl+F5)
2. `cloudflare-config.js` 파일이 올바르게 로드되는지 확인
3. Firebase 재배포

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Cloudflare 계정 생성 및 로그인
- [ ] Wrangler CLI 설치
- [ ] Claude Worker 배포 및 URL 확인
- [ ] Confluence Worker 배포 및 URL 확인
- [ ] `cloudflare-config.js`에 URL 업데이트
- [ ] HTML 파일에 `cloudflare-config.js` 추가
- [ ] Firebase 재배포
- [ ] 다른 디바이스에서 테스트

## 📝 추가 리소스

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers 가격](https://developers.cloudflare.com/workers/platform/pricing/)

---

배포가 완료되면 Firebase Hosting의 bandwidth 제한 없이 외부 API를 호출할 수 있습니다!
