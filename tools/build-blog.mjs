import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const postsDir = join(root, "posts");
const siteUrl = "https://esaemip.github.io";
const defaultCover = `${siteUrl}/assets/white-fox-hero-v6-web.jpg`;
const highlightJs = {
  src: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js",
  integrity: "sha384-F/bZzf7p3Joyp5psL90p/p89AZJsndkSoGwRpXcZhleCWhd8SnRuoYo4d0yirjJp"
};

const categories = {
  development: { number: "01", name: "개발" },
  ctf: { number: "02", name: "CTF / Wargame" },
  "bug-bounty": { number: "03", name: "Bug Bounty" },
  writing: { number: "04", name: "블로그 / 기술문서" },
  research: { number: "05", name: "논문 / 컨퍼런스" },
  achievements: { number: "06", name: "공모전 / 자격증" }
};

const calloutKinds = {
  NOTE: { className: "article-note", title: "메모" },
  TIP: { className: "article-note is-tip", title: "팁" },
  WARNING: { className: "article-note is-warning", title: "주의" },
  NEXT: { className: "article-closing", title: "다음 기록" }
};

// The theme is decided before the first paint so a dark-mode reader never sees a white flash.
const themeBootScript = `<script>(function(){var t;try{t=localStorage.getItem("esaemip-theme")}catch(e){}document.documentElement.dataset.theme=t==="dark"?"dark":"light"})()</script>`;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

// Links and images may point to the web, to an in-page anchor, or to a file of this site.
// Anything that looks like a script URL is refused.
function safeUrl(url) {
  const value = String(url).trim();
  if (/^(javascript|data|vbscript):/i.test(value)) return "#";
  return value;
}

function inlineMarkdown(value) {
  const code = [];
  let text = String(value).replace(/`([^`]+)`/g, (_, contents) => {
    code.push(contents);
    return `@@ESAEMIP_CODE_${code.length - 1}@@`;
  });
  text = escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" decoding="async">`)
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
      const url = safeUrl(href);
      const external = /^https?:\/\//.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  code.forEach((contents, index) => {
    text = text.replace(`@@ESAEMIP_CODE_${index}@@`, `<code>${escapeHtml(contents)}</code>`);
  });
  return text;
}

