# 서버 실행 안내

## Python 서버 실행 방법

### 1. Python 설치 확인
터미널에서 다음 명령어로 Python이 설치되어 있는지 확인하세요:
```bash
python --version
```
또는
```bash
python3 --version
```

### 2. Python이 설치되어 있지 않은 경우
- Windows: https://www.python.org/downloads/ 에서 Python 3.7 이상 다운로드
- 설치 시 "Add Python to PATH" 옵션을 체크하세요

### 3. 서버 실행
터미널에서 프로젝트 폴더로 이동한 후:
```bash
python server.py
```

또는 Windows에서는:
- `start-server.bat` 파일을 더블클릭

### 4. 브라우저에서 접속
서버가 실행되면 다음 주소로 접속:
- http://localhost:3000/discussion.html
- http://localhost:3000/corpus.html
- http://localhost:3000/index.html

### 5. 서버 종료
터미널에서 `Ctrl+C`를 누르세요

---

## Node.js 서버 실행 방법 (대안)

### 1. Node.js 설치
- https://nodejs.org/ 에서 Node.js 설치

### 2. 패키지 설치
```bash
npm install express cors
```

### 3. 서버 실행
```bash
npm start
```

또는
```bash
node server.js
```

---

## 문제 해결

### "연결이 거부되었습니다" 오류
- 서버가 실행 중인지 확인하세요
- 포트 3000이 다른 프로그램에서 사용 중인지 확인하세요

### Python이 인식되지 않는 경우
- Python 설치 후 컴퓨터를 재시작하세요
- PATH 환경 변수에 Python이 추가되었는지 확인하세요
