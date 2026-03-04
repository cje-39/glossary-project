# Google Apps Script 배포 가이드

이 가이드는 프로젝트를 Google Apps Script로 변환하고 배포하는 방법을 설명합니다.

## 📋 사전 준비

1. **Google 계정** 필요
2. **Google Drive** 접근 권한
3. **Google Sheets** 사용 가능

## 🚀 배포 단계

### 1단계: Apps Script 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름 변경: "Glossary Project"

### 2단계: 파일 업로드

Apps Script 편집기에서 다음 파일들을 생성/업로드:

#### 서버 사이드 파일 (.gs)
- `Code.gs` - 메인 진입점
- `DataService.gs` - Google Sheets 데이터 저장/로드
- `ApiService.gs` - 외부 API 호출

#### HTML 파일
- `Hub.html` - 메인 허브 페이지
- `Glossary.html` - 용어집 페이지
- `Corpus.html` - 코퍼스 페이지
- `Discussion.html` - 토론 페이지
- `Review.html` - 리뷰 페이지
- `Settings.html` - 설정 페이지
- `Styles.html` - 공통 스타일
- `Scripts.html` - 공통 스크립트

### 3단계: 스프레드시트 설정

1. Apps Script 편집기에서 `Code.gs` 실행
2. `getSpreadsheetId()` 함수가 자동으로 스프레드시트 생성
3. 생성된 스프레드시트 ID 확인 (스크립트 속성에 저장됨)

### 4단계: 웹 앱으로 배포

1. Apps Script 편집기에서 "배포" → "새 배포" 클릭
2. 유형 선택: "웹 앱"
3. 설정:
   - **설명**: "Glossary Project Web App"
   - **실행 사용자**: "나"
   - **액세스 권한**: "모든 사용자"
4. "배포" 클릭
5. 웹 앱 URL 복사

### 5단계: 권한 승인

1. 첫 실행 시 권한 승인 요청
2. "권한 검토" 클릭
3. Google 계정 선택
4. "고급" → "안전하지 않은 페이지로 이동" 클릭
5. "허용" 클릭

## ⚙️ 설정

### 스크립트 속성 설정

Apps Script 편집기에서:
1. "프로젝트 설정" (톱니바퀴 아이콘)
2. "스크립트 속성" 탭
3. 다음 속성 추가:
   - `SPREADSHEET_ID`: (자동 생성됨)

### API 키 설정

Claude API 키는 각 페이지에서 사용자가 직접 입력합니다.
Confluence API 설정도 Settings 페이지에서 입력합니다.

## 📊 데이터 구조

### Google Sheets 시트 구조

프로젝트는 다음 시트를 사용합니다:

1. **Glossary** - 용어집 데이터
   - 컬럼: id, korean, japanese, category, notes, updatedAt

2. **Categories** - 카테고리 목록
   - 컬럼: categories (JSON)

3. **Corpus** - 코퍼스 데이터
   - 컬럼: id, korean, japanese, fileGroupId

4. **FileGroups** - 파일 그룹
   - 컬럼: id, name, koreanFileName, japaneseFileName, itemCount, folderId

5. **Folders** - 폴더 목록
   - 컬럼: id, name

6. **Discussion** - 토론 게시물
   - 컬럼: id, term, author, content, meaning, category, createdAt, updatedAt

7. **Authors** - 작성자 목록
   - 컬럼: authors (JSON)

8. **DiscussionCategories** - 토론 카테고리
   - 컬럼: categories (JSON)

9. **Settings** - 설정
   - 컬럼: key, value

## 🔧 주요 변경사항

### 데이터 저장
- **이전**: Firebase Firestore / LocalStorage
- **이후**: Google Sheets

### API 호출
- **이전**: `fetch()` → 프록시 서버 → 외부 API
- **이후**: `google.script.run` → `UrlFetchApp` → 외부 API

### 파일 업로드
- **이전**: 클라이언트 측 처리
- **이후**: Apps Script 서버 측 처리 (Drive API 사용 가능)

## 🐛 문제 해결

### 권한 오류
- 스프레드시트 접근 권한 확인
- 웹 앱 배포 시 "모든 사용자" 권한 설정

### API 호출 실패
- `UrlFetchApp`의 `muteHttpExceptions: true` 옵션 확인
- API 키가 올바르게 전달되는지 확인

### 데이터 저장 실패
- 스프레드시트 ID가 올바른지 확인
- 스프레드시트 접근 권한 확인

## 📝 참고사항

1. **실행 시간 제한**: Apps Script는 6분 실행 시간 제한이 있습니다.
2. **할당량**: 일일 API 호출 제한이 있습니다.
3. **보안**: API 키는 클라이언트에서 입력받지만, 서버 사이드에서 처리됩니다.

## 🔄 업데이트 배포

코드를 수정한 후:
1. Apps Script 편집기에서 저장
2. "배포" → "배포 관리"
3. 기존 배포의 "편집" 클릭
4. "새 버전" 선택
5. "배포" 클릭

---

배포가 완료되면 웹 앱 URL로 접속하여 사용할 수 있습니다!
