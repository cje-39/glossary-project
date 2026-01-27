# Firebase Hosting + Netlify Functions 설정 가이드

Firebase Hosting에 배포했지만 AI 기능은 Netlify Functions를 사용하도록 설정하는 방법입니다.

## ✅ 설정 완료 사항

1. ✅ `firebase.json`에서 `/api/claude` rewrites 제거
2. ✅ `netlify-config.js` 생성 (Netlify Functions URL 설정)
3. ✅ 각 HTML 파일에 `netlify-config.js` 추가
4. ✅ 각 JS 파일에서 `getClaudeApiUrl()` 함수 사용

## 🔧 Netlify 사이트 URL 설정

### 1단계: Netlify 사이트 URL 확인

1. [Netlify Dashboard](https://app.netlify.com) 접속
2. 배포된 사이트 선택
3. 사이트 URL 확인 (예: `https://your-site-name.netlify.app`)

### 2단계: 설정 파일 수정

`netlify-config.js` 파일을 열고 Netlify 사이트 URL을 입력하세요:

```javascript
const NETLIFY_SITE_URL = 'https://your-site-name.netlify.app'; // 여기에 Netlify URL 입력
```

**예시:**
```javascript
const NETLIFY_SITE_URL = 'https://glossary-project.netlify.app';
```

### 3단계: Firebase에 재배포

설정을 변경한 후 Firebase에 재배포하세요:

```bash
cmd /c "firebase deploy --only hosting"
```

## 🔍 작동 방식

### 자동 감지

- **Firebase Hosting**에서 접속 시: Netlify Functions URL 직접 호출
- **Netlify**에서 접속 시: `/api/claude` 사용 (자동 리다이렉트)
- **로컬**에서 접속 시: `/api/claude` 사용

### 코드 예시

```javascript
// netlify-config.js에서 자동으로 올바른 URL 반환
const apiUrl = window.getClaudeApiUrl();
// Firebase: https://your-site.netlify.app/.netlify/functions/claude
// Netlify: /api/claude
// 로컬: /api/claude
```

## ✅ 확인 사항

1. **Netlify 사이트가 배포되어 있는지 확인**
   - Netlify Dashboard에서 사이트 상태 확인

2. **Netlify Functions가 작동하는지 확인**
   - Netlify Dashboard → Functions 탭
   - `claude` 함수가 있는지 확인

3. **Firebase Hosting에서 테스트**
   - `https://ettglossary.web.app` 접속
   - AI 기능 사용 시도
   - 브라우저 개발자 도구 → Network 탭에서 Netlify Functions 호출 확인

## 🐛 문제 해결

### CORS 오류

Netlify Functions의 CORS 설정이 올바른지 확인:
- `netlify/functions/claude.js`에 CORS 헤더 포함 확인
- `netlify.toml`의 CORS 헤더 설정 확인

### API 호출 실패

1. **Netlify 사이트 URL 확인**
   - `netlify-config.js`의 `NETLIFY_SITE_URL`이 올바른지 확인
   - URL 끝에 `/`가 없어야 함

2. **브라우저 콘솔 확인**
   - 개발자 도구(F12) → Console 탭
   - 에러 메시지 확인

3. **Network 탭 확인**
   - 개발자 도구 → Network 탭
   - `/api/claude` 또는 Netlify Functions URL 요청 확인
   - 응답 상태 코드 확인

### Functions가 작동하지 않음

1. **Netlify Dashboard 확인**
   - Functions 탭에서 `claude` 함수 확인
   - 로그에서 에러 확인

2. **Functions 코드 확인**
   - `netlify/functions/claude.js` 파일 존재 확인
   - 코드에 문법 오류 없는지 확인

## 📝 참고사항

- Firebase Hosting과 Netlify Functions를 함께 사용하면 CORS 문제가 발생할 수 있습니다
- Netlify Functions는 CORS를 허용하도록 설정되어 있어야 합니다
- 현재 설정은 모든 오리진(`*`)을 허용합니다 (프로덕션에서는 특정 도메인만 허용 권장)

---

설정이 완료되면 Firebase Hosting에서 Netlify Functions를 통해 AI 기능을 사용할 수 있습니다! 🚀
