# Netlify 배포 가이드

## 🚀 배포 방법

### 방법 1: Netlify CLI로 배포 (권장)

1. **Netlify 로그인**
   ```bash
   netlify login
   ```
   - 브라우저가 열리면 Netlify 계정으로 로그인

2. **기존 사이트에 연결 (이미 배포된 경우)**
   ```bash
   netlify link
   ```
   - 사이트 선택: `monumental-kringle-4c13b3` (또는 해당 사이트)

3. **배포**
   ```bash
   netlify deploy --prod
   ```

### 방법 2: GitHub 연동으로 자동 배포

1. **Netlify 대시보드 접속**
   - [Netlify Dashboard](https://app.netlify.com)에 로그인

2. **새 사이트 추가 (또는 기존 사이트 설정)**
   - "Add new site" → "Import an existing project" 클릭
   - GitHub 선택 및 저장소 연결
   - 저장소: `cje-39/glossary-project` 선택

3. **빌드 설정**
   - **Build command**: 비워두기 (정적 사이트이므로)
   - **Publish directory**: `.` (현재 디렉토리)
   - **Functions directory**: `netlify/functions` (자동 감지됨)

4. **배포**
   - "Deploy site" 클릭
   - 배포 완료까지 대기 (약 1-2분)

## ✅ 배포 후 확인

1. **사이트 URL 확인**
   - Netlify 대시보드에서 배포된 사이트 URL 확인
   - 현재 설정된 URL: `https://monumental-kringle-4c13b3.netlify.app`

2. **Functions 테스트**
   - Netlify 대시보드 → Functions 탭
   - `claude`, `confluence`, `teamup` 함수가 있는지 확인

3. **TeamUP API 테스트**
   - Firebase Hosting 사이트에서 "일정 불러오기" 버튼 클릭
   - 브라우저 개발자 도구(F12) → Network 탭에서 요청 확인
   - Netlify Functions를 통해 호출되는지 확인

## 🔧 설정 파일

- `netlify.toml`: Netlify 설정 (Functions 디렉토리, 리다이렉트 규칙)
- `netlify/functions/teamup.js`: TeamUP API 프록시 함수
- `netlify-config.js`: Netlify Functions URL 설정

## 📝 참고

- GitHub에 푸시하면 자동으로 재배포됩니다 (자동 배포 활성화 시)
- Functions는 `netlify/functions` 디렉토리에 있어야 합니다
- `netlify.toml`에 리다이렉트 규칙이 설정되어 있습니다
