@echo off
chcp 65001 >nul
echo ========================================
echo 서버 실행 상태 확인
echo ========================================
echo.

echo [1단계] Python 설치 확인...
python --version
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo https://www.python.org/downloads/ 에서 Python을 설치해주세요.
    pause
    exit /b 1
)
echo [확인] Python이 설치되어 있습니다.
echo.

echo [2단계] 포트 3000 사용 확인...
netstat -an | findstr :3000
if errorlevel 1 (
    echo [정보] 포트 3000이 사용 중이지 않습니다. 서버가 실행되지 않았습니다.
) else (
    echo [확인] 포트 3000이 사용 중입니다. 서버가 실행 중일 수 있습니다.
)
echo.

echo [3단계] 서버 파일 확인...
if exist server.py (
    echo [확인] server.py 파일이 있습니다.
) else (
    echo [오류] server.py 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo.

echo ========================================
echo 서버를 시작하려면:
echo   1. 서버실행.bat 파일을 더블클릭하거나
echo   2. 이 창에서 다음 명령어를 실행하세요:
echo      python server.py
echo ========================================
echo.
echo 서버가 실행되면 다음 메시지가 표시됩니다:
echo   "서버가 http://localhost:3000에서 실행 중입니다."
echo.
pause
