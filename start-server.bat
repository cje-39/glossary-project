@echo off
echo ========================================
echo 서버를 시작합니다...
echo ========================================
echo.
python --version
if errorlevel 1 (
    echo Python이 설치되어 있지 않습니다.
    echo https://www.python.org/downloads/ 에서 Python을 설치해주세요.
    pause
    exit /b 1
)
echo.
echo Python 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000/discussion.html 로 접속하세요.
echo 서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo.
python server.py
pause
