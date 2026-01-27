@echo off
chcp 65001 >nul
echo ========================================
echo 서버 재시작
echo ========================================
echo.

echo [1단계] 기존 서버 프로세스 종료 시도...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *server.py*" 2>nul
if errorlevel 1 (
    echo [정보] 실행 중인 서버 프로세스를 찾을 수 없습니다.
) else (
    echo [확인] 기존 서버 프로세스를 종료했습니다.
)
echo.

echo [2단계] 포트 3000 확인...
netstat -an | findstr :3000
if errorlevel 1 (
    echo [확인] 포트 3000이 사용 가능합니다.
) else (
    echo [경고] 포트 3000이 사용 중입니다. 잠시 기다린 후 다시 시도하세요.
    timeout /t 2 /nobreak >nul
)
echo.

echo [3단계] 서버 시작...
echo.
python server.py
if errorlevel 1 (
    echo.
    echo [오류] 서버 실행 중 오류가 발생했습니다.
    pause
)
