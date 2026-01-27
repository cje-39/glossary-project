# Netlify 배포 가이드

이 가이드에서는 Netlify에 프로젝트를 배포하고 AI 기능을 사용하는 방법을 설명합니다.

## 📋 사전 준비

1. Netlify 계정이 필요합니다. [Netlify](https://www.netlify.com)에서 무료 계정을 만드세요.
2. GitHub 저장소에 프로젝트가 업로드되어 있어야 합니다.

## 🚀 배포 방법

### 방법 1: GitHub 연동 (권장)

1. **Netlify 대시보드 접속**
   - [Netlify Dashboard](https://app.netlify.com)에 로그인

2. **새 사이트 추가**
   - "Add new site" → "Import an existing project" 클릭
   - GitHub 선택 및 저장소 연결
   - 저장소 선택

3. **빌드 설정**
   - **Build command**: 비워두기 (정적 사이트이므로)
   - **Publish directory**: `.` (현재 디렉토리)
   - **Functions directory**: `netlify/functions` (자동 감지됨)

4. **배포**
   - "Deploy site" 클릭
   - 배포 완료까지 대기 (약 1-2분)

### 방법 2: Netlify CLI 사용

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# Netlify 로그인
netlify login

# 프로젝트 디렉토리에서
netlify init

# 배포
netlify deploy --prod
```

### 방법 3: 드래그 앤 드롭

1. Netlify 대시보드에서 "Add new site" → "Deploy manually"
2. 프로젝트 폴더를 드래그 앤 드롭
3. 배포 완료

## ⚙️ Netlify Functions 설정

### Functions 디렉토리 구조

```
netlify/
└── functions/
    └── claude.js    # Claude API 프록시 함수
```

### 자동 설정

`netlify.toml` 파일이 이미 설정되어 있어서 자동으로 Functions가 활성화됩니다:

- Functions 디렉토리: `netlify/functions`
- API 엔드포인트: `/api/claude` → `/.netlify/functions/claude`로 자동 리다이렉트

## 🔧 배포 후 확인

1. **사이트 URL 확인**
   - Netlify 대시보드에서 배포된 사이트 URL 확인
   - 예: `https://your-site-name.netlify.app`

2. **Functions 테스트**
   - 브라우저에서 사이트 접속
   - AI 기능 사용 시도 (예: 용어 의미 생성, 오탈자 점검)
   - 개발자 도구(F12) → Network 탭에서 `/api/claude` 요청 확인

3. **에러 확인**
   - Netlify 대시보드 → Functions 탭에서 로그 확인
   - 문제가 있으면 Functions 로그를 확인하세요

## 🐛 문제 해결

### Functions가 작동하지 않는 경우

1. **Functions 디렉토리 확인**
   ```
   netlify/functions/claude.js 파일이 존재하는지 확인
   ```

2. **netlify.toml 확인**
   ```toml
   [functions]
     directory = "netlify/functions"
   ```

3. **리다이렉트 규칙 확인**
   - Netlify 대시보드 → Site settings → Redirects
   - `/api/claude` → `/.netlify/functions/claude` 리다이렉트가 있는지 확인

4. **Functions 로그 확인**
   - Netlify 대시보드 → Functions 탭
   - 에러 메시지 확인

### CORS 오류

Functions 코드에 CORS 헤더가 이미 포함되어 있습니다. 
만약 CORS 오류가 발생하면:

1. `netlify.toml`의 헤더 설정 확인
2. Functions 코드의 CORS 헤더 확인

### API 키 오류

- API 키는 사용자가 브라우저에서 직접 입력합니다
- LocalStorage에 저장되므로 서버에 전송되지 않습니다
- Functions는 클라이언트에서 받은 API 키를 그대로 Anthropic API로 전달합니다

## 📝 환경 변수 (선택적)

만약 API 키를 환경 변수로 관리하고 싶다면:

1. Netlify 대시보드 → Site settings → Environment variables
2. `ANTHROPIC_API_KEY` 추가 (선택적)
3. Functions 코드 수정하여 환경 변수 사용

**주의**: 현재는 사용자가 직접 API 키를 입력하는 방식을 사용합니다.

## 🔄 업데이트 배포

GitHub에 푸시하면 자동으로 재배포됩니다 (자동 배포 활성화 시).

또는 수동으로:
```bash
netlify deploy --prod
```

## 📊 Functions 모니터링

- Netlify 대시보드 → Functions 탭에서 호출 횟수, 응답 시간, 에러율 확인
- 무료 플랜: 월 125,000 함수 호출 제한

## 🔒 보안 고려사항

1. **API 키 보안**
   - 현재는 클라이언트에서 API 키를 입력받아 사용합니다
   - 프로덕션 환경에서는 서버 사이드에서 API 키를 관리하는 것을 권장합니다

2. **CORS 설정**
   - 현재는 모든 오리진(`*`)을 허용합니다
   - 프로덕션에서는 특정 도메인만 허용하도록 수정하세요

3. **Rate Limiting**
   - Netlify Functions는 자동으로 Rate Limiting을 적용합니다
   - 무료 플랜: 초당 10개 요청 제한

## 📚 추가 리소스

- [Netlify Functions 문서](https://docs.netlify.com/functions/overview/)
- [Netlify 배포 가이드](https://docs.netlify.com/get-started/)
- [Netlify CLI 문서](https://cli.netlify.com/)

## ✅ 체크리스트

배포 전 확인사항:

- [ ] `netlify/functions/claude.js` 파일 존재
- [ ] `netlify.toml` 파일 설정 완료
- [ ] GitHub 저장소에 모든 파일 업로드
- [ ] Netlify 계정 생성 및 로그인
- [ ] 배포 완료 후 Functions 테스트

---

배포가 완료되면 Netlify에서 제공하는 URL로 사이트에 접속할 수 있고, AI 기능도 정상적으로 작동합니다!
