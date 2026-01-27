# East Translation Team Language Resource Hub

한국어-일본어 번역 팀을 위한 통합 언어 자산 관리 시스템입니다.

## 📋 프로젝트 개요

이 프로젝트는 게임 번역 팀을 위한 통합 언어 자산 관리 플랫폼으로, 용어집 관리, 병렬 코퍼스 생성, 용어 토론, 번역물 리뷰 기능을 제공합니다.

## ✨ 주요 기능

### 1. Glossary (용어집)
- 한국어-일본어 용어 관리 (추가/수정/삭제)
- 카테고리별 그룹화 및 필터링
- 실시간 검색 및 하이라이트
- CSV 업로드/다운로드 (엑셀 호환)
- 페이지네이션 및 정렬

### 2. Parallel Corpus (병렬 코퍼스)
- PPTX, DOCX, TXT, CSV, XLSX 파일 지원
- 위치 기반 자동 매칭 (PPT 파일 내 좌표 활용)
- 문장 단위 자동 분할
- 빈 칸 하이라이트 및 자동 저장
- 글로서리 연동 (일괄 추가)

### 3. Term Discussion (용어 토론)
- 용어에 대한 팀 내 토론 및 의견 교환
- 게시물 및 댓글 관리
- 작성자 관리
- AI 기반 용어 의미 자동 생성 (Claude API)
- 카테고리별 필터링

### 4. Translation Review (번역물 리뷰)
- PPTX, DOCX, TXT, CSV, XLSX 파일 지원
- 텍스트 자동 추출 및 중복 제거
- AI 기반 오탈자 점검 (Claude API)
  - 맞춤법 및 띄어쓰기
  - 번역 누락
  - 일관성
  - 전각 문장부호 체크

## 🚀 시작하기

### 로컬 개발

#### 필수 요구사항

- Python 3.x (서버 실행용)
- Node.js (선택적, npm 패키지 사용 시)
- 최신 웹 브라우저 (Chrome, Firefox, Edge 등)

#### 설치 및 실행

1. **저장소 클론**
```bash
git clone <repository-url>
cd glossary-project
```

2. **의존성 설치 (선택적)**
```bash
npm install
```

3. **서버 실행**

**Windows:**
```bash
서버실행.bat
```

**Linux/Mac:**
```bash
python server.py
```

또는 Node.js 서버 사용:
```bash
npm start
```

4. **브라우저에서 접속**
- 서버 실행 후: `http://localhost:3000` (Python 서버) 또는 `http://localhost:8080` (Node.js 서버)
- 또는 직접 `hub.html` 파일을 브라우저에서 열어도 됩니다 (일부 기능 제한)

### Netlify 배포

Netlify를 사용하여 배포하면 AI 기능도 함께 사용할 수 있습니다.

**빠른 배포:**
1. GitHub에 프로젝트 업로드
2. [Netlify](https://www.netlify.com)에서 저장소 연결
3. 자동 배포 완료

자세한 내용은 [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)를 참고하세요.

## 📁 프로젝트 구조

```
glossary-project/
├── hub.html              # 메인 허브 페이지
├── index.html            # Glossary (용어집) 페이지
├── corpus.html           # Parallel Corpus (병렬 코퍼스) 페이지
├── discussion.html       # Term Discussion (용어 토론) 페이지
├── review.html           # Translation Review (번역물 리뷰) 페이지
├── app.js                # Glossary 관리 로직
├── corpus.js             # Corpus 관리 로직
├── discussion.js         # Discussion 관리 로직
├── review.js             # Review 관리 로직
├── ppt-extractor.js      # PPT/문서 추출 및 매칭 로직
├── server.py             # Python CORS 프록시 서버
├── server.js             # Node.js 서버 (선택적)
├── styles.css            # 공통 스타일시트
├── hub.css               # Hub 페이지 스타일
├── discussion.css        # Discussion 페이지 스타일
├── package.json          # 프로젝트 설정
├── netlify.toml          # Netlify 설정 파일
├── netlify/
│   └── functions/
│       └── claude.js     # Netlify Functions (Claude API 프록시)
├── README.md             # 이 파일
├── README_SERVER.md      # 서버 설정 가이드
├── NETLIFY_DEPLOY.md     # Netlify 배포 가이드
├── SPECIFICATION.md      # 상세 사양서
└── data/
    └── glossary.json     # 초기 용어 데이터
```

## 🔧 기술 스택

- **프론트엔드**: HTML5, CSS3, JavaScript (ES6+)
- **데이터 저장**: 브라우저 LocalStorage
- **AI API**: Anthropic Claude API (선택적)
- **서버**: Python HTTP Server 또는 Node.js (CORS 프록시)
- **파일 처리**: JSZip, XLSX.js (PPTX, DOCX, CSV, XLSX 지원)

## 🔑 AI 기능 사용 (선택적)

일부 기능(용어 의미 생성, 오탈자 점검)은 Claude API를 사용합니다.

1. [Anthropic Console](https://console.anthropic.com)에서 API 키 발급
2. 각 페이지에서 API 키 입력 및 저장
3. API 키는 브라우저 LocalStorage에 저장됩니다

**주의**: API 키는 평문으로 저장되므로, 프로덕션 환경에서는 서버 사이드에서 관리하는 것을 권장합니다.

## 📊 데이터 저장

모든 데이터는 브라우저의 LocalStorage에 저장됩니다:

- `glossaryData`: 용어집 데이터
- `glossaryCategories`: 용어집 카테고리
- `corpusData`: 코퍼스 데이터
- `corpusFileGroups`: 코퍼스 파일 그룹
- `discussionPosts`: 토론 게시물
- `discussionAuthors`: 토론 작성자
- `discussionCategories`: 토론 카테고리
- `claude_api_key`: Claude API 키 (선택적)

## 📝 사용 예시

### 용어집에 용어 추가
1. Hub 페이지에서 "Glossary" 클릭
2. 카테고리 선택 또는 새 카테고리 생성
3. "용어 추가" 버튼 클릭
4. 한국어, 일본어, 카테고리, 비고 입력
5. 저장

### 병렬 코퍼스 생성
1. Hub 페이지에서 "Parallel Corpus" 클릭
2. 한국어 파일과 일본어 파일 업로드
3. "텍스트 추출하기" 버튼 클릭
4. 자동으로 위치 기반 매칭 수행
5. 결과 확인 및 수정
6. 글로서리에 추가 (선택적)

### 번역물 오탈자 점검
1. Hub 페이지에서 "Translation Review" 클릭
2. 파일 업로드 (PPTX, DOCX 등)
3. "텍스트 추출" 버튼 클릭
4. "오탈자 점검" 버튼 클릭 (API 키 필요)
5. 검사 결과 확인

## 🤝 기여하기

이 프로젝트는 KRAFTON HQ East translation team의 내부 프로젝트입니다.

## 📄 라이선스

MIT License

## 📞 문의

KRAFTON HQ East translation team

---

자세한 사양은 [SPECIFICATION.md](./SPECIFICATION.md)를 참고하세요.
