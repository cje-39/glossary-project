# Google Apps Script 버전 - Glossary Project

이 디렉토리는 Google Apps Script로 변환된 프로젝트 파일들을 포함합니다.

## 📁 파일 구조

```
apps-script/
├── Code.gs                    # 메인 서버 사이드 코드
├── DataService.gs             # Google Sheets 데이터 저장/로드
├── ApiService.gs              # 외부 API 호출 (Claude, Confluence)
├── ClientService.gs            # 클라이언트 서비스 래퍼 (참고용)
├── Hub.html                   # 메인 허브 페이지
├── Glossary.html              # 용어집 페이지
├── Corpus.html                # 코퍼스 페이지
├── Discussion.html            # 토론 페이지
├── Review.html                # 리뷰 페이지
├── Settings.html              # 설정 페이지
├── Styles.html                # 공통 스타일
├── Scripts.html               # 공통 스크립트
├── APPS_SCRIPT_DEPLOY.md      # 배포 가이드
├── CONVERSION_GUIDE.md        # 변환 가이드
└── README.md                  # 이 파일
```

## 🚀 빠른 시작

1. **Apps Script 프로젝트 생성**
   - [Google Apps Script](https://script.google.com) 접속
   - "새 프로젝트" 클릭

2. **파일 업로드**
   - `.gs` 파일들을 Apps Script 편집기에 복사
   - HTML 파일들을 Apps Script HTML 파일로 생성

3. **배포**
   - "배포" → "새 배포" → "웹 앱"
   - 자세한 내용은 `APPS_SCRIPT_DEPLOY.md` 참고

## 📝 변환 상태

### ✅ 완료
- [x] 기본 프로젝트 구조
- [x] 데이터 서비스 (Google Sheets)
- [x] API 서비스 (Claude, Confluence)
- [x] 클라이언트 서비스 래퍼

### 🔄 진행 중
- [ ] HTML 파일 변환
- [ ] JavaScript 파일 변환
- [ ] 파일 업로드 처리

### ⏳ 예정
- [ ] 테스트 및 디버깅
- [ ] 성능 최적화
- [ ] 문서화 완료

## 🔧 주요 변경사항

### 데이터 저장
- **Firestore** → **Google Sheets**
- 실시간 동기화는 주기적 폴링으로 대체

### API 호출
- **fetch() + 프록시** → **UrlFetchApp**
- CORS 문제 해결

### 파일 처리
- 클라이언트 측 → 서버 측 (Drive API 사용 가능)

## 📚 문서

- `APPS_SCRIPT_DEPLOY.md` - 배포 가이드
- `CONVERSION_GUIDE.md` - 변환 가이드 및 예시

## ⚠️ 알려진 제한사항

1. **실행 시간**: 6분 제한
2. **할당량**: 일일 API 호출 제한
3. **파일 크기**: 250KB 제한
4. **실시간 동기화**: 폴링 방식 사용

## 🤝 기여

변환 작업은 진행 중입니다. 문제가 있거나 개선 사항이 있으면 이슈를 등록해주세요.
