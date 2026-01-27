# Firebase Console에서 배포하기 (CLI 없이)

Firebase CLI 없이 Firebase Console을 통해 배포하는 방법입니다.

## 방법 1: Firebase Console에서 직접 배포

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: `ettglossary`

### 2단계: Hosting 설정
1. 왼쪽 메뉴에서 **"Hosting"** 클릭
2. **"시작하기"** 클릭 (처음인 경우)
3. **"다음"** 클릭

### 3단계: 파일 업로드
Firebase Console에서는 직접 파일 업로드가 제한적이므로, 다음 방법 중 하나를 사용:

#### 옵션 A: GitHub 연동 (권장)
1. Firebase Console → Hosting
2. **"GitHub에 연결"** 클릭
3. GitHub 저장소 연결
4. 자동 배포 설정

#### 옵션 B: Firebase CLI 사용 (필수)
Firebase Hosting은 CLI를 통해서만 배포할 수 있습니다.

## 방법 2: Firebase CLI 설치 및 배포

### Windows에서 설치

1. **Node.js 설치**
   - [Node.js 다운로드](https://nodejs.org/) (LTS 버전)
   - 설치 후 터미널 재시작

2. **Firebase CLI 설치**
   ```bash
   npm install -g firebase-tools
   ```

3. **Firebase 로그인**
   ```bash
   firebase login
   ```
   - 브라우저가 열리면 Google 계정으로 로그인

4. **프로젝트 확인**
   ```bash
   firebase projects:list
   ```
   - `ettglossary` 프로젝트가 보여야 합니다

5. **Functions 의존성 설치**
   ```bash
   cd functions
   npm install
   cd ..
   ```

6. **배포**
   ```bash
   firebase deploy
   ```

## 방법 3: GitHub Actions를 통한 자동 배포

`.github/workflows/firebase-deploy.yml` 파일을 생성하여 GitHub에 푸시할 때마다 자동 배포할 수 있습니다.

## 중요 사항

⚠️ **Firebase Hosting은 CLI를 통해서만 배포할 수 있습니다.**

Firebase Console에서 직접 파일을 업로드하는 기능은 제공되지 않습니다. 다음 중 하나를 선택해야 합니다:

1. ✅ Firebase CLI 설치 및 사용 (가장 일반적)
2. ✅ GitHub 연동 후 자동 배포
3. ✅ GitHub Actions를 통한 CI/CD

## 현재 프로젝트 상태

- ✅ `firebase.json` - 설정 완료
- ✅ `.firebaserc` - 프로젝트 ID 설정 완료 (`ettglossary`)
- ✅ `functions/index.js` - Functions 코드 준비 완료
- ⚠️ Firebase CLI 설치 필요
- ⚠️ Functions 의존성 설치 필요 (`cd functions && npm install`)

## 다음 단계

1. Node.js 설치
2. Firebase CLI 설치
3. 배포 실행

---

**참고**: Firebase SDK 초기화 코드(`firebase-config.js`)는 클라이언트 사이드에서 Firebase 서비스를 사용할 때 필요합니다. Hosting 배포와는 별개입니다.
