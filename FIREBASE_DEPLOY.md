# Firebase 배포 가이드

이 가이드에서는 Firebase Hosting과 Functions를 사용하여 프로젝트를 배포하는 방법을 설명합니다.

## 📋 사전 준비

1. **Firebase 계정 생성**
   - [Firebase Console](https://console.firebase.google.com)에서 계정 생성
   - Google 계정으로 로그인

2. **Firebase CLI 설치**
   ```bash
   npm install -g firebase-tools
   ```

3. **Firebase 로그인**
   ```bash
   firebase login
   ```

## 🚀 배포 단계

### 1단계: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `language-resource-hub`)
4. Google Analytics 설정 (선택적)
5. 프로젝트 생성 완료

### 2단계: 프로젝트 ID 확인 및 설정

1. Firebase Console → 프로젝트 설정 → 일반
2. 프로젝트 ID 확인 (예: `your-project-id`)
3. `.firebaserc` 파일 수정:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```
   `your-project-id`를 실제 프로젝트 ID로 변경

### 3단계: Firebase 초기화 (선택적)

프로젝트가 이미 설정되어 있다면 이 단계는 건너뛰어도 됩니다.

```bash
firebase init
```

다음과 같이 선택:
- **Hosting**: Yes
- **Functions**: Yes
- **Public directory**: `.` (현재 디렉토리)
- **Single-page app**: No
- **Functions language**: JavaScript
- **ESLint**: No (또는 Yes)

### 4단계: Functions 의존성 설치

```bash
cd functions
npm install
cd ..
```

### 5단계: 배포

#### 전체 배포 (Hosting + Functions)
```bash
firebase deploy
```

#### Hosting만 배포
```bash
firebase deploy --only hosting
```

#### Functions만 배포
```bash
firebase deploy --only functions
```

### 6단계: 배포 확인

1. Firebase Console → Hosting에서 배포된 사이트 URL 확인
   - 예: `https://your-project-id.web.app`
   - 또는: `https://your-project-id.firebaseapp.com`

2. Functions 확인
   - Firebase Console → Functions에서 `claude` 함수 확인

## ⚙️ 설정 파일 설명

### `firebase.json`
- **hosting**: 정적 파일 호스팅 설정
- **functions**: Cloud Functions 설정
- **rewrites**: `/api/claude` → Functions로 리다이렉트

### `.firebaserc`
- Firebase 프로젝트 ID 설정

### `functions/index.js`
- Claude API 프록시 함수
- CORS 처리 포함

## 🔧 문제 해결

### Functions 배포 실패

1. **의존성 확인**
   ```bash
   cd functions
   npm install
   ```

2. **Node.js 버전 확인**
   - Firebase Functions는 Node.js 18을 사용합니다
   - `functions/package.json`의 `engines.node` 확인

3. **에러 로그 확인**
   ```bash
   firebase functions:log
   ```

### CORS 오류

- Functions 코드에 CORS 헤더가 포함되어 있습니다
- `firebase.json`의 headers 설정 확인

### API 호출 실패

1. **Functions 로그 확인**
   - Firebase Console → Functions → `claude` → Logs

2. **네트워크 확인**
   - 브라우저 개발자 도구 → Network 탭
   - `/api/claude` 요청 상태 확인

## 📊 Firebase vs Netlify

| 기능 | Firebase | Netlify |
|------|----------|---------|
| Hosting | ✅ | ✅ |
| Functions | ✅ (Cloud Functions) | ✅ (Netlify Functions) |
| 무료 플랜 | ✅ (Spark) | ✅ (Starter) |
| Functions 호출 제한 | 월 125,000회 | 월 125,000회 |
| 커스텀 도메인 | ✅ | ✅ |

## 🔄 Netlify에서 Firebase로 마이그레이션

1. **Functions 코드 변환**
   - Netlify Functions → Firebase Functions
   - 이미 `functions/index.js`에 변환된 코드 포함

2. **설정 파일 변경**
   - `netlify.toml` → `firebase.json`
   - `.firebaserc` 추가

3. **배포**
   - Firebase에 배포
   - Netlify는 유지하거나 제거 가능

## 📝 추가 리소스

- [Firebase 문서](https://firebase.google.com/docs)
- [Firebase Hosting 가이드](https://firebase.google.com/docs/hosting)
- [Cloud Functions 가이드](https://firebase.google.com/docs/functions)

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Firebase 계정 생성 및 로그인
- [ ] Firebase 프로젝트 생성
- [ ] `.firebaserc`에 프로젝트 ID 설정
- [ ] `functions/package.json` 의존성 설치
- [ ] `firebase.json` 설정 확인
- [ ] 배포 테스트

---

배포가 완료되면 Firebase에서 제공하는 URL로 사이트에 접속할 수 있고, AI 기능도 정상적으로 작동합니다!
