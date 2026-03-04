# Google Apps Script 변환 가이드

이 문서는 기존 프로젝트를 Google Apps Script로 변환하는 방법을 설명합니다.

## 🔄 주요 변환 패턴

### 1. 데이터 저장 변환

#### 이전 (Firestore)
```javascript
// Firestore에서 로드
if (window.FirestoreHelper) {
  const data = await FirestoreHelper.load('glossary', 'terms');
  this.terms = data.terms;
}

// Firestore에 저장
await FirestoreHelper.save('glossary', 'terms', { terms: this.terms });
```

#### 이후 (Google Sheets)
```javascript
// Google Sheets에서 로드
const result = await ClientService.loadGlossary();
this.terms = result.terms;

// Google Sheets에 저장
await ClientService.saveGlossary({ terms: this.terms });
```

### 2. API 호출 변환

#### 이전 (fetch)
```javascript
const response = await fetch('/api/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey, model, messages })
});
const data = await response.json();
```

#### 이후 (google.script.run)
```javascript
const data = await ClientService.callClaude({
  apiKey: apiKey,
  model: 'claude-sonnet-4-5-20250929',
  messages: messages
});
```

### 3. LocalStorage 변환

#### 이전 (LocalStorage)
```javascript
// 저장
localStorage.setItem('glossaryData', JSON.stringify(data));

// 로드
const data = JSON.parse(localStorage.getItem('glossaryData'));
```

#### 이후 (Google Sheets)
```javascript
// 저장
await ClientService.saveGlossary(data);

// 로드
const data = await ClientService.loadGlossary();
```

### 4. 파일 업로드 변환

#### 이전 (FileReader)
```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const data = e.target.result;
  // 처리
};
reader.readAsArrayBuffer(file);
```

#### 이후 (Apps Script)
```javascript
// 클라이언트에서 base64로 변환
const reader = new FileReader();
reader.onload = async (e) => {
  const base64 = e.target.result.split(',')[1];
  // 서버로 전송
  const result = await google.script.run
    .withSuccessHandler(handleSuccess)
    .processFile(base64, file.name, file.type);
};
reader.readAsDataURL(file);
```

## 📝 파일별 변환 체크리스트

### HTML 파일 변환

- [ ] `hub.html` → `Hub.html`
- [ ] `index.html` → `Glossary.html`
- [ ] `corpus.html` → `Corpus.html`
- [ ] `discussion.html` → `Discussion.html`
- [ ] `review.html` → `Review.html`
- [ ] `settings.html` → `Settings.html`

**변환 사항**:
1. 외부 스크립트 로드 제거 (CDN은 유지 가능)
2. `firebase-init.js`, `auth.js` 등 제거
3. `ClientService` 스크립트 추가
4. 링크를 `?page=xxx` 형식으로 변경

### JavaScript 파일 변환

- [ ] `app.js` → 클라이언트 스크립트로 변환
- [ ] `corpus.js` → 클라이언트 스크립트로 변환
- [ ] `discussion.js` → 클라이언트 스크립트로 변환
- [ ] `review.js` → 클라이언트 스크립트로 변환
- [ ] `ppt-extractor.js` → 클라이언트 스크립트로 변환
- [ ] `confluence-integration.js` → 클라이언트 스크립트로 변환

**변환 사항**:
1. `window.FirestoreHelper` → `ClientService`
2. `localStorage` → `ClientService` 메서드
3. `fetch()` → `ClientService.callClaude()` 또는 `ClientService.callConfluence()`
4. `async/await` 패턴 유지

## 🔧 변환 예시

### 예시 1: GlossaryManager 클래스

#### 변환 전 (app.js)
```javascript
class GlossaryManager {
  async loadData() {
    if (window.FirestoreHelper) {
      const data = await FirestoreHelper.load('glossary', 'terms');
      if (data && data.terms) {
        this.terms = data.terms;
        localStorage.setItem('glossaryData', JSON.stringify(this.terms));
        return;
      }
    }
    const savedData = localStorage.getItem('glossaryData');
    if (savedData) {
      this.terms = JSON.parse(savedData);
    }
  }
  
  async saveData() {
    localStorage.setItem('glossaryData', JSON.stringify(this.terms));
    if (window.FirestoreHelper) {
      await FirestoreHelper.save('glossary', 'terms', { terms: this.terms });
    }
  }
}
```

#### 변환 후
```javascript
class GlossaryManager {
  async loadData() {
    try {
      const result = await ClientService.loadGlossary();
      this.terms = result.terms || [];
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      this.terms = [];
    }
  }
  
  async saveData() {
    try {
      await ClientService.saveGlossary({ terms: this.terms });
    } catch (error) {
      console.error('데이터 저장 실패:', error);
      alert('데이터 저장에 실패했습니다.');
    }
  }
}
```

### 예시 2: Claude API 호출

#### 변환 전 (discussion.js)
```javascript
async generateMeaning(postId) {
  const apiKey = localStorage.getItem('claude_api_key');
  const apiUrl = window.getClaudeApiUrl ? window.getClaudeApiUrl() : '/api/claude';
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: apiKey.trim(),
      model: 'claude-sonnet-4-5-20250929',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  const data = await response.json();
  return data.content[0].text;
}
```

#### 변환 후
```javascript
async generateMeaning(postId) {
  const apiKey = localStorage.getItem('claude_api_key');
  
  try {
    const data = await ClientService.callClaude({
      apiKey: apiKey.trim(),
      model: 'claude-sonnet-4-5-20250929',
      messages: [{ role: 'user', content: prompt }]
    });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.content[0].text;
  } catch (error) {
    console.error('API 호출 실패:', error);
    throw error;
  }
}
```

### 예시 3: Confluence API 호출

#### 변환 전 (confluence-integration.js)
```javascript
async fetchPageContent(pageId) {
  const apiUrl = window.getConfluenceApiUrl ? window.getConfluenceApiUrl() : '/api/confluence';
  const url = `${apiUrl}?pageId=${pageId}&apiToken=${this.apiToken}&email=${this.email}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  return data.body.storage.value;
}
```

#### 변환 후
```javascript
async fetchPageContent(pageId) {
  try {
    const data = await ClientService.callConfluence({
      pageId: pageId,
      apiToken: this.apiToken,
      email: this.email
    });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.body.storage.value;
  } catch (error) {
    console.error('Confluence API 호출 실패:', error);
    throw error;
  }
}
```

## ⚠️ 주의사항

### 1. 실행 시간 제한
- Apps Script는 6분 실행 시간 제한이 있습니다.
- 큰 파일 처리 시 청크 단위로 나누어 처리하세요.

### 2. 할당량
- 일일 API 호출 제한이 있습니다.
- `UrlFetchApp` 호출 제한: 20,000회/일

### 3. 파일 크기 제한
- Apps Script 파일 크기 제한: 250KB
- 큰 JavaScript 파일은 여러 파일로 분할하세요.

### 4. CORS
- Apps Script는 CORS 문제가 없습니다.
- 프록시 서버가 필요 없습니다.

### 5. 비동기 처리
- `google.script.run`은 Promise를 반환하지 않습니다.
- `withSuccessHandler`와 `withFailureHandler`를 사용하세요.
- 또는 `ClientService` 래퍼를 사용하세요.

## 📚 추가 리소스

- [Google Apps Script 문서](https://developers.google.com/apps-script)
- [HTML Service 가이드](https://developers.google.com/apps-script/guides/html)
- [UrlFetchApp 문서](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