function parseFrontMatter(source, fileName) {
  const lines = source.replace(/^﻿/, "").replaceAll("\r\n", "\n").split("\n");
  if (lines[0].trim() !== "---") throw new Error(`${fileName}: 맨 위에 --- 설정 영역이 필요합니다.`);
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error(`${fileName}: 설정 영역을 닫는 ---가 없습니다.`);

  const meta = {};
  for (const line of lines.slice(1, end)) {
    const divider = line.indexOf(":");
    if (divider === -1) continue;
    const key = line.slice(0, divider).trim();
    const value = line.slice(divider + 1).trim().replace(/^['"]|['"]$/g, "");
    meta[key] = value;
  }

  for (const key of ["title", "slug", "category", "date", "description"]) {
    if (!meta[key]) throw new Error(`${fileName}: ${key} 값이 비어 있습니다.`);
  }
  if (!categories[meta.category]) throw new Error(`${fileName}: category가 올바르지 않습니다.`);
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`${fileName}: slug는 영문 소문자, 숫자, -만 사용할 수 있습니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${fileName}: date는 YYYY-MM-DD 형식이어야 합니다.`);

  return { meta, body: lines.slice(end + 1) };
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
const splitRow = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

function renderTable(rows) {
  const head = splitRow(rows[0]);
  const align = splitRow(rows[1]).map((cell) => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : ""));
  const style = (index) => (align[index] ? ` style="text-align:${align[index]}"` : "");
  const thead = head.map((cell, index) => `<th${style(index)}>${inlineMarkdown(cell)}</th>`).join("");
  const tbody = rows.slice(2).map((row) => `<tr>${splitRow(row).map((cell, index) => `<td${style(index)}>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}

function startsBlock(line) {
  return !line
    || line.startsWith("## ")
    || line.startsWith("### ")
    || line.startsWith("#### ")
    || line.startsWith("```")
    || line.startsWith(">")
    || line.startsWith("![")
    || /^-{3,}$/.test(line)
    || /^-\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || isTableRow(line);
}

function renderBlocks(lines, sectionId) {
  const blocks = [];
  let subheading = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (!trimmed) { i += 1; continue; }

    if (trimmed.startsWith("```")) {
      // ```python exp.py → language "python", label "exp.py"
      const [language = "", ...labelParts] = trimmed.slice(3).trim().split(/\s+/);
      const label = labelParts.join(" ");
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      const dataLang = language ? ` data-lang="${escapeHtml(language)}"` : "";
      const dataLabel = label ? ` data-label="${escapeHtml(label)}"` : "";
      blocks.push(`<pre${dataLang}${dataLabel}><code${className}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const callout = trimmed.match(/^> \[!(NOTE|TIP|WARNING|NEXT)\](?:\s+(.+))?$/);
    if (callout) {
      const kind = calloutKinds[callout[1]];
      const title = callout[2] || kind.title;
      const contents = [];
      i += 1;
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        contents.push(lines[i].trimStart().replace(/^>\s?/, ""));
        i += 1;
      }
      const label = callout[1] === "NEXT" ? `<span>${inlineMarkdown(title)}</span>` : `<strong>${inlineMarkdown(title)}</strong>`;
      const paragraphs = contents.join("\n").split(/\n\s*\n/).map((part) => `<p>${inlineMarkdown(part.replace(/\n/g, " "))}</p>`).join("");
      blocks.push(`<aside class="${kind.className}">${label}${paragraphs}</aside>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      const contents = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        contents.push(lines[i].trimStart().replace(/^>\s?/, ""));
        i += 1;
      }
      const paragraphs = contents.join("\n").split(/\n\s*\n/).map((part) => `<p>${inlineMarkdown(part.replace(/\n/g, " "))}</p>`).join("");
      blocks.push(`<blockquote>${paragraphs}</blockquote>`);
      continue;
    }

    // An image on its own line becomes a figure. ![설명](경로 "캡션") — the caption is optional.
    const figure = trimmed.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/);
    if (figure) {
      const [, alt, src, caption] = figure;
      const text = caption || alt;
      blocks.push(`<figure class="article-figure"><img src="${escapeHtml(safeUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">${text ? `<figcaption>${inlineMarkdown(text)}</figcaption>` : ""}</figure>`);
      i += 1;
      continue;
    }

    if (isTableRow(trimmed) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }
      blocks.push(renderTable(rows));
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push("<hr>");
      i += 1;
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^-\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      subheading += 1;
      blocks.push(`<h3 id="${sectionId}-${subheading}">${inlineMarkdown(trimmed.slice(4).trim())}</h3>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      blocks.push(`<h4>${inlineMarkdown(trimmed.slice(5).trim())}</h4>`);
      i += 1;
      continue;
    }

    const paragraph = [trimmed];
    i += 1;
    while (i < lines.length && !startsBlock(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n          ");
}

function parseSections(lines, fileName) {
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)(?:\s+\{#([a-z0-9-]+)\})?\s*$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), id: heading[2] || `part-${sections.length + 1}`, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  if (!sections.length) throw new Error(`${fileName}: ## 소제목을 하나 이상 작성해 주세요.`);
  return sections;
}

// Korean prose reads at roughly 500 characters a minute; code is skimmed, so it counts for less.
function readingMinutes(bodyLines) {
  let prose = 0;
  let code = 0;
  let inCode = false;
  for (const line of bodyLines) {
    if (line.trim().startsWith("```")) { inCode = !inCode; continue; }
    const length = line.replace(/\s+/g, "").length;
    if (inCode) code += length; else prose += length;
  }
  return Math.max(1, Math.round(prose / 500 + code / 1500));
}

const formatDate = (date) => date.replaceAll("-", ". ") + ".";

function neighbourLink(post, direction) {
  if (!post) return "";
  return `<a class="post-pager-${direction}" href="${post.meta.slug}.html" rel="${direction}"><small>${direction === "prev" ? "← 이전 글" : "다음 글 →"}</small><strong>${escapeHtml(post.meta.title)}</strong><time datetime="${post.meta.date}">${formatDate(post.meta.date)}</time></a>`;
}

function postHtml(post, { previous, next, related }) {
  const { meta } = post;
  const category = categories[meta.category];
  const sections = parseSections(post.body, post.fileName);
  const toc = sections.map((section, index) =>
    `        <a href="#${section.id}"><b>${String(index + 1).padStart(2, "0")}</b> ${escapeHtml(section.title)}</a>`
  ).join("\n");
  // "toc: false" in the front matter hides both the table of contents box and the side rail.
  const tocHtml = meta.toc === "false" ? "" : `      <nav class="post-toc" aria-label="이 글의 순서">
        <span>이 글에서</span>
${toc}
      </nav>
`;
  const body = sections.map((section, index) => `
        <section id="${section.id}">
          <p class="article-number">${String(index + 1).padStart(2, "0")}</p>
          <h2>${escapeHtml(section.title)}</h2>
          ${renderBlocks(section.lines, section.id)}
        </section>`).join("");
  const label = meta.label || "공부 기록";
  const url = `${siteUrl}/posts/${meta.slug}.html`;
  const cover = meta.cover ? new URL(meta.cover, url).href : defaultCover;
  const relatedHtml = related.length
    ? `
    <section class="related-posts" aria-labelledby="related-title">
      <h2 id="related-title">${escapeHtml(category.name)}의 다른 기록</h2>
      <ul>${related.map((item) => `<li><a href="${item.meta.slug}.html"><strong>${escapeHtml(item.meta.title)}</strong><span>${escapeHtml(item.meta.description)}</span><time datetime="${item.meta.date}">${formatDate(item.meta.date)}</time></a></li>`).join("")}</ul>
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="theme-color" content="#f3f6f2">
  <link rel="canonical" href="${url}">
  <meta property="og:site_name" content="Esaemip">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${escapeHtml(cover)}">
  <meta property="og:locale" content="ko_KR">
  <meta property="article:published_time" content="${meta.date}T00:00:00+09:00">
  <meta name="twitter:card" content="summary_large_image">
  <title>${escapeHtml(meta.title)} — Esaemip</title>
  ${themeBootScript}
  <link rel="icon" href="../assets/fox-mark.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="Esaemip의 기록" href="../feed.xml">
  <link rel="stylesheet" href="../journal.css">
</head>
<body class="post-page" id="top">
  <a class="skip-link" href="#article">본문으로 건너뛰기</a>
  <div class="reading-progress" aria-hidden="true"><span id="reading-progress-bar"></span></div>
  <nav class="site-nav post-nav" aria-label="주요 메뉴">
    <a class="brand" href="../index.html"><img src="../assets/fox-mark.svg" alt=""><strong>Esaemip</strong><span>개발·보안 공부 기록</span></a>
    <div class="nav-links"><a href="../index.html#records">기록</a><a href="../about.html">소개</a><a href="https://github.com/Esaemip" target="_blank" rel="noreferrer">GitHub</a></div>
  </nav>
  <main class="post-main" id="article">
    <a class="back-link" href="../category.html?category=${meta.category}">← ${category.name}</a>
    <article>
      <header class="post-header">
        <p class="post-category">${category.number} · ${category.name}</p>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="post-lead">${escapeHtml(meta.description)}</p>
        <div class="post-meta"><time datetime="${meta.date}">${formatDate(meta.date)}</time><span>약 ${post.minutes}분</span><span>${escapeHtml(label)}</span></div>
      </header>
${tocHtml}      <div class="article-body">${body}
      </div>
    </article>
${previous || next ? `
    <nav class="post-pager" aria-label="이전 글과 다음 글">
      ${neighbourLink(previous, "prev")}
      ${neighbourLink(next, "next")}
    </nav>` : ""}${relatedHtml}
    <div class="post-footer-nav"><a href="../category.html?category=${meta.category}">← 기록 목록으로</a><a href="#top" data-scroll-top>처음으로 ↑</a></div>
  </main>
  <footer class="site-footer">
    <a class="footer-brand" href="../index.html"><img src="../assets/fox-mark.svg" alt=""><span>Esaemip</span></a>
    <nav aria-label="하단 메뉴"><a href="../index.html#records">기록</a><a href="../about.html">소개</a><a href="../feed.xml">RSS</a><a href="https://github.com/Esaemip" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    <p>© 2026 Esaemip.</p>
  </footer>
  <script src="${highlightJs.src}" integrity="${highlightJs.integrity}" crossorigin="anonymous" defer></script>
  <script src="../site.js" defer></script>
</body>
</html>
`;
}

function feedXml(posts) {
  const items = posts.map((post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${siteUrl}/${post.url}</link>
      <guid>${siteUrl}/${post.url}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00+09:00`).toUTCString()}</pubDate>
      <description>${escapeHtml(post.description)}</description>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Esaemip의 개발·보안 기록</title>
    <link>${siteUrl}/</link>
    <description>개발과 정보보안을 공부하며 막힌 과정까지 남기는 기록장입니다.</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;
}

function sitemapXml(posts) {
  const pages = ["", "about.html", ...Object.keys(categories).map((key) => `category.html?category=${key}`)];
  const urls = [
    ...pages.map((page) => `  <url><loc>${escapeHtml(`${siteUrl}/${page}`)}</loc></url>`),
    ...posts.map((post) => `  <url><loc>${siteUrl}/${post.url}</loc><lastmod>${post.date}</lastmod></url>`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

await mkdir(contentDir, { recursive: true });
await mkdir(postsDir, { recursive: true });
const files = (await readdir(contentDir)).filter((file) => extname(file).toLowerCase() === ".md").sort();
const parsed = [];

for (const fileName of files) {
  const source = await readFile(join(contentDir, fileName), "utf8");
  const post = { ...parseFrontMatter(source, fileName), fileName };
  post.minutes = readingMinutes(post.body);
  parsed.push(post);
}

// Oldest first, so "previous" means the one written before and "next" the one written after.
const chronological = [...parsed].sort((a, b) => a.meta.date.localeCompare(b.meta.date) || a.meta.title.localeCompare(b.meta.title, "ko"));
for (const [index, post] of chronological.entries()) {
  const related = chronological
    .filter((other) => other !== post && other.meta.category === post.meta.category)
    .filter((other) => other !== chronological[index - 1] && other !== chronological[index + 1])
    .reverse()
    .slice(0, 3);
  const html = postHtml(post, { previous: chronological[index - 1], next: chronological[index + 1], related });
  await writeFile(join(postsDir, `${post.meta.slug}.html`), html, "utf8");
}

const posts = [...chronological].reverse().map(({ meta, minutes }) => ({
  title: meta.title,
  description: meta.description,
  date: meta.date,
  category: meta.category,
  minutes,
  url: `posts/${meta.slug}.html`
}));

await writeFile(join(root, "posts-data.js"), `window.ESAEMIP_POSTS = ${JSON.stringify(posts, null, 2)};\n`, "utf8");
await writeFile(join(root, "feed.xml"), feedXml(posts), "utf8");
await writeFile(join(root, "sitemap.xml"), sitemapXml(posts), "utf8");
console.log(`완료: ${posts.length}개의 글을 게시 목록, RSS, sitemap에 반영했습니다.`);
