# GitHub 업로드 가이드

이 프로젝트를 GitHub에 업로드하는 방법을 안내합니다.

## 📋 사전 준비

1. GitHub 계정이 필요합니다. [GitHub](https://github.com)에서 계정을 만드세요.
2. Git이 설치되어 있어야 합니다. [Git 다운로드](https://git-scm.com/downloads)

## 🚀 GitHub에 업로드하기

### 1. GitHub에서 새 저장소 생성

1. GitHub에 로그인
2. 우측 상단의 "+" 버튼 클릭 → "New repository" 선택
3. 저장소 정보 입력:
   - **Repository name**: `language-resource-hub` (또는 원하는 이름)
   - **Description**: "한국어-일본어 번역 팀을 위한 통합 언어 자산 관리 시스템"
   - **Visibility**: Public 또는 Private 선택
   - **Initialize this repository with**: 체크하지 않음 (이미 파일이 있으므로)
4. "Create repository" 클릭

### 2. 로컬에서 Git 초기화 및 업로드

프로젝트 폴더에서 다음 명령어를 실행하세요:

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: Language Resource Hub"

# GitHub 저장소 연결 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 메인 브랜치 설정
git branch -M main

# GitHub에 업로드
git push -u origin main
```

### 3. 인증

GitHub에 업로드할 때 인증이 필요할 수 있습니다:

- **Personal Access Token (PAT) 사용** (권장):
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. "Generate new token" 클릭
  3. 권한 선택: `repo` 체크
  4. 토큰 생성 후 복사
  5. 비밀번호 입력 시 토큰 사용

- 또는 **GitHub CLI 사용**:
```bash
gh auth login
```

## 📝 커밋 메시지 가이드

의미 있는 커밋 메시지를 작성하세요:

```bash
git commit -m "feat: 새로운 기능 추가"
git commit -m "fix: 버그 수정"
git commit -m "docs: 문서 업데이트"
git commit -m "refactor: 코드 리팩토링"
```

## 🔄 이후 업데이트

변경사항을 업로드할 때:

```bash
# 변경된 파일 확인
git status

# 변경된 파일 추가
git add .

# 커밋
git commit -m "변경사항 설명"

# GitHub에 업로드
git push
```

## ⚠️ 주의사항

### 민감한 정보 제외

다음 항목은 GitHub에 업로드하지 마세요:

- API 키 (`.env` 파일 등)
- 개인 정보
- 대용량 파일
- 로컬 설정 파일

현재 `.gitignore` 파일에 다음이 포함되어 있습니다:
- `node_modules/`
- `.vscode/`, `.idea/`
- `__pycache__/`, `*.pyc`
- `*.log`
- `.DS_Store`, `Thumbs.db`

### API 키 관리

Claude API 키는 사용자가 브라우저에서 직접 입력하므로 코드에 포함되지 않습니다. 
만약 `.env` 파일이나 설정 파일에 API 키를 저장한다면 `.gitignore`에 추가하세요.

## 📚 추가 리소스

- [Git 공식 문서](https://git-scm.com/doc)
- [GitHub 가이드](https://guides.github.com/)
- [GitHub CLI 문서](https://cli.github.com/manual/)

## 🆘 문제 해결

### 업로드 실패 시

```bash
# 원격 저장소 확인
git remote -v

# 원격 저장소 재설정
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 강제 푸시 (주의: 기존 내용 덮어씀)
git push -f origin main
```

### 충돌 해결

```bash
# 최신 변경사항 가져오기
git pull origin main

# 충돌 해결 후
git add .
git commit -m "Merge conflict resolved"
git push
```

---

업로드가 완료되면 GitHub 저장소 페이지에서 프로젝트를 확인할 수 있습니다!
