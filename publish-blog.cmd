@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\publish-blog.ps1"
if errorlevel 1 (
  echo.
  echo 게시 중 오류가 발생했습니다.
  pause
)
