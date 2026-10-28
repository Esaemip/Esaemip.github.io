@echo off
chcp 65001 >nul
cd /d "%~dp0"
node "%~dp0tools\build-blog.mjs"
if errorlevel 1 (
  echo.
  echo 글을 반영하지 못했습니다. 위 오류를 확인해 주세요.
  pause
  exit /b 1
)
echo.
echo 이제 index.html을 열어 확인하면 됩니다.
pause
