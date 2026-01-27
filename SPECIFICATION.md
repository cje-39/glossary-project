# East Translation Team Language Resource Hub - 사양서

## 프로젝트 개요

**프로젝트명**: East Translation Team Language Resource Hub  
**목적**: 한국어-일본어 번역 팀을 위한 통합 언어 자산 관리 시스템  
**개발 기간**: 2024-2026  
**제작**: KRAFTON HQ East translation team

---

## 시스템 아키텍처

### 기술 스택
- **프론트엔드**: HTML5, CSS3, JavaScript (ES6+)
- **데이터 저장**: 브라우저 LocalStorage
- **AI API**: Anthropic Claude API (선택적)
- **서버**: Python HTTP Server (CORS 프록시)
- **파일 처리**: JSZip, XLSX.js (PPTX, DOCX, CSV, XLSX 지원)

### 파일 구조
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
├── styles.css            # 공통 스타일시트
├── hub.css               # Hub 페이지 스타일
├── discussion.css        # Discussion 페이지 스타일
└── data/
    └── glossary.json     # 초기 용어 데이터
```

---

## 페이지별 상세 사양

### 1. Hub (메인 페이지)

**파일**: `hub.html`, `hub.js`, `hub.css`

#### 기능
- **목적**: 시스템의 메인 네비게이션 허브
- **레이아웃**: 2x2 그리드 카드 레이아웃
- **카드 구성**: 각 서브 페이지로 이동하는 네비게이션 카드

#### 주요 기능
1. **네비게이션 카드**
   - Glossary (용어집)
   - Parallel Corpus (병렬 코퍼스)
   - Term Discussion (용어 토론)
   - Translation Review (번역물 리뷰)

2. **디자인 특징**
   - 가로가 넓은 직사각형 카드 (aspect-ratio: 2/1)
   - 호버 효과
   - 반응형 디자인

#### 데이터 저장
- 없음 (순수 네비게이션 페이지)

---

### 2. Glossary (용어집)

**파일**: `index.html`, `app.js`, `styles.css`

#### 기능
- **목적**: 한국어-일본어 용어집 관리
- **데이터 저장**: LocalStorage (`glossaryData`, `glossaryCategories`)

#### 주요 기능

1. **용어 관리**
   - 용어 추가/수정/삭제
   - 한국어, 일본어, 카테고리, 비고 필드
   - 카테고리별 그룹화 표시

2. **검색 및 필터링**
   - 실시간 검색 (한국어, 일본어, 비고 필드)
   - 카테고리별 필터링
   - 검색어 하이라이트

3. **카테고리 관리**
   - 카테고리별 카드 뷰
   - 카테고리 추가/수정/삭제
   - 카테고리별 아이콘 설정

4. **CSV 기능**
   - CSV 업로드 (일괄 추가)
   - CSV 다운로드 (엑셀 호환, UTF-8 BOM)
   - 중복 용어 자동 건너뛰기

5. **페이지네이션**
   - 페이지당 10개 항목 표시
   - 이전/다음 버튼

6. **정렬 기능**
   - 컬럼별 정렬 (한국어, 일본어, 카테고리, 비고)
   - 오름차순/내림차순 전환

#### 데이터 구조
```json
{
  "id": 1,
  "korean": "레벨",
  "japanese": "レベル",
  "category": "#dinkum",
  "notes": "플레이어 또는 캐릭터의 성장 단계"
}
```

---

### 3. Parallel Corpus (병렬 코퍼스)

**파일**: `corpus.html`, `corpus.js`, `ppt-extractor.js`

#### 기능
- **목적**: 한국어-일본어 병렬 코퍼스 생성 및 관리
- **데이터 저장**: LocalStorage (`corpusData`, `corpusFileGroups`)

#### 주요 기능

1. **파일 업로드 및 텍스트 추출**
   - 지원 형식: PPTX, DOCX, TXT, CSV, XLSX
   - 한국어/일본어 파일 동시 업로드
   - 슬라이드/문서 단위 텍스트 추출

2. **위치 기반 매칭**
   - PPT 파일 내 (x, y) 좌표 정보 활용
   - 가장 가까운 위치의 한국어-일본어 쌍 매칭
   - Y 좌표 차이 임계값: 200000 EMU (약 20cm)

3. **문장 단위 분할**
   - 자동 문장 분할 (마침표, 느낌표, 물음표 기준)
   - 한국어/일본어 각각 문장 단위로 분할
   - 분할된 문장을 개별 코퍼스 항목으로 생성

4. **코퍼스 관리**
   - 파일 그룹별 코퍼스 관리
   - 코퍼스 항목 추가/수정/삭제
   - 빈 칸 하이라이트 (한국어 또는 일본어가 비어있을 때)
   - 빈 칸 자동 저장 (페이지 이동 시)

5. **글로서리 연동**
   - 선택한 코퍼스 항목을 글로서리에 일괄 추가
   - 카테고리 선택 가능

6. **검색 기능**
   - 코퍼스 전체 검색
   - 검색 결과 별도 표시

7. **페이지네이션**
   - 페이지당 10/20/30개 항목 선택 가능
   - 이전/다음 버튼

#### 데이터 구조
```json
{
  "id": "uuid",
  "korean": "한국어 텍스트",
  "japanese": "일본어 텍스트",
  "fileGroupId": "file-group-uuid"
}
```

#### 파일 그룹 구조
```json
{
  "id": "file-group-uuid",
  "name": "파일명",
  "koreanFileName": "korean.pptx",
  "japaneseFileName": "japanese.pptx",
  "itemCount": 100
}
```

---

### 4. Term Discussion (용어 토론)

**파일**: `discussion.html`, `discussion.js`, `discussion.css`

#### 기능
- **목적**: 용어에 대한 팀 내 토론 및 의견 교환
- **데이터 저장**: LocalStorage (`discussionPosts`, `discussionAuthors`, `discussionCategories`)

#### 주요 기능

1. **게시물 관리**
   - 게시물 작성/수정/삭제
   - 한국어/일본어 용어 입력
   - 카테고리 분류
   - 작성자 지정

2. **작성자 관리**
   - 작성자 추가/삭제
   - 드롭다운 메뉴에서 작성자 선택
   - 작성자 삭제 시 관련 게시물의 작성자 필드 자동 초기화

3. **댓글 기능**
   - 게시물별 댓글 작성/수정/삭제
   - 댓글 작성자 표시

4. **AI 의미 생성**
   - Claude API를 통한 용어 의미 자동 생성
   - 한국어/일본어 각각 사전적 정의 생성
   - API 키는 LocalStorage에 저장

5. **카테고리 관리**
   - 카테고리별 필터링
   - 카테고리 추가/수정/삭제

6. **검색 기능**
   - 게시물 제목, 내용 검색

#### 데이터 구조
```json
{
  "id": "uuid",
  "title": "게시물 제목",
  "korean": "한국어 용어",
  "japanese": "일본어 용어",
  "category": "카테고리",
  "author": "작성자",
  "meaning": {
    "korean": "한국어 의미",
    "japanese": "일본어 의미"
  },
  "comments": [
    {
      "id": "comment-uuid",
      "author": "댓글 작성자",
      "content": "댓글 내용",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### 5. Translation Review (번역물 리뷰)

**파일**: `review.html`, `review.js`

#### 기능
- **목적**: 번역물의 오탈자 및 품질 점검
- **데이터 저장**: 없음 (일회성 검사)

#### 주요 기능

1. **파일 업로드 및 텍스트 추출**
   - 지원 형식: PPTX, DOCX, TXT, CSV, XLSX
   - 슬라이드/문서 단위 텍스트 추출
   - 중복 텍스트 자동 제거
     - 정확한 중복 제거
     - 연속 중복 제거
     - 유사도 기반 중복 제거 (90% 이상 유사)

2. **텍스트 통계**
   - 문자 수 (공백 제외)

3. **AI 기반 오탈자 점검**
   - Claude API를 통한 자동 오탈자 검사
   - 검사 항목:
     - 맞춤법 및 띄어쓰기
     - 번역 누락
     - 일관성
     - 전각 문장부호 체크 (한국어 텍스트)
   - 검사 결과 표시

#### 데이터 구조
- 일회성 검사이므로 데이터 저장 없음

---

## 공통 기능

### 1. LocalStorage 관리
- 모든 데이터는 브라우저 LocalStorage에 저장
- 키 이름:
  - `glossaryData`: 용어집 데이터
  - `glossaryCategories`: 용어집 카테고리
  - `corpusData`: 코퍼스 데이터
  - `corpusFileGroups`: 코퍼스 파일 그룹
  - `discussionPosts`: 토론 게시물
  - `discussionAuthors`: 토론 작성자
  - `discussionCategories`: 토론 카테고리
  - `claude_api_key`: Claude API 키 (선택적)

### 2. AI 기능 (Claude API)
- **용도**:
  - 용어 의미 생성 (Term Discussion)
  - 오탈자 점검 (Translation Review)
- **API 키 관리**: LocalStorage에 암호화 없이 저장 (선택적)
- **프록시 서버**: Python HTTP Server (`server.py`)를 통한 CORS 우회

### 3. 파일 처리
- **PPTX**: JSZip을 통한 압축 해제 및 XML 파싱
- **DOCX**: JSZip을 통한 압축 해제 및 XML 파싱
- **CSV/XLSX**: XLSX.js를 통한 파싱
- **TXT**: 직접 텍스트 읽기

### 4. 반응형 디자인
- 모바일/태블릿/데스크톱 지원
- 미디어 쿼리 활용

---

## 서버 구성

### Python HTTP Server (`server.py`)
- **목적**: CORS 프록시 서버
- **포트**: 3000 (기본값)
- **기능**:
  - 정적 파일 서빙
  - Claude API 프록시 (`/api/claude`)
  - CORS 헤더 추가
  - 에러 처리 (ConnectionAbortedError 등)

### 실행 방법
```bash
# Windows
서버실행.bat

# Linux/Mac
python server.py
```

---

## 데이터 마이그레이션

### LocalStorage → 파일
- 현재는 LocalStorage만 사용
- 향후 백엔드 연동 시 마이그레이션 필요

### 파일 → LocalStorage
- 초기 데이터는 `data/glossary.json`에서 로드
- CSV 업로드를 통한 일괄 추가 지원

---

## 보안 고려사항

1. **API 키 관리**
   - API 키는 LocalStorage에 평문 저장
   - 프로덕션 환경에서는 서버 사이드에서 관리 권장

2. **CORS**
   - 개발 환경에서만 Python 프록시 서버 사용
   - 프로덕션 환경에서는 적절한 CORS 설정 필요

3. **데이터 백업**
   - LocalStorage 데이터는 브라우저별로 저장
   - 정기적인 데이터 내보내기 권장

---

## 향후 개선 사항

1. **백엔드 연동**
   - 서버 사이드 데이터 저장
   - 사용자 인증
   - 데이터 동기화

2. **AI 기능 강화**
   - 더 정교한 매칭 알고리즘
   - 번역 품질 평가

3. **성능 최적화**
   - 대용량 파일 처리 최적화
   - 가상 스크롤링

4. **UI/UX 개선**
   - 다크 모드
   - 키보드 단축키
   - 드래그 앤 드롭

---

## 버전 정보

- **현재 버전**: 1.0.0
- **최종 업데이트**: 2026년
- **주요 변경 사항**:
  - 위치 기반 코퍼스 매칭 구현
  - 문장 단위 자동 분할
  - 빈 칸 하이라이트 및 자동 저장
  - AI 기반 오탈자 점검

---

## 라이선스

MIT License

---

## 문의

KRAFTON HQ East translation team
