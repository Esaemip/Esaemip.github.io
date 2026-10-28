@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\new-post.ps1"
if errorlevel 1 (
  echo.
  echo 글 파일을 만들지 못했습니다.
  pause
)
