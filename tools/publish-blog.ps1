$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

Write-Host "글을 블로그에 반영합니다." -ForegroundColor Cyan
& node (Join-Path $PSScriptRoot "build-blog.mjs")
if ($LASTEXITCODE -ne 0) { throw "글 변환 중 오류가 발생했습니다." }

& git add -- content posts posts-data.js feed.xml
if ($LASTEXITCODE -ne 0) { throw "변경 파일을 Git에 추가하지 못했습니다." }

$changed = @(& git diff --cached --name-only -- content posts posts-data.js feed.xml)
if (-not $changed) {
  Write-Host "새로 올릴 변경 내용이 없습니다." -ForegroundColor Yellow
  Read-Host "Enter를 누르면 닫힙니다"
  exit 0
}

Write-Host ""
Write-Host "올라갈 파일" -ForegroundColor Green
$changed | ForEach-Object { Write-Host "- $_" }

$defaultMessage = "새 기록 작성"
$messageInput = (Read-Host "커밋 메시지 [$defaultMessage]").Trim()
$message = if ($messageInput) { $messageInput } else { $defaultMessage }

& git commit -m $message -- content posts posts-data.js feed.xml
if ($LASTEXITCODE -ne 0) { throw "커밋하지 못했습니다." }

$answer = (Read-Host "지금 GitHub에 올릴까요? (y/N)").Trim().ToLower()
if ($answer -eq "y" -or $answer -eq "yes") {
  & git push origin main
  if ($LASTEXITCODE -ne 0) { throw "GitHub에 올리지 못했습니다." }
  Write-Host "GitHub에 올렸습니다." -ForegroundColor Green
} else {
  Write-Host "로컬 커밋까지만 완료했습니다. 나중에 git push origin main을 실행하면 됩니다."
}

Read-Host "Enter를 누르면 닫힙니다"
