const progressBar = document.getElementById("reading-progress-bar");

if (progressBar) {
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, progress)) + "%";
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

document.querySelectorAll(".article-body pre").forEach((pre) => {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");

  wrapper.className = "code-block";
  button.className = "copy-code";
  button.type = "button";
  button.textContent = "코드 복사";
  button.setAttribute("aria-label", "코드 블록 복사");

  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.append(button, pre);

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText);
      button.textContent = "복사됨";
      setTimeout(() => { button.textContent = "코드 복사"; }, 1400);
    } catch {
      button.textContent = "복사 실패";
      setTimeout(() => { button.textContent = "코드 복사"; }, 1400);
    }
  });
});

const homePostList = document.getElementById("home-post-list");
const homePostCount = document.getElementById("home-post-count");

if (homePostList && Array.isArray(window.ESAEMIP_POSTS)) {
  const categoryNames = {
    development: "개발",
    ctf: "CTF / Wargame",
    "bug-bounty": "Bug Bounty",
    writing: "블로그 / 기술문서",
    research: "논문 / 컨퍼런스",
    achievements: "공모전 / 자격증"
  };
  const posts = window.ESAEMIP_POSTS.slice(0, 5);

  homePostList.replaceChildren();
  homePostCount.textContent = `${window.ESAEMIP_POSTS.length}개의 글`;

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
    time.textContent = post.date.replaceAll("-", ". ") + ".";
    tag.className = "post-tag";
    tag.textContent = categoryNames[post.category] || "기록";
    title.textContent = post.title;
    description.textContent = post.description;
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    copy.append(tag, title, description);
    link.append(time, copy, arrow);
    homePostList.append(link);
  });
}
