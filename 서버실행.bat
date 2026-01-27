@echo off
chcp 65001 >nul
echo ========================================
echo 서버를 시작합니다...
echo ========================================
echo.
python --version
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo https://www.python.org/downloads/ 에서 Python을 설치해주세요.
    echo.
    pause
    exit /b 1
)
echo.
echo [정보] Python 서버를 시작합니다...
echo [정보] 브라우저에서 http://localhost:3000/discussion.html 로 https://ja.dict.naver.com/#/main접속하세요.
echo [정보] 서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo.
python server.py
if errorlevel 1 (
    echo.
    echo [오류] 서버 실행 중 오류가 발생했습니다.
    pause
)
