# 🚀 시작하기 - 단계별 가이드

이제 Google Apps Script로 변환을 시작하세요!

## 📋 체크리스트

### ✅ 1단계: Apps Script 프로젝트 생성 (5분)

1. **Google Apps Script 접속**
   ```
   https://script.google.com
   ```

2. **새 프로젝트 생성**
   - "새 프로젝트" 클릭
   - 프로젝트 이름: "Glossary Project"

3. **서버 사이드 파일 업로드**
   
   **Code.gs** (기본 파일):
   - `apps-script/Code.gs` 내용 복사 → 붙여넣기
   
   **DataService.gs** (새 파일):
   - "+" 버튼 → "스크립트" 선택
   - 이름: "DataService"
   - `apps-script/DataService.gs` 내용 복사 → 붙여넣기
   
   **ApiService.gs** (새 파일):
   - "+" 버튼 → "스크립트" 선택
   - 이름: "ApiService"
   - `apps-script/ApiService.gs` 내용 복사 → 붙여넣기

4. **초기 실행**
   - `Code.gs` 파일 열기
   - `getSpreadsheetId` 함수 찾기 (DataService.gs에 있음)
   - 함수 선택 후 실행 버튼(▶) 클릭
   - 권한 승인 (첫 실행 시)
   - ✅ Google Sheets가 자동으로 생성됨

### ✅ 2단계: 첫 번째 HTML 파일 생성 (Hub 페이지)

1. **Hub.html 생성**
   - "+" 버튼 → "HTML" 선택
   - 이름: "Hub"
   - `apps-script/Hub.html` 내용 복사 → 붙여넣기

2. **ClientService.js 생성**
   - "+" 버튼 → "HTML" 선택 (스크립트이지만 HTML로 생성)
   - 이름: "ClientService"
   - `apps-script/ClientService.js` 내용 복사 → 붙여넣기

3. **Styles.html 생성** (스타일 파일)
   - "+" 버튼 → "HTML" 선택
   - 이름: "Styles"
   - 기존 `styles.css`와 `hub.css` 내용을 합쳐서 HTML 형식으로 작성
   - 또는 간단한 스타일부터 시작

### ✅ 3단계: 첫 배포 및 테스트

1. **웹 앱 배포**
   - "배포" → "새 배포" 클릭
   - 유형: "웹 앱" 선택
   - 설정:
     - 설명: "Glossary Project v1.0"
     - 실행 사용자: "나"
     - 액세스 권한: "모든 사용자"
   - "배포" 클릭

2. **권한 승인**
   - 첫 실행 시 권한 승인 요청
   - "권한 검토" → Google 계정 선택 → "고급" → "안전하지 않은 페이지로 이동" → "허용"

3. **테스트**
   - 웹 앱 URL로 접속
   - Hub 페이지가 표시되는지 확인
   - 각 링크 클릭 테스트 (아직 다른 페이지는 없지만 링크는 작동해야 함)

### ✅ 4단계: 다음 페이지 변환

Hub 페이지가 작동하면 다음 순서로 진행:

1. **Glossary 페이지** (가장 중요)
   - `index.html` → `Glossary.html`로 변환
   - `app.js` → 클라이언트 스크립트로 변환
   - `CONVERSION_GUIDE.md` 참고

2. **나머지 페이지들**
   - Corpus, Discussion, Review, Settings 순서로 진행

## 🎯 지금 바로 할 일

### 옵션 1: 빠른 테스트 (권장)

1. Apps Script 프로젝트 생성
2. 서버 사이드 파일 3개 업로드
3. Hub.html 업로드
4. 간단한 Styles.html 생성
5. 배포 및 테스트

### 옵션 2: 전체 변환 후 배포

1. 모든 파일 변환
2. 한 번에 배포
3. 통합 테스트

## 📝 간단한 Styles.html 예시

빠르게 시작하려면 이 스타일을 사용하세요:

```html
<style>
body {
  font-family: 'Pretendard', 'Nanum Gothic', sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
}

.hub-container {
  max-width: 1200px;
  margin: 0 auto;
}

.hub-header {
  text-align: center;
  margin-bottom: 40px;
}

.hub-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.nav-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-decoration: none;
  color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.nav-card:hover {
  transform: translateY(-5px);
}

.nav-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.hub-footer {
  text-align: center;
  color: #666;
  margin-top: 40px;
}
</style>
```

## ❓ 문제 해결

### "함수를 찾을 수 없습니다" 오류
- `getSpreadsheetId`는 `DataService.gs`에 있습니다
- `DataService.gs` 파일이 제대로 업로드되었는지 확인

### "권한이 거부되었습니다" 오류
- 스프레드시트 접근 권한 확인
- 웹 앱 배포 시 "모든 사용자" 권한 설정

### 페이지가 표시되지 않음
- `Code.gs`의 `doGet` 함수 확인
- `page` 파라미터가 올바르게 처리되는지 확인

## 📚 참고 문서

- `QUICK_START.md` - 빠른 시작 가이드
- `CONVERSION_GUIDE.md` - 상세 변환 가이드
- `NEXT_STEPS.md` - 다음 단계 상세 가이드
- `APPS_SCRIPT_DEPLOY.md` - 배포 가이드

---

**지금 시작**: https://script.google.com 에서 프로젝트를 생성하세요!
