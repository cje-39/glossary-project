# 🎯 지금 바로 시작하기 - 실행 계획

## ✅ 지금 해야 할 일 (순서대로)

### 1단계: Apps Script 프로젝트 생성 (5분)

1. **브라우저에서 열기**
   ```
   https://script.google.com
   ```

2. **프로젝트 생성**
   - "새 프로젝트" 클릭
   - 이름: "Glossary Project"

3. **파일 업로드** (3개 파일)
   
   **Code.gs** (기본 파일):
   - `apps-script/Code.gs` 파일 열기
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)
   - Apps Script 편집기의 `Code.gs`에 붙여넣기 (Ctrl+V)
   
   **DataService.gs** (새로 만들기):
   - 왼쪽 상단 "+" 버튼 클릭
   - "스크립트" 선택
   - 이름을 "DataService"로 변경
   - `apps-script/DataService.gs` 내용 복사 → 붙여넣기
   
   **ApiService.gs** (새로 만들기):
   - "+" 버튼 → "스크립트" 선택
   - 이름을 "ApiService"로 변경
   - `apps-script/ApiService.gs` 내용 복사 → 붙여넣기

4. **저장**
   - Ctrl+S 또는 "저장" 버튼 클릭

### 2단계: 초기 설정 (2분)

1. **스프레드시트 생성**
   - `DataService.gs` 파일 열기
   - `getSpreadsheetId` 함수 찾기
   - 함수 선택 후 상단 실행 버튼(▶) 클릭
   - 권한 승인 (첫 실행 시)
   - ✅ "Glossary Project Data" 스프레드시트가 Google Drive에 생성됨

2. **확인**
   - Google Drive에서 "Glossary Project Data" 스프레드시트 확인
   - 여러 시트가 자동으로 생성되어 있는지 확인

### 3단계: 첫 번째 HTML 파일 생성 (Hub 페이지) (5분)

1. **Hub.html 생성**
   - "+" 버튼 → "HTML" 선택
   - 이름: "Hub"
   - `apps-script/Hub.html` 내용 복사 → 붙여넣기

2. **ClientService.js 생성**
   - "+" 버튼 → "HTML" 선택 (스크립트지만 HTML로 생성)
   - 이름: "ClientService"
   - `apps-script/ClientService.js` 내용 복사 → 붙여넣기

3. **Styles.html 생성**
   - "+" 버튼 → "HTML" 선택
   - 이름: "Styles"
   - `apps-script/Styles.html` 내용 복사 → 붙여넣기

4. **저장**
   - 모든 파일 저장

### 4단계: 첫 배포 및 테스트 (3분)

1. **웹 앱 배포**
   - 상단 메뉴 "배포" → "새 배포" 클릭
   - 설정:
     - **유형**: "웹 앱" 선택
     - **설명**: "Glossary Project v1.0"
     - **실행 사용자**: "나" 선택
     - **액세스 권한**: "모든 사용자" 선택
   - "배포" 버튼 클릭

2. **권한 승인**
   - "권한 검토" 클릭
   - Google 계정 선택
   - "고급" 클릭
   - "안전하지 않은 페이지로 이동" 클릭
   - "허용" 클릭

3. **웹 앱 URL 복사**
   - 배포 완료 후 웹 앱 URL 복사
   - 예: `https://script.google.com/macros/s/.../exec`

4. **테스트**
   - 새 탭에서 웹 앱 URL 열기
   - Hub 페이지가 표시되는지 확인
   - 네비게이션 카드 4개가 보이는지 확인

### 5단계: 다음 페이지 변환

Hub 페이지가 작동하면:

1. **Glossary 페이지 변환** (가장 중요)
   - `index.html` → `Glossary.html`로 변환
   - `app.js` → 클라이언트 스크립트로 변환
   - `CONVERSION_GUIDE.md` 참고

2. **나머지 페이지들**
   - Corpus, Discussion, Review, Settings 순서로 진행

## 📝 체크리스트

### 필수 파일 (지금 바로 만들기)
- [ ] Code.gs
- [ ] DataService.gs
- [ ] ApiService.gs
- [ ] Hub.html
- [ ] ClientService.js (HTML로 생성)
- [ ] Styles.html

### 테스트
- [ ] 스프레드시트 생성 확인
- [ ] Hub 페이지 배포
- [ ] 웹 앱 URL 접속 테스트
- [ ] 네비게이션 링크 확인

## 🎯 성공 기준

✅ Hub 페이지가 표시됨
✅ 4개의 네비게이션 카드가 보임
✅ 링크 클릭 시 URL이 변경됨 (다른 페이지는 아직 없지만)

## ❓ 문제 발생 시

### "함수를 찾을 수 없습니다"
- `getSpreadsheetId`는 `DataService.gs`에 있습니다
- 파일이 제대로 업로드되었는지 확인

### "권한이 거부되었습니다"
- 스프레드시트 접근 권한 확인
- 웹 앱 배포 시 "모든 사용자" 권한 설정

### 페이지가 표시되지 않음
- `Code.gs`의 `doGet` 함수 확인
- `Hub.html` 파일이 올바르게 생성되었는지 확인

## 🚀 다음 단계

Hub 페이지가 작동하면:
1. `NEXT_STEPS.md` 참고
2. `CONVERSION_GUIDE.md`의 패턴 따라 Glossary 페이지 변환
3. 하나씩 변환하며 테스트

---

**지금 시작**: https://script.google.com 에서 프로젝트를 생성하세요!
