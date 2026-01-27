# Firebase 배포 간단 가이드

## 🚀 방법 1: Firebase CLI로 직접 배포 (권장)

### 1단계: Firebase CLI 설치 및 로그인

```bash
# Firebase CLI 설치 (한 번만)
npm install -g firebase-tools

# Firebase 로그인
firebase login
```
- 브라우저가 열리면 Google 계정으로 로그인

### 2단계: Functions 의존성 설치

```bash
cd functions
npm install
cd ..
```

### 3단계: 배포 실행

```bash
# 전체 배포 (Hosting + Functions)
firebase deploy

# 또는 개별 배포
firebase deploy --only hosting    # 정적 파일만
firebase deploy --only functions  # Functions만
```

### 4단계: 배포 확인

배포가 완료되면:
- **사이트 URL**: `https://ettglossary.web.app`
- **또는**: `https://ettglossary.firebaseapp.com`

---

## 🔄 방법 2: GitHub Actions 자동 배포

이미 설정되어 있습니다! GitHub에 푸시하면 자동 배포됩니다.

### 설정 완료 확인

1. **GitHub Secrets에 FIREBASE_TOKEN 추가**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - `FIREBASE_TOKEN`이 있는지 확인
   - 없으면 `firebase login:ci`로 토큰 생성 후 추가

2. **코드 푸시**
   ```bash
   git add .
   git commit -m "Update"
   git push
   ```

3. **배포 확인**
   - GitHub → Actions 탭에서 배포 상태 확인

---

## ✅ 현재 설정 상태

- ✅ 프로젝트 ID: `ettglossary`
- ✅ Firebase 설정 파일: `firebase.json` ✓
- ✅ Functions 설정: `functions/index.js` ✓
- ✅ GitHub Actions: `.github/workflows/firebase-deploy.yml` ✓

---

## 🐛 문제 해결

### "firebase: command not found"
```bash
npm install -g firebase-tools
```

### "npm: command not found"
- [Node.js 설치](https://nodejs.org/) 필요

### Functions 배포 실패
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 배포된 사이트가 작동하지 않음
1. Firebase Console → Hosting에서 배포 상태 확인
2. Functions → `claude` 함수가 배포되었는지 확인
3. 브라우저 콘솔에서 에러 확인

---

## 📝 빠른 참조

```bash
# 전체 배포
firebase deploy

# Hosting만
firebase deploy --only hosting

# Functions만
firebase deploy --only functions

# 배포 취소 (마지막 배포)
firebase hosting:rollback

# Functions 로그 확인
firebase functions:log
```

---

**배포 후 사이트**: https://ettglossary.web.app
