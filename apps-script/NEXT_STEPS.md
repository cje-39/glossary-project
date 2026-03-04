# 다음 단계 가이드

Google Apps Script 변환을 완료하기 위한 구체적인 단계별 가이드입니다.

## 🎯 현재 상태

✅ 완료된 것:
- 서버 사이드 코드 (.gs 파일들)
- 데이터 서비스 (Google Sheets 연동)
- API 서비스 (Claude, Confluence)
- 클라이언트 서비스 래퍼
- 문서화

⏳ 아직 해야 할 것:
- HTML 파일 변환
- JavaScript 파일 변환
- 실제 배포 및 테스트

## 📋 단계별 진행 방법

### 1단계: Apps Script 프로젝트 생성 (5분)

1. **Google Apps Script 접속**
   - https://script.google.com 접속
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - 왼쪽 상단 "새 프로젝트" 클릭
   - 프로젝트 이름을 "Glossary Project"로 변경

3. **기본 파일 업로드**
   - `apps-script/Code.gs` 내용을 복사하여 `Code.gs`에 붙여넣기
   - "+" 버튼 클릭 → "스크립트" 선택 → 이름을 "DataService"로 변경
   - `apps-script/DataService.gs` 내용 복사
   - "+" 버튼 클릭 → "스크립트" 선택 → 이름을 "ApiService"로 변경
   - `apps-script/ApiService.gs` 내용 복사

4. **초기 실행**
   - `Code.gs` 파일에서 `getSpreadsheetId()` 함수 찾기
   - 함수 선택 후 실행 버튼 클릭
   - 권한 승인 (첫 실행 시)
   - Google Sheets가 자동으로 생성됨

### 2단계: 첫 번째 HTML 파일 변환 (Hub 페이지부터 시작)

가장 간단한 Hub 페이지부터 시작하는 것을 권장합니다.

1. **Hub.html 생성**
   - Apps Script 편집기에서 "+" 버튼 클릭
   - "HTML" 선택
   - 파일 이름: "Hub"

2. **기존 hub.html 내용 확인**
   ```bash
   # 프로젝트 루트에서
   cat hub.html
   ```

3. **변환 작업**
   - 링크를 `?page=xxx` 형식으로 변경
   - Firebase 관련 스크립트 제거
   - ClientService 스크립트 추가

**변환 예시:**
```html
<!-- 이전 -->
<a href="index.html">Glossary</a>

<!-- 이후 -->
<a href="?page=glossary">Glossary</a>
```

### 3단계: JavaScript 파일 변환

각 JavaScript 파일을 변환할 때 다음 패턴을 따르세요:

#### 패턴 1: 데이터 로드
```javascript
// 이전
if (window.FirestoreHelper) {
  const data = await FirestoreHelper.load('glossary', 'terms');
  this.terms = data.terms;
}

// 이후
const result = await ClientService.loadGlossary();
this.terms = result.terms || [];
```

#### 패턴 2: 데이터 저장
```javascript
// 이전
await FirestoreHelper.save('glossary', 'terms', { terms: this.terms });

// 이후
await ClientService.saveGlossary({ terms: this.terms });
```

#### 패턴 3: API 호출
```javascript
// 이전
const response = await fetch('/api/claude', {
  method: 'POST',
  body: JSON.stringify({ apiKey, model, messages })
});
const data = await response.json();

// 이후
const data = await ClientService.callClaude({
  apiKey: apiKey,
  model: 'claude-sonnet-4-5-20250929',
  messages: messages
});
```

### 4단계: 우선순위별 변환 순서

**우선순위 1: Hub 페이지** (가장 간단)
- `hub.html` → `Hub.html`
- 링크만 변경하면 됨

**우선순위 2: Glossary 페이지** (핵심 기능)
- `index.html` → `Glossary.html`
- `app.js` → 클라이언트 스크립트로 변환
- 가장 많이 사용되는 기능

**우선순위 3: Settings 페이지** (설정)
- `settings.html` → `Settings.html`
- Confluence 연동 테스트용

**우선순위 4: 나머지 페이지들**
- Corpus, Discussion, Review 순서로 진행

## 🛠️ 실제 작업 방법

### 방법 1: 한 번에 하나씩 변환 (권장)

1. **Hub 페이지부터 시작**
   - 가장 간단하므로 먼저 완성
   - 배포하여 테스트

2. **Glossary 페이지 변환**
   - `app.js`의 주요 함수들을 하나씩 변환
   - 각 함수 변환 후 테스트

3. **나머지 페이지들**
   - 동일한 패턴으로 변환

### 방법 2: 전체 변환 후 테스트

1. 모든 HTML/JS 파일 변환
2. 한 번에 배포
3. 통합 테스트

## 📝 변환 체크리스트

각 파일을 변환할 때 확인할 사항:

- [ ] Firebase/Firestore 관련 코드 제거
- [ ] `localStorage` → `ClientService`로 변경
- [ ] `fetch()` → `ClientService.callClaude()` 또는 `ClientService.callConfluence()`로 변경
- [ ] 링크를 `?page=xxx` 형식으로 변경
- [ ] `ClientService.js` 스크립트 포함 확인
- [ ] 에러 처리 추가

## 🚀 빠른 시작 (최소 구성)

가장 빠르게 시작하려면:

1. **Hub 페이지만 먼저 변환**
   ```html
   <!-- Hub.html 기본 구조 -->
   <!DOCTYPE html>
   <html>
   <head>
     <title>Hub</title>
   </head>
   <body>
     <h1>Language Resource Hub</h1>
     <a href="?page=glossary">Glossary</a>
     <a href="?page=corpus">Corpus</a>
     <a href="?page=discussion">Discussion</a>
     <a href="?page=review">Review</a>
     <a href="?page=settings">Settings</a>
   </body>
   </html>
   ```

2. **배포 및 테스트**
   - "배포" → "새 배포" → "웹 앱"
   - URL로 접속하여 Hub 페이지 확인

3. **나머지 페이지 하나씩 추가**

## 💡 팁

1. **작은 단위로 테스트**
   - 한 페이지씩 변환하고 배포하여 테스트
   - 문제를 빨리 발견할 수 있음

2. **에러 처리 추가**
   - `ClientService` 호출 시 try-catch 사용
   - 사용자에게 명확한 에러 메시지 표시

3. **콘솔 로그 활용**
   - Apps Script 실행 로그 확인
   - 브라우저 개발자 도구 콘솔 확인

## ❓ 문제 발생 시

1. **권한 오류**
   - 스프레드시트 접근 권한 확인
   - 웹 앱 배포 시 "모든 사용자" 권한 설정

2. **데이터가 로드되지 않음**
   - `getSpreadsheetId()` 함수 실행 확인
   - 스프레드시트가 올바르게 생성되었는지 확인

3. **API 호출 실패**
   - Apps Script 실행 로그 확인
   - API 키가 올바르게 전달되는지 확인

## 📚 참고 문서

- `QUICK_START.md` - 빠른 시작 가이드
- `CONVERSION_GUIDE.md` - 상세 변환 가이드 및 예시
- `APPS_SCRIPT_DEPLOY.md` - 배포 가이드

---

**다음 단계**: Hub 페이지부터 시작하여 하나씩 변환하는 것을 권장합니다!
