$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$contentDirectory = Join-Path $projectRoot "content"

$categories = @(
  [PSCustomObject]@{ Key = "development"; Name = "개발"; Sections = @("무엇을 만들었나", "어디서 막혔나", "어떻게 해결했나", "다음에 기억할 것") },
  [PSCustomObject]@{ Key = "ctf"; Name = "CTF / Wargame"; Sections = @("문제와 환경", "처음 시도한 방법", "막힌 지점", "풀이 과정", "배운 점") },
  [PSCustomObject]@{ Key = "bug-bounty"; Name = "Bug Bounty"; Sections = @("확인한 범위", "재현 조건", "원인", "대응 방법") },
  [PSCustomObject]@{ Key = "writing"; Name = "블로그 / 기술문서"; Sections = @("시작한 이유", "진행한 순서", "막힌 부분", "정리") },
  [PSCustomObject]@{ Key = "research"; Name = "논문 / 컨퍼런스"; Sections = @("다룬 문제", "핵심 내용", "이해한 것", "남은 질문") },
  [PSCustomObject]@{ Key = "achievements"; Name = "공모전 / 자격증"; Sections = @("목표", "준비 과정", "결과", "다음에 바꿀 것") }
)

Write-Host ""
Write-Host "새 기록 만들기" -ForegroundColor Cyan
Write-Host "────────────────────────"
for ($index = 0; $index -lt $categories.Count; $index++) {
  Write-Host ("{0}. {1}" -f ($index + 1), $categories[$index].Name)
}

do {
  $choice = Read-Host "카테고리 번호"
  $number = 0
  $valid = [int]::TryParse($choice, [ref]$number) -and $number -ge 1 -and $number -le $categories.Count
  if (-not $valid) { Write-Host "1부터 6 사이의 숫자를 입력해 주세요." -ForegroundColor Yellow }
} until ($valid)

$category = $categories[$number - 1]
do { $title = (Read-Host "글 제목").Trim() } until ($title)
$description = (Read-Host "한 줄 설명").Trim()
if (-not $description) { $description = "$title에 관해 공부한 내용을 정리했습니다." }

$today = Get-Date -Format "yyyy-MM-dd"
$dateInput = (Read-Host "작성일 [$today]").Trim()
$date = if ($dateInput) { $dateInput } else { $today }
if ($date -notmatch '^\d{4}-\d{2}-\d{2}$') {
  throw "작성일은 2026-10-28처럼 YYYY-MM-DD 형식으로 입력해 주세요."
}

$defaultSlug = "post-" + $date.Replace("-", "") + "-" + (Get-Date -Format "HHmm")
$slugInput = (Read-Host "파일 이름(영문 소문자) [$defaultSlug]").Trim().ToLower()
$slug = if ($slugInput) { $slugInput } else { $defaultSlug }
$slug = $slug -replace '[^a-z0-9-]', '-'
$slug = $slug.Trim('-')
if (-not $slug) { $slug = $defaultSlug }

New-Item -ItemType Directory -Path $contentDirectory -Force | Out-Null
$postPath = Join-Path $contentDirectory "$slug.md"
if (Test-Path -LiteralPath $postPath) { throw "이미 같은 이름의 글이 있습니다: $postPath" }

$sectionText = ($category.Sections | ForEach-Object { "## $_`r`n`r`n여기에 내용을 적어 주세요.`r`n" }) -join "`r`n"
$markdown = @"
---
title: $title
slug: $slug
category: $($category.Key)
date: $date
description: $description
label: 공부 기록
---

$sectionText
"@

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($postPath, $markdown, $utf8WithoutBom)

Write-Host ""
Write-Host "글 파일을 만들었습니다." -ForegroundColor Green
Write-Host $postPath
Write-Host "내용을 작성한 뒤 build-blog.cmd를 실행하면 블로그에 반영됩니다."

if ($env:ESAEMIP_NO_OPEN -ne "1") {
  $code = Get-Command "code.cmd" -ErrorAction SilentlyContinue
  if (-not $code) { $code = Get-Command "code" -ErrorAction SilentlyContinue }
  if ($code) {
    Start-Process -FilePath $code.Source -ArgumentList @("`"$postPath`"")
  } else {
    Start-Process -FilePath "notepad.exe" -ArgumentList @("`"$postPath`"")
  }
}
