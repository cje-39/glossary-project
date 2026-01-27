# Firestore 연동 가이드

이 프로젝트는 Firebase Firestore를 사용하여 모든 기기와 브라우저에서 데이터를 동기화합니다.

## 📋 사전 준비

### 1. Firebase Console에서 Firestore 활성화

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택 (`ettglossary`)
3. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
4. **"데이터베이스 만들기"** 클릭
5. **프로덕션 모드** 또는 **테스트 모드** 선택
   - 테스트 모드: 처음 30일간 모든 읽기/쓰기 허용 (개발용)
   - 프로덕션 모드: 보안 규칙 필요 (운영용)
6. 위치 선택 (권장: `asia-northeast1` 또는 `asia-southeast1`)
7. **"사용 설정"** 클릭

### 2. Firestore 보안 규칙 설정

Firebase Console → Firestore Database → 규칙 탭에서 다음 규칙 설정:

#### 테스트 모드 (개발용)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### 프로덕션 모드 (운영용 - 인증 필요 시)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /glossary/{document} {
      allow read, write: if true; // 필요시 인증 조건 추가
    }
    match /corpus/{document} {
      allow read, write: if true;
    }
    match /discussion/{document} {
      allow read, write: if true;
    }
  }
}
```

## 🔄 데이터 동기화 방식

### 하이브리드 저장 방식

1. **LocalStorage (즉시 반응)**
   - 사용자 입력 즉시 LocalStorage에 저장
   - 빠른 UI 반응 보장

2. **Firestore (백그라운드 동기화)**
   - LocalStorage 저장 후 Firestore에도 저장
   - 모든 기기/브라우저에서 동기화

3. **실시간 업데이트**
   - Firestore의 변경사항을 실시간으로 감지
   - 다른 기기에서 변경 시 자동 업데이트

### 데이터 구조

#### Glossary (용어집)
- 컬렉션: `glossary`
- 문서 ID: `terms`, `categories`
- 구조:
  ```javascript
  {
    terms: [...], // 용어 배열
    categories: [...] // 카테고리 배열
  }
  ```

#### Corpus (코퍼스)
- 컬렉션: `corpus`
- 문서 ID: `data`, `fileGroups`
- 구조:
  ```javascript
  {
    items: [...], // 코퍼스 항목 배열
    fileGroups: [...] // 파일 그룹 배열
  }
  ```

#### Discussion (토론)
- 컬렉션: `discussion`
- 문서 ID: `posts`, `authors`, `categories`
- 구조:
  ```javascript
  {
    posts: [...], // 게시물 배열
    authors: [...], // 작성자 배열
    categories: [...] // 카테고리 배열
  }
  ```

## 🚀 사용 방법

### 자동 동기화

데이터를 저장하면 자동으로:
1. LocalStorage에 즉시 저장
2. Firestore에 백그라운드 저장
3. 다른 기기에서 실시간 업데이트

### 수동 마이그레이션 (LocalStorage → Firestore)

기존 LocalStorage 데이터를 Firestore로 마이그레이션하려면:

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭에서 다음 명령 실행:

```javascript
// 용어집 데이터 마이그레이션
const glossaryData = JSON.parse(localStorage.getItem('glossaryData'));
const glossaryCategories = JSON.parse(localStorage.getItem('glossaryCategories'));
if (window.FirestoreHelper) {
  FirestoreHelper.save('glossary', 'terms', { terms: glossaryData || [] });
  FirestoreHelper.save('glossary', 'categories', { categories: glossaryCategories || [] });
  console.log('용어집 데이터 마이그레이션 완료');
}

// 코퍼스 데이터 마이그레이션
const corpusData = JSON.parse(localStorage.getItem('corpusData'));
const corpusFileGroups = JSON.parse(localStorage.getItem('corpusFileGroups'));
if (window.FirestoreHelper) {
  FirestoreHelper.save('corpus', 'data', { items: corpusData || [] });
  FirestoreHelper.save('corpus', 'fileGroups', { fileGroups: corpusFileGroups || [] });
  console.log('코퍼스 데이터 마이그레이션 완료');
}

// 토론 데이터 마이그레이션
const discussionPosts = JSON.parse(localStorage.getItem('discussionPosts'));
const discussionAuthors = JSON.parse(localStorage.getItem('discussionAuthors'));
const discussionCategories = JSON.parse(localStorage.getItem('discussionCategories'));
if (window.FirestoreHelper) {
  FirestoreHelper.save('discussion', 'posts', { posts: discussionPosts || [] });
  FirestoreHelper.save('discussion', 'authors', { authors: discussionAuthors || [] });
  FirestoreHelper.save('discussion', 'categories', { categories: discussionCategories || [] });
  console.log('토론 데이터 마이그레이션 완료');
}
```

## 🔍 확인 방법

### Firestore에 데이터가 저장되었는지 확인

1. Firebase Console → Firestore Database → 데이터 탭
2. 컬렉션 확인:
   - `glossary`
   - `corpus`
   - `discussion`

### 실시간 동기화 확인

1. 두 개의 브라우저 창 열기
2. 한 창에서 데이터 수정
3. 다른 창에서 자동 업데이트 확인

## ⚠️ 주의사항

1. **인터넷 연결 필요**: Firestore 동기화는 인터넷 연결이 필요합니다.
2. **오프라인 모드**: 인터넷이 없어도 LocalStorage에 저장되며, 연결되면 자동 동기화됩니다.
3. **비용**: Firestore는 무료 할당량이 있지만, 사용량이 많으면 비용이 발생할 수 있습니다.
4. **보안**: 프로덕션 환경에서는 반드시 보안 규칙을 설정하세요.

## 🐛 문제 해결

### Firestore 연결 실패

- Firebase Console에서 Firestore가 활성화되었는지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- 네트워크 연결 확인

### 데이터가 동기화되지 않음

- 브라우저 콘솔에서 오류 확인
- Firestore 보안 규칙 확인
- 페이지 새로고침 후 재시도

### 실시간 업데이트가 작동하지 않음

- Firestore 보안 규칙에서 읽기 권한 확인
- 브라우저 콘솔에서 오류 확인
