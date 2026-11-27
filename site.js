// Progressive enhancement only. Without JavaScript every page still reads and links correctly.
// Wrapped in a block so these names never collide with globals of page scripts such as category.js.
{
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const categoryNames = {
  development: "개발",
  ctf: "CTF / Wargame",
  "bug-bounty": "Bug Bounty",
  writing: "블로그 / 기술문서",
  research: "논문 / 컨퍼런스",
  achievements: "공모전 / 자격증"
};
const allPosts = Array.isArray(window.ESAEMIP_POSTS) ? window.ESAEMIP_POSTS : [];
const formatDate = (date) => date.replaceAll("-", ". ") + ".";
const headingText = (heading) => [...heading.childNodes]
  .filter((node) => !(node.classList && node.classList.contains("heading-anchor")))
  .map((node) => node.textContent).join("").trim();

/* ---------- theme: light / dark (night snow) ---------- */
(function initTheme() {
  const nav = document.querySelector(".site-nav .nav-links");
  if (!nav) return;
  // Light is the default; the dark night-snow theme appears only when the reader picks it.
  const current = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";
  button.innerHTML = `
    <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
    <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>`;
  const sync = () => {
    const dark = current() === "dark";
    button.setAttribute("aria-label", dark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기");
    button.title = dark ? "낮 눈밭으로" : "밤 눈밭으로";
    button.setAttribute("aria-pressed", String(dark));
  };
  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("esaemip-theme", next); } catch { /* private mode: keep it for this page only */ }
    sync();
  });
  nav.append(button);
  sync();
})();

/* ---------- reading progress ---------- */
const progressBar = document.getElementById("reading-progress-bar");
if (progressBar) {
  let ticking = false;
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, progress)) + "%";
    ticking = false;
  };
  updateProgress();
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener("resize", updateProgress);
}

/* ---------- code blocks: language label, highlighting, copy ---------- */
const languageNames = {
  bash: "Bash", sh: "Shell", shell: "Shell", zsh: "Shell", powershell: "PowerShell", ps1: "PowerShell",
  python: "Python", py: "Python", c: "C", cpp: "C++", js: "JavaScript", javascript: "JavaScript",
  ts: "TypeScript", typescript: "TypeScript", html: "HTML", css: "CSS", json: "JSON", yaml: "YAML",
  yml: "YAML", sql: "SQL", java: "Java", go: "Go", rust: "Rust", php: "PHP", diff: "Diff",
  x86asm: "Assembly", asm: "Assembly", http: "HTTP", markdown: "Markdown", md: "Markdown", text: "Text", plaintext: "Text"
};

document.querySelectorAll(".article-body pre").forEach((pre) => {
  const code = pre.querySelector("code");
  const lang = (pre.dataset.lang || "").toLowerCase();
  if (code && window.hljs && lang && lang !== "text" && lang !== "plaintext") {
    const known = window.hljs.getLanguage(lang === "ps1" ? "powershell" : lang === "asm" ? "x86asm" : lang);
    if (known) {
      code.classList.add(`language-${lang === "ps1" ? "powershell" : lang === "asm" ? "x86asm" : lang}`);
      window.hljs.highlightElement(code);
    }
  }

  const wrapper = document.createElement("div");
  const bar = document.createElement("div");
  const label = document.createElement("span");
  const button = document.createElement("button");

  wrapper.className = "code-block";
  bar.className = "code-bar";
  label.className = "code-lang";
  label.textContent = pre.dataset.label || languageNames[lang] || lang || "Code";
  button.className = "copy-code";
  button.type = "button";
  button.textContent = "복사";
  button.setAttribute("aria-label", "코드 블록 복사");

  pre.parentNode.insertBefore(wrapper, pre);
  bar.append(label, button);
  wrapper.append(bar, pre);

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText);
      button.textContent = "복사됨 ✓";
      button.classList.add("is-done");
    } catch {
      button.textContent = "복사 실패";
    }
    setTimeout(() => { button.textContent = "복사"; button.classList.remove("is-done"); }, 1500);
  });
});

/* ---------- heading anchors ---------- */
document.querySelectorAll(".article-body section[id] > h2, .article-body h3[id]").forEach((heading) => {
  const id = heading.id || heading.parentElement.id;
  const anchor = document.createElement("a");
  anchor.className = "heading-anchor";
  anchor.href = `#${id}`;
  anchor.textContent = "#";
  anchor.setAttribute("aria-label", `${headingText(heading)} 링크 복사`);
  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    const url = `${location.origin}${location.pathname}#${id}`;
    history.replaceState(null, "", `#${id}`);
    document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    navigator.clipboard?.writeText(url).then(() => {
      anchor.dataset.copied = "링크 복사됨";
      setTimeout(() => { delete anchor.dataset.copied; }, 1400);
    }).catch(() => {});
  });
  heading.append(anchor);
});

