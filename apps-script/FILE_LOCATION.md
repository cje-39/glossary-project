# 📁 파일 위치 및 용도

모든 Google Apps Script 변환 파일은 **`apps-script/`** 디렉토리에 있습니다.

## 📍 전체 경로

```
C:\glossary-project\apps-script\
```

## 📋 파일 목록 및 용도

### 서버 사이드 파일 (.gs) - Apps Script에 업로드 필요

1. **Code.gs** (6.6KB)
   - 위치: `apps-script/Code.gs`
   - 용도: 메인 진입점, 라우팅, doGet/doPost 처리
   - Apps Script에서: 기본 `Code.gs` 파일에 복사

2. **DataService.gs** (16.6KB)
   - 위치: `apps-script/DataService.gs`
   - 용도: Google Sheets 데이터 저장/로드 서비스
   - Apps Script에서: 새 스크립트 파일 "DataService"로 생성

3. **ApiService.gs** (4.4KB)
   - 위치: `apps-script/ApiService.gs`
   - 용도: Claude API, Confluence API 호출
   - Apps Script에서: 새 스크립트 파일 "ApiService"로 생성

### HTML 파일 - Apps Script에 업로드 필요

4. **Hub.html** (2.6KB)
   - 위치: `apps-script/Hub.html`
   - 용도: 메인 허브 페이지
   - Apps Script에서: 새 HTML 파일 "Hub"로 생성

5. **Styles.html** (2.9KB)
   - 위치: `apps-script/Styles.html`
   - 용도: 공통 CSS 스타일
   - Apps Script에서: 새 HTML 파일 "Styles"로 생성

6. **ClientService.js** (10.1KB)
   - 위치: `apps-script/ClientService.js`
   - 용도: 클라이언트 사이드 서비스 래퍼
   - Apps Script에서: 새 HTML 파일 "ClientService"로 생성 (스크립트지만 HTML로)

### 문서 파일 (.md) - 참고용

7. **ACTION_PLAN.md** (4.6KB)
   - 위치: `apps-script/ACTION_PLAN.md`
   - 용도: 지금 바로 시작하기 가이드

8. **START_HERE.md** (4.9KB)
   - 위치: `apps-script/START_HERE.md`
   - 용도: 빠른 시작 가이드

9. **NEXT_STEPS.md** (6.4KB)
   - 위치: `apps-script/NEXT_STEPS.md`
   - 용도: 다음 단계 상세 가이드

10. **CONVERSION_GUIDE.md** (8.0KB)
    - 위치: `apps-script/CONVERSION_GUIDE.md`
    - 용도: 변환 패턴 및 예시 코드

11. **APPS_SCRIPT_DEPLOY.md** (4.5KB)
    - 위치: `apps-script/APPS_SCRIPT_DEPLOY.md`
    - 용도: 배포 가이드

12. **QUICK_START.md** (2.6KB)
    - 위치: `apps-script/QUICK_START.md`
    - 용도: 빠른 시작 가이드

13. **README.md** (2.8KB)
    - 위치: `apps-script/README.md`
    - 용도: 프로젝트 개요

14. **SUMMARY.md** (5.0KB)
    - 위치: `apps-script/SUMMARY.md`
    - 용도: 변환 요약

15. **FILE_LOCATION.md** (이 파일)
    - 위치: `apps-script/FILE_LOCATION.md`
    - 용도: 파일 위치 안내

## 🚀 사용 방법

### Windows 탐색기에서 열기

1. Windows 탐색기 열기
2. 주소창에 입력:
   ```
   C:\glossary-project\apps-script
   ```
3. 또는 프로젝트 폴더에서 `apps-script` 폴더 더블클릭

### VS Code에서 열기

1. VS Code에서 프로젝트 열기
2. 왼쪽 파일 탐색기에서 `apps-script` 폴더 클릭
3. 파일 목록 확인

### 터미널에서 열기

```bash
cd apps-script
dir
```

## 📝 Apps Script에 업로드할 파일

### 필수 파일 (지금 바로 업로드)

1. ✅ **Code.gs** → Apps Script의 `Code.gs`
2. ✅ **DataService.gs** → Apps Script의 새 스크립트 "DataService"
3. ✅ **ApiService.gs** → Apps Script의 새 스크립트 "ApiService"
4. ✅ **Hub.html** → Apps Script의 새 HTML "Hub"
5. ✅ **ClientService.js** → Apps Script의 새 HTML "ClientService"
6. ✅ **Styles.html** → Apps Script의 새 HTML "Styles"

### 나중에 업로드할 파일

- Glossary.html (아직 변환 안 됨)
- Corpus.html (아직 변환 안 됨)
- Discussion.html (아직 변환 안 됨)
- Review.html (아직 변환 안 됨)
- Settings.html (아직 변환 안 됨)

## 💡 팁

- 파일을 열 때는 텍스트 에디터 사용 (VS Code, Notepad++ 등)
- 복사할 때는 전체 내용 선택 (Ctrl+A) 후 복사 (Ctrl+C)
- Apps Script 편집기에서 붙여넣기 (Ctrl+V)

---

**파일 위치**: `C:\glossary-project\apps-script\`
