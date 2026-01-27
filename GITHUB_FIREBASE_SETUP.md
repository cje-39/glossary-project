# GitHub 연동으로 Firebase 배포하기

GitHub에 푸시하면 자동으로 Firebase에 배포되도록 설정하는 방법입니다.

## 🔧 설정 단계

### 1단계: Firebase 토큰 생성

1. **로컬에서 Firebase CLI 설치** (한 번만 필요)
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase 로그인**
   ```bash
   firebase login
   ```

3. **Firebase 토큰 생성**
   ```bash
   firebase login:ci
   ```
   - 이 명령어는 토큰을 출력합니다
   - **이 토큰을 복사해두세요** (다음 단계에서 사용)

### 2단계: GitHub Secrets에 토큰 추가

1. **GitHub 저장소 접속**
   - 저장소 페이지로 이동

2. **Settings → Secrets and variables → Actions** 클릭

3. **New repository secret** 클릭

4. **Secret 추가**:
   - **Name**: `FIREBASE_TOKEN`
   - **Value**: 1단계에서 복사한 토큰
   - **Add secret** 클릭

### 3단계: GitHub Actions 워크플로우 확인

`.github/workflows/firebase-deploy.yml` 파일이 이미 생성되어 있습니다.

이 파일은:
- `main` 브랜치에 푸시할 때마다 자동 실행
- Firebase Hosting과 Functions를 자동 배포

### 4단계: 테스트

1. **변경사항 커밋 및 푸시**
   ```bash
   git add .
   git commit -m "Add Firebase deployment workflow"
   git push
   ```

2. **GitHub Actions 확인**
   - GitHub 저장소 → **Actions** 탭
   - "Deploy to Firebase" 워크플로우 실행 확인
   - 성공하면 Firebase에 자동 배포됨

## ✅ 완료!

이제 GitHub에 푸시할 때마다 자동으로 Firebase에 배포됩니다.

## 🔍 배포 확인

배포가 완료되면:
- Firebase Console → Hosting에서 배포 상태 확인
- 사이트 URL: `https://ettglossary.web.app`

## 🐛 문제 해결

### 워크플로우가 실패하는 경우

1. **GitHub Actions 로그 확인**
   - Actions 탭 → 실패한 워크플로우 클릭
   - 에러 메시지 확인

2. **FIREBASE_TOKEN 확인**
   - Settings → Secrets에서 토큰이 올바르게 설정되었는지 확인
   - 토큰이 만료되었으면 다시 생성

3. **Functions 의존성 확인**
   - `functions/package.json`이 올바른지 확인
   - `functions/node_modules/`는 `.gitignore`에 포함되어 있어야 함

## 📝 참고사항

- **자동 배포**: `main` 브랜치에 푸시할 때마다 자동 배포
- **수동 배포**: GitHub Actions → "Deploy to Firebase" → "Run workflow" 클릭
- **토큰 보안**: FIREBASE_TOKEN은 절대 코드에 포함하지 마세요 (GitHub Secrets 사용)

---

이제 GitHub에 푸시하면 자동으로 Firebase에 배포됩니다! 🚀