/* ---------- side table of contents with scroll spy ---------- */
const article = document.querySelector(".article-body");
const inlineToc = document.querySelector(".post-toc");
if (article && inlineToc) {
  const sections = [...article.querySelectorAll(":scope > section[id]")];
  const rail = document.createElement("nav");
  rail.className = "toc-rail";
  rail.setAttribute("aria-label", "본문 목차");
  const title = document.createElement("p");
  title.textContent = "목차";
  const list = document.createElement("ol");

  sections.forEach((section, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${section.id}`;
    link.dataset.target = section.id;
    link.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b>`;
    link.append(document.createTextNode(headingText(section.querySelector("h2"))));
    item.append(link);
    const subs = [...section.querySelectorAll("h3[id]")];
    if (subs.length) {
      const subList = document.createElement("ol");
      subs.forEach((sub) => {
        const subItem = document.createElement("li");
        const subLink = document.createElement("a");
        subLink.href = `#${sub.id}`;
        subLink.dataset.target = sub.id;
        subLink.textContent = headingText(sub);
        subItem.append(subLink);
        subList.append(subItem);
      });
      item.append(subList);
    }
    list.append(item);
  });
  rail.append(title, list);
  document.body.append(rail);

  const watched = [...article.querySelectorAll(":scope > section[id], h3[id]")];
  const links = [...rail.querySelectorAll("a")];
  const setCurrent = () => {
    const line = window.innerHeight * 0.4;
    let current = watched[0];
    for (const element of watched) {
      if (element.getBoundingClientRect().top - line <= 0) current = element;
    }
    const section = current?.closest("section");
    links.forEach((link) => {
      const target = (link.dataset.target || link.getAttribute("href").slice(1));
      link.classList.toggle("is-current", target === current?.id);
      link.classList.toggle("is-parent", target === section?.id && target !== current?.id);
    });
    rail.classList.toggle("is-visible", inlineToc.getBoundingClientRect().bottom < 0);
  };
  let spyTicking = false;
  window.addEventListener("scroll", () => {
    if (!spyTicking) { spyTicking = true; requestAnimationFrame(() => { setCurrent(); spyTicking = false; }); }
  }, { passive: true });
  setCurrent();
}

/* ---------- image lightbox ---------- */
const figures = document.querySelectorAll(".article-figure img, .article-body p img");
if (figures.length) {
  const box = document.createElement("dialog");
  box.className = "lightbox";
  box.innerHTML = '<img alt=""><p></p><button type="button" aria-label="닫기">닫기 ✕</button>';
  document.body.append(box);
  const boxImage = box.querySelector("img");
  const boxCaption = box.querySelector("p");
  box.addEventListener("click", () => box.close());
  figures.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "이미지"} 크게 보기`);
    const open = () => {
      boxImage.src = image.currentSrc || image.src;
      boxImage.alt = image.alt;
      boxCaption.textContent = image.closest("figure")?.querySelector("figcaption")?.textContent || image.alt;
      box.showModal();
    };
    image.addEventListener("click", open);
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
}

/* ---------- back to top ---------- */
(function initBackToTop() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "to-top";
  button.setAttribute("aria-label", "페이지 맨 위로 이동");
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';
  document.body.append(button);
  const toTop = (event) => {
    event?.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };
  button.addEventListener("click", toTop);
  document.querySelectorAll("[data-scroll-top]").forEach((link) => link.addEventListener("click", toTop));
  window.addEventListener("scroll", () => {
    button.classList.toggle("is-visible", window.scrollY > 700);
  }, { passive: true });
})();

/* ---------- category tabs: post counts ---------- */
document.querySelectorAll(".category-tabs a").forEach((link) => {
  const key = new URL(link.href, location.href).searchParams.get("category");
  const count = allPosts.filter((post) => post.category === key).length;
  if (!count) return;
  const badge = document.createElement("em");
  badge.className = "tab-count";
  badge.textContent = `${count}편`;
  link.append(badge);
});

/* ---------- home: recent posts + search ---------- */
const homePostList = document.getElementById("home-post-list");
const homePostCount = document.getElementById("home-post-count");
const searchInput = document.getElementById("post-search");

if (homePostList && allPosts.length) {
  const render = (posts, query) => {
    homePostList.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = `“${query}”에 맞는 기록이 아직 없습니다. 여우도 모르는 내용인가 봐요.`;
      homePostList.append(empty);
      return;
    }
    posts.forEach((post) => {
      const link = document.createElement("a");
      const time = document.createElement("time");
      const copy = document.createElement("div");
      const tag = document.createElement("p");
      const title = document.createElement("h3");
      const description = document.createElement("p");
      const arrow = document.createElement("span");

      link.className = "post-row";
      link.href = post.url;
      time.dateTime = post.date;
      time.textContent = formatDate(post.date);
      tag.className = "post-tag";
      tag.textContent = categoryNames[post.category] || "기록";
      if (post.minutes) {
        const minutes = document.createElement("span");
        minutes.textContent = ` · 약 ${post.minutes}분`;
        tag.append(minutes);
      }
      title.textContent = post.title;
      description.textContent = post.description;
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      copy.append(tag, title, description);
      link.append(time, copy, arrow);
      homePostList.append(link);
    });
  };

  const apply = () => {
    const query = searchInput ? searchInput.value.trim() : "";
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      homePostCount.textContent = `${allPosts.length}개의 글`;
      render(allPosts.slice(0, 6), "");
      return;
    }
    const found = allPosts.filter((post) => {
      const haystack = `${post.title} ${post.description} ${categoryNames[post.category] || ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    homePostCount.textContent = `${found.length}개 찾음 / 전체 ${allPosts.length}개`;
    render(found, query);
  };

  if (searchInput) {
    searchInput.closest("form")?.addEventListener("submit", (event) => event.preventDefault());
    searchInput.addEventListener("input", apply);
    document.addEventListener("keydown", (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (event.key === "/" && !typing) { event.preventDefault(); searchInput.focus(); }
      if (event.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; apply(); searchInput.blur(); }
    });
  }
  apply();
}
}
