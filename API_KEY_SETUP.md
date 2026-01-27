# API 키 설정 가이드

AI 기능(용어 의미 생성, 오탈자 점검)을 사용하려면 Claude API 키가 필요합니다.

## 🔑 API 키 발급 방법

1. **Anthropic Console 접속**
   - [https://console.anthropic.com](https://console.anthropic.com) 접속
   - 계정이 없으면 회원가입

2. **API 키 생성**
   - 대시보드에서 "API Keys" 메뉴 선택
   - "Create Key" 클릭
   - 키 이름 입력 (예: "Language Resource Hub")
   - 생성된 API 키 복사 (예: `sk-ant-api03-...`)

## 💾 API 키 입력 방법

### 방법 1: Discussion 페이지에서 입력

1. **Discussion 페이지 접속**
   - Hub → "Term Discussion" 클릭

2. **API 키 입력**
   - 페이지 상단의 "Claude API 키" 섹션 찾기
   - API 키 입력 필드에 발급받은 키 입력
   - "저장" 버튼 클릭
   - "✅ API 키가 저장되어 있습니다" 메시지 확인

### 방법 2: Corpus 페이지에서 입력

1. **Corpus 페이지 접속**
   - Hub → "Parallel Corpus" 클릭

2. **API 키 입력**
   - 페이지 상단의 "Claude API 키" 섹션 찾기
   - API 키 입력 필드에 발급받은 키 입력
   - "저장" 버튼 클릭
   - "✅ API 키가 저장되어 있습니다" 메시지 확인

### 방법 3: Review 페이지에서 입력

1. **Review 페이지 접속**
   - Hub → "Translation Review" 클릭

2. **API 키 입력**
   - 페이지 상단의 "Claude API 키" 섹션 찾기
   - API 키 입력 필드에 발급받은 키 입력
   - "저장" 버튼 클릭

## ✅ API 키 확인

API 키가 제대로 저장되었는지 확인:

1. 브라우저 개발자 도구 열기 (F12)
2. "Application" 탭 → "Local Storage" 선택
3. `claude_api_key` 키가 있는지 확인
4. 값이 올바른지 확인 (API 키가 표시됨)

## 🔄 API 키 공유

**중요**: API 키는 브라우저의 LocalStorage에 저장됩니다.

- **같은 브라우저**: 다른 페이지에서도 동일한 API 키 사용
- **다른 브라우저/기기**: 각각 별도로 API 키 입력 필요
- **시크릿 모드**: 시크릿 모드에서는 별도로 저장 필요

## 🚨 문제 해결

### "Claude API 키가 필요합니다" 메시지가 계속 나오는 경우

1. **API 키가 저장되었는지 확인**
   - 브라우저 개발자 도구 → Application → Local Storage
   - `claude_api_key` 확인

2. **API 키 형식 확인**
   - 올바른 형식: `sk-ant-api03-...` (약 50자)
   - 공백이나 특수문자가 포함되지 않았는지 확인

3. **페이지 새로고침**
   - API 키 저장 후 페이지 새로고침 (F5)

4. **다른 페이지에서 입력**
   - Discussion 페이지에서 입력해보기
   - 또는 Corpus 페이지에서 입력해보기

### API 호출이 실패하는 경우

1. **Netlify Functions 확인**
   - Netlify 대시보드 → Functions 탭
   - Functions가 배포되었는지 확인
   - Functions 로그에서 에러 확인

2. **네트워크 확인**
   - 브라우저 개발자 도구 → Network 탭
   - `/api/claude` 요청 확인
   - 요청이 실패하는지 확인

3. **API 키 유효성 확인**
   - Anthropic Console에서 API 키가 활성화되어 있는지 확인
   - API 키가 만료되지 않았는지 확인

### Netlify 배포 후 작동하지 않는 경우

1. **Functions 배포 확인**
   - Netlify 대시보드 → Functions 탭
   - `claude` 함수가 있는지 확인

2. **리다이렉트 확인**
   - Netlify 대시보드 → Site settings → Redirects
   - `/api/claude` → `/.netlify/functions/claude` 리다이렉트 확인

3. **재배포**
   - GitHub에 최신 코드 푸시
   - Netlify에서 자동 재배포 확인

## 📝 참고사항

- **API 키 비용**: Anthropic API는 사용량에 따라 과금됩니다
- **무료 크레딧**: 신규 계정에는 무료 크레딧이 제공될 수 있습니다
- **API 키 보안**: API 키를 공유하거나 GitHub에 업로드하지 마세요
- **LocalStorage**: 브라우저 데이터를 삭제하면 API 키도 삭제됩니다

## 🔗 관련 링크

- [Anthropic Console](https://console.anthropic.com)
- [Anthropic API 문서](https://docs.anthropic.com)
- [Netlify Functions 문서](https://docs.netlify.com/functions/overview/)

---

API 키를 입력하면 AI 기능을 사용할 수 있습니다!
