import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const postsDir = join(root, "posts");
const siteUrl = "https://jahwanlee02.github.io/Esaemip.github.io";

const categories = {
  development: { number: "01", name: "개발" },
  ctf: { number: "02", name: "CTF / Wargame" },
  "bug-bounty": { number: "03", name: "Bug Bounty" },
  writing: { number: "04", name: "블로그 / 기술문서" },
  research: { number: "05", name: "논문 / 컨퍼런스" },
  achievements: { number: "06", name: "공모전 / 자격증" }
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function inlineMarkdown(value) {
  const code = [];
  let text = String(value).replace(/`([^`]+)`/g, (_, contents) => {
    code.push(contents);
    return `@@ESAEMIP_CODE_${code.length - 1}@@`;
  });
  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]+|\.\.?\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  code.forEach((contents, index) => {
    text = text.replace(`@@ESAEMIP_CODE_${index}@@`, `<code>${escapeHtml(contents)}</code>`);
  });
  return text;
}

function parseFrontMatter(source, fileName) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
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

function renderBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) { i += 1; continue; }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      blocks.push(`<pre><code${className}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const callout = line.match(/^> \[!(NOTE|NEXT)\](?:\s+(.+))?$/);
    if (callout) {
      const contents = [];
      const kind = callout[1];
      const title = callout[2] || (kind === "NOTE" ? "메모" : "다음 기록");
      i += 1;
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        contents.push(lines[i].trimStart().replace(/^>\s?/, ""));
        i += 1;
      }
      const className = kind === "NEXT" ? "article-closing" : "article-note";
      const label = kind === "NEXT" ? `<span>${inlineMarkdown(title)}</span>` : `<strong>${inlineMarkdown(title)}</strong>`;
      blocks.push(`<aside class="${className}">${label}<p>${inlineMarkdown(contents.join(" "))}</p></aside>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^-\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(`<h3>${inlineMarkdown(line.slice(4).trim())}</h3>`);
      i += 1;
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || next.startsWith("## ") || next.startsWith("### ") || next.startsWith("```") || next.startsWith("> [!") || /^-\s+/.test(next) || /^\d+\.\s+/.test(next)) break;
      paragraph.push(next);
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

function postHtml(post) {
  const category = categories[post.meta.category];
  const sections = parseSections(post.body, post.fileName);
  const toc = sections.map((section, index) =>
    `        <a href="#${section.id}"><b>${String(index + 1).padStart(2, "0")}</b> ${escapeHtml(section.title)}</a>`
  ).join("\n");
  const body = sections.map((section, index) => `
        <section id="${section.id}">
          <p class="article-number">${String(index + 1).padStart(2, "0")}</p>
          <h2>${escapeHtml(section.title)}</h2>
          ${renderBlocks(section.lines)}
        </section>`).join("");
  const dateText = post.meta.date.replaceAll("-", ". ") + ".";
  const label = post.meta.label || "공부 기록";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(post.meta.description)}">
  <meta name="theme-color" content="#f3f6f2">
  <meta property="og:title" content="${escapeHtml(post.meta.title)}">
  <meta property="og:description" content="${escapeHtml(post.meta.description)}">
  <meta property="og:type" content="article">
  <title>${escapeHtml(post.meta.title)} — Esaemip</title>
  <link rel="icon" href="../assets/fox-mark.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="Esaemip의 기록" href="../feed.xml">
  <link rel="stylesheet" href="../journal.css">
</head>
<body class="post-page">
  <div class="reading-progress" aria-hidden="true"><span id="reading-progress-bar"></span></div>
  <nav class="site-nav post-nav" aria-label="주요 메뉴">
    <a class="brand" href="../index.html"><img src="../assets/fox-mark.svg" alt=""><strong>Esaemip</strong><span>개발·보안 공부 기록</span></a>
    <div class="nav-links"><a href="../index.html#records">기록</a><a href="../about.html">소개</a><a href="https://github.com/JahwanLEE02" target="_blank" rel="noreferrer">GitHub</a></div>
  </nav>
  <main class="post-main">
    <a class="back-link" href="../category.html?category=${post.meta.category}">← ${category.name}</a>
    <article>
      <header class="post-header">
        <p class="post-category">${category.number} · ${category.name}</p>
        <h1>${escapeHtml(post.meta.title)}</h1>
        <p class="post-lead">${escapeHtml(post.meta.description)}</p>
        <div class="post-meta"><time datetime="${post.meta.date}">${dateText}</time><span>${escapeHtml(label)}</span></div>
      </header>
      <nav class="post-toc" aria-label="이 글의 순서">
        <span>이 글에서</span>
${toc}
      </nav>
      <div class="article-body">${body}
      </div>
    </article>
    <div class="post-footer-nav"><a href="../category.html?category=${post.meta.category}">← 기록 목록으로</a><a href="../index.html">처음으로 ↑</a></div>
  </main>
  <footer class="site-footer">
    <a class="footer-brand" href="../index.html"><img src="../assets/fox-mark.svg" alt=""><span>Esaemip</span></a>
    <nav aria-label="하단 메뉴"><a href="../index.html#records">기록</a><a href="../about.html">소개</a><a href="../feed.xml">RSS</a><a href="https://github.com/JahwanLEE02" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    <p>© 2026 Esaemip.</p>
  </footer>
  <script src="../site.js"></script>
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

await mkdir(contentDir, { recursive: true });
await mkdir(postsDir, { recursive: true });
const files = (await readdir(contentDir)).filter((file) => extname(file).toLowerCase() === ".md").sort();
const parsed = [];

for (const fileName of files) {
  const source = await readFile(join(contentDir, fileName), "utf8");
  const post = { ...parseFrontMatter(source, fileName), fileName };
  parsed.push(post);
  await writeFile(join(postsDir, `${post.meta.slug}.html`), postHtml(post), "utf8");
}

const posts = parsed.map(({ meta }) => ({
  title: meta.title,
  description: meta.description,
  date: meta.date,
  category: meta.category,
  url: `posts/${meta.slug}.html`
})).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko"));

await writeFile(join(root, "posts-data.js"), `window.ESAEMIP_POSTS = ${JSON.stringify(posts, null, 2)};\n`, "utf8");
await writeFile(join(root, "feed.xml"), feedXml(posts), "utf8");
console.log(`완료: ${posts.length}개의 글을 게시 목록과 RSS에 반영했습니다.`);
