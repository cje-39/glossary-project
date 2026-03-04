# 빠른 시작 가이드

Google Apps Script로 변환된 프로젝트를 빠르게 시작하는 방법입니다.

## 1단계: Apps Script 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름을 "Glossary Project"로 변경

## 2단계: 파일 복사

### 서버 사이드 파일 (.gs)

Apps Script 편집기에서 다음 파일들을 생성하고 내용을 복사:

1. **Code.gs** - `apps-script/Code.gs` 내용 복사
2. **DataService.gs** - `apps-script/DataService.gs` 내용 복사
3. **ApiService.gs** - `apps-script/ApiService.gs` 내용 복사

### HTML 파일

Apps Script 편집기에서:
1. "+" 버튼 클릭 → "HTML" 선택
2. 파일 이름 입력 (예: "Hub")
3. `apps-script/` 디렉토리의 해당 HTML 파일 내용 복사

필요한 HTML 파일:
- Hub.html
- Glossary.html
- Corpus.html
- Discussion.html
- Review.html
- Settings.html
- Styles.html
- Scripts.html

## 3단계: 초기 설정

1. `Code.gs` 파일에서 `getSpreadsheetId()` 함수 실행
   - 자동으로 Google Sheets가 생성됩니다
   - 스프레드시트 ID가 스크립트 속성에 저장됩니다

2. 생성된 스프레드시트 확인
   - Google Drive에서 "Glossary Project Data" 스프레드시트 확인
   - 필요한 시트가 자동으로 생성됩니다

## 4단계: 웹 앱 배포

1. Apps Script 편집기에서 "배포" → "새 배포" 클릭
2. 설정:
   - **유형**: 웹 앱
   - **설명**: "Glossary Project v1.0"
   - **실행 사용자**: 나
   - **액세스 권한**: 모든 사용자
3. "배포" 클릭
4. 웹 앱 URL 복사

## 5단계: 테스트

1. 웹 앱 URL로 접속
2. 권한 승인 (첫 실행 시)
3. 각 페이지 테스트:
   - Hub 페이지
   - Glossary 페이지
   - Corpus 페이지
   - Discussion 페이지
   - Review 페이지
   - Settings 페이지

## 🔧 문제 해결

### 권한 오류
- 스프레드시트 접근 권한 확인
- 웹 앱 배포 시 "모든 사용자" 권한 설정

### 데이터가 로드되지 않음
- 스프레드시트가 올바르게 생성되었는지 확인
- 스크립트 속성에서 SPREADSHEET_ID 확인

### API 호출 실패
- API 키가 올바르게 입력되었는지 확인
- Apps Script 실행 로그 확인

## 📝 다음 단계

1. HTML 파일들을 실제로 변환 (현재는 구조만 제공)
2. JavaScript 파일들을 클라이언트 스크립트로 변환
3. 파일 업로드 기능 구현
4. 테스트 및 디버깅

자세한 내용은 `CONVERSION_GUIDE.md`를 참고하세요.
