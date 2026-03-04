# 외부 API 호출 목록

이 문서는 프로젝트에서 사용하는 모든 외부 API 호출을 정리한 것입니다.

## 📋 목차
1. [Anthropic Claude API](#1-anthropic-claude-api)
2. [Confluence API](#2-confluence-api)
3. [Firebase Services](#3-firebase-services)
4. [프록시 서버](#4-프록시-서버)

---

## 1. Anthropic Claude API

### 1.1 용어 의미 생성 (Term Discussion)
- **파일**: `discussion.js`
- **함수**: `generateMeaning()`
- **엔드포인트**: `/api/claude` (프록시를 통해)
- **실제 API**: `https://api.anthropic.com/v1/messages`
- **메서드**: POST
- **용도**: 한국어-일본어 용어의 의미 자동 생성
- **모델**: `claude-sonnet-4-5-20250929`
- **최대 토큰**: 200
- **온도**: 0.3

**요청 형식**:
```javascript
{
  apiKey: string,
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 200,
  temperature: 0.3,
  system: 'You are a helpful assistant...',
  messages: [{ role: 'user', content: prompt }]
}
```

### 1.2 이미지에서 용어 추출 (Glossary)
- **파일**: `app.js`
- **함수**: `extractTermsFromModalImage()`
- **엔드포인트**: `/api/claude` (프록시를 통해)
- **실제 API**: `https://api.anthropic.com/v1/messages`
- **메서드**: POST
- **용도**: 이미지에서 한국어-일본어 용어 쌍 추출
- **모델**: `claude-sonnet-4-5-20250929`
- **최대 토큰**: 4000
- **온도**: 0.3
- **특징**: Vision API 사용 (base64 이미지 포함)

**요청 형식**:
```javascript
{
  apiKey: string,
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4000,
  temperature: 0.3,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data }},
      { type: 'text', text: prompt }
    ]
  }]
}
```

### 1.3 텍스트 매칭 (Parallel Corpus)
- **파일**: `ppt-extractor.js`
- **함수**: `batchMatchTexts()`
- **엔드포인트**: `/api/claude` (프록시를 통해)
- **실제 API**: `https://api.anthropic.com/v1/messages`
- **메서드**: POST
- **용도**: 한국어-일본어 텍스트 자동 매칭
- **모델**: `claude-sonnet-4-5-20250929`
- **최대 토큰**: 8000
- **온도**: 0.1

**요청 형식**:
```javascript
{
  apiKey: string,
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8000,
  temperature: 0.1,
  messages: [{ role: 'user', content: prompt }]
}
```

### 1.4 오탈자 점검 (Translation Review)
- **파일**: `review.js`
- **함수**: `checkSpelling()`
- **엔드포인트**: `/api/claude` (프록시를 통해)
- **실제 API**: `https://api.anthropic.com/v1/messages`
- **메서드**: POST
- **용도**: 한국어/일본어 텍스트의 맞춤법, 띄어쓰기, 번역 누락, 일관성 점검
- **모델**: `claude-sonnet-4-5-20250929`
- **최대 토큰**: 4000
- **온도**: 0.3
- **제한**: 요청 본문 100KB 이하

**요청 형식**:
```javascript
{
  apiKey: string,
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4000,
  temperature: 0.3,
  system: 'You are a helpful assistant that checks for spelling, grammar...',
  messages: [{ role: 'user', content: prompt }]
}
```

### 1.5 Claude API 프록시 서버들

#### Netlify Functions
- **파일**: `netlify/functions/claude.js`
- **엔드포인트**: `/.netlify/functions/claude`
- **URL**: `https://monumental-kringle-4c13b3.netlify.app/.netlify/functions/claude`
- **역할**: CORS 처리 및 Anthropic API 프록시

#### Cloudflare Workers
- **파일**: `workers/claude.js`
- **엔드포인트**: `https://claude-api-proxy.cje39.workers.dev`
- **역할**: CORS 처리 및 Anthropic API 프록시

#### Firebase Functions
- **파일**: `functions/index.js`
- **함수명**: `claude`
- **역할**: CORS 처리 및 Anthropic API 프록시

---

## 2. Confluence API

### 2.1 페이지 내용 가져오기
- **파일**: `confluence-integration.js`
- **함수**: `fetchPageContent()`
- **엔드포인트**: `/api/confluence` (프록시를 통해)
- **실제 API**: `https://krafton.atlassian.net/wiki/rest/api/content/{pageId}?expand=body.storage`
- **메서드**: GET
- **인증**: Basic Authentication (email:token)
- **용도**: Confluence 페이지의 HTML 내용 가져오기

**요청 형식**:
```
GET /api/confluence?pageId={pageId}&apiToken={token}&email={email}
```

### 2.2 하위 페이지 목록 가져오기
- **파일**: `confluence-integration.js`
- **함수**: `checkNewPages()`
- **엔드포인트**: `/api/confluence` (프록시를 통해)
- **실제 API**: `https://krafton.atlassian.net/wiki/rest/api/content/{pageId}/child/page?limit={limit}&expand=version`
- **메서드**: GET
- **인증**: Basic Authentication (email:token)
- **용도**: 특정 페이지의 하위 페이지 목록 가져오기

**요청 형식**:
```
GET /api/confluence?pageId={pageId}&apiToken={token}&email={email}&action=children&limit=20
```

### 2.3 Confluence API 프록시 서버들

#### Netlify Functions
- **파일**: `netlify/functions/confluence.js`
- **엔드포인트**: `/.netlify/functions/confluence`
- **URL**: `https://monumental-kringle-4c13b3.netlify.app/.netlify/functions/confluence`
- **역할**: CORS 처리 및 Confluence API 프록시

#### Cloudflare Workers
- **파일**: `workers/confluence.js`
- **엔드포인트**: `https://confluence-api-proxy.cje39.workers.dev`
- **역할**: CORS 처리 및 Confluence API 프록시

#### Firebase Functions
- **파일**: `functions/index.js`
- **함수명**: `confluence`
- **역할**: CORS 처리 및 Confluence API 프록시

---

## 3. Firebase Services

### 3.1 Firestore Database
- **파일**: `firebase-init.js`
- **서비스**: Firebase Firestore
- **용도**: 데이터 저장 및 실시간 동기화
- **사용 위치**:
  - `app.js` - 용어집 데이터
  - `corpus.js` - 코퍼스 데이터
  - `discussion.js` - 토론 데이터
  - `confluence-integration.js` - Confluence 설정

**주요 API 호출**:
- `db.collection(collection).doc(docId).get()` - 데이터 로드
- `db.collection(collection).doc(docId).set()` - 데이터 저장
- `db.collection(collection).doc(docId).onSnapshot()` - 실시간 리스너
- `db.collection(collection).doc(docId).delete()` - 데이터 삭제
- `db.collection(collection).doc(docId).update()` - 데이터 업데이트

**컬렉션**:
- `glossary` - 용어집 (terms, categories)
- `corpus` - 코퍼스 (data, fileGroups, folders)
- `discussion` - 토론 (posts, authors, categories)
- `settings` - 설정 (confluence)

### 3.2 Realtime Database
- **파일**: `firebase-init.js`
- **서비스**: Firebase Realtime Database
- **용도**: 실시간 데이터 동기화
- **사용 위치**: `confluence-integration.js` - Confluence 설정 저장

**주요 API 호출**:
- `realtimeDB.ref(path).set()` - 데이터 저장
- `realtimeDB.ref(path).once('value')` - 데이터 가져오기
- `realtimeDB.ref(path).update()` - 데이터 업데이트
- `realtimeDB.ref(path).remove()` - 데이터 삭제
- `realtimeDB.ref(path).on('value')` - 실시간 리스너

**경로**:
- `settings/confluence` - Confluence 설정

### 3.3 Firebase Authentication
- **파일**: `firebase-init.js`, `auth.js`
- **서비스**: Firebase Authentication
- **용도**: 사용자 인증 및 관리

**주요 API 호출**:
- `firebase.auth().signInWithEmailAndPassword()` - 이메일/비밀번호 로그인
- `firebase.auth().signOut()` - 로그아웃
- `firebase.auth().sendPasswordResetEmail()` - 비밀번호 재설정
- `firebase.auth().currentUser` - 현재 사용자 확인
- `firebase.auth().onAuthStateChanged()` - 인증 상태 리스너

---

## 4. 프록시 서버

### 4.1 로컬 개발 서버
- **파일**: `server.py`, `server.js`
- **용도**: 로컬 개발 환경에서 CORS 우회
- **엔드포인트**:
  - `/api/claude` - Claude API 프록시
  - `/api/confluence` - Confluence API 프록시

### 4.2 API URL 결정 로직
- **파일**: `cloudflare-config.js`
- **함수**: `getClaudeApiUrl()`, `getConfluenceApiUrl()`
- **로직**:
  1. 로컬 환경: `/api/claude` 또는 `/api/confluence`
  2. Firebase 환경: Netlify Functions 우선 사용
  3. 기본값: `/api/claude` 또는 `/api/confluence`

---

## 📊 API 호출 통계

### 클라이언트 측 직접 호출
- **Claude API**: 4개 기능 (의미 생성, 이미지 추출, 텍스트 매칭, 오탈자 점검)
- **Confluence API**: 2개 기능 (페이지 내용, 하위 페이지 목록)
- **Firebase**: 3개 서비스 (Firestore, Realtime DB, Authentication)

### 프록시 서버
- **Netlify Functions**: 2개 (Claude, Confluence)
- **Cloudflare Workers**: 2개 (Claude, Confluence)
- **Firebase Functions**: 2개 (Claude, Confluence)
- **로컬 서버**: 2개 (Claude, Confluence)

---

## 🔐 인증 방식

### Claude API
- **방식**: API Key (x-api-key 헤더)
- **저장**: LocalStorage (`claude_api_key`)
- **전달**: 요청 본문에 포함

### Confluence API
- **방식**: Basic Authentication (email:token)
- **저장**: LocalStorage 또는 Realtime Database
- **전달**: 쿼리 파라미터 또는 Authorization 헤더

### Firebase
- **방식**: Firebase SDK 자동 인증
- **설정**: `firebase-config.js`의 `firebaseConfig`

---

## 📝 참고사항

1. **CORS 처리**: 모든 외부 API 호출은 프록시 서버를 통해 CORS 문제를 해결합니다.
2. **에러 처리**: 각 API 호출에는 상세한 에러 처리 로직이 포함되어 있습니다.
3. **환경별 URL**: 환경(로컬, Firebase, Netlify)에 따라 다른 프록시 URL을 사용합니다.
4. **API 키 보안**: API 키는 클라이언트 측에 저장되므로 프로덕션 환경에서는 서버 사이드 관리가 권장됩니다.
