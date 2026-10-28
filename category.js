const categories = {
  development: {
    number: "01",
    title: "개발",
    description: "직접 만들어보다가 막힌 부분과 해결한 방법을 적습니다.",
    accent: "#668c83",
    focusTitle: "어디서 막혔고, 어떻게 풀었는지.",
    focusDescription: "완성 화면보다 실제로 헤맨 순서와 다음에 다시 볼 내용을 남깁니다.",
    topics: [
      { title: "만든 것", body: "무엇을 만들었고 어떤 식으로 구성했는지." },
      { title: "막힌 것", body: "에러 메시지와 시도한 방법, 실제 원인은 무엇이었는지." },
      { title: "다시 볼 것", body: "다시 만든다면 바꾸고 싶은 부분은 무엇인지." }
    ]
  },
  ctf: {
    number: "02",
    title: "CTF / Wargame",
    description: "문제를 읽고 헤매다가 풀이에 도착한 순서를 적습니다.",
    accent: "#728ba1",
    focusTitle: "정답보다 중간에 했던 생각들.",
    focusDescription: "처음 본 단서부터 틀린 접근, 마지막에 통했던 방법까지 순서대로 남깁니다.",
    topics: [
      { title: "처음 본 단서", body: "환경과 목표, 눈에 들어온 단서는 무엇이었는지." },
      { title: "틀린 접근", body: "막혔던 가설과 방향을 바꾼 이유는 무엇이었는지." },
      { title: "마지막 풀이", body: "결국 통했던 방법과 새로 배운 기법은 무엇인지." }
    ]
  },
  "bug-bounty": {
    number: "03",
    title: "Bug Bounty",
    description: "허가된 환경에서 공부한 취약점과 재현 과정을 기록합니다.",
    accent: "#8b7d96",
    focusTitle: "무엇이 문제였고, 왜 생겼는지.",
    focusDescription: "확인한 범위와 재현 조건, 고칠 방법을 과장 없이 정리합니다.",
    topics: [
      { title: "확인한 범위", body: "어디까지 확인했고 어떤 입력에서 문제가 생겼는지." },
      { title: "재현 과정", body: "필요한 조건과 실제로 나타난 결과는 무엇인지." },
      { title: "고칠 방법", body: "원인을 없애고 같은 문제가 다시 생기지 않게 하려면." }
    ]
  },
  writing: {
    number: "04",
    title: "블로그 / 기술문서",
    description: "나중에 다시 따라 할 수 있도록 기술 기록을 정리합니다.",
    accent: "#9a806d",
    focusTitle: "기억 말고 글만 보고 따라가게.",
    focusDescription: "왜 시작했는지, 실제로 한 순서, 중간에 바뀐 내용을 빼먹지 않고 적습니다.",
    topics: [
      { title: "왜 했는지", body: "이 기록을 시작한 이유와 해결하려던 문제." },
      { title: "실제로 한 순서", body: "명령어와 설정값을 이유와 함께 차례대로." },
      { title: "바뀐 내용", body: "틀렸던 내용과 나중에 고친 방법까지." }
    ]
  },
  research: {
    number: "05",
    title: "논문 / 컨퍼런스",
    description: "읽은 논문과 발표에서 이해한 것, 못 이해한 것을 함께 적습니다.",
    accent: "#6e8791",
    focusTitle: "요약하고 끝내지 않기.",
    focusDescription: "어떤 문제를 풀었는지와 핵심 아이디어, 읽고도 남은 질문을 적습니다.",
    topics: [
      { title: "문제", body: "무엇을 해결하려는 연구이고 왜 중요한지." },
      { title: "핵심 아이디어", body: "방법과 결과를 내가 이해한 말로 다시 설명하기." },
      { title: "남은 질문", body: "아직 모르겠거나 더 찾아볼 개념은 무엇인지." }
    ]
  },
  achievements: {
    number: "06",
    title: "공모전 / 자격증",
    description: "공모전과 자격증을 준비하며 실제로 한 일을 기록합니다.",
    accent: "#7f8d6d",
    focusTitle: "결과보다 다음에 써먹을 준비 과정.",
    focusDescription: "목표와 공부한 내용, 끝나고 나서야 보인 부족한 점을 남깁니다.",
    topics: [
      { title: "목표", body: "마감과 시험일, 처음 세운 계획은 어땠는지." },
      { title: "공부한 것", body: "사용한 자료와 연습 방법, 중간 점검 결과." },
      { title: "끝나고 보니", body: "잘한 점과 부족했던 점, 다음에는 바꿀 것." }
    ]
  }
};

const params = new URLSearchParams(window.location.search);
const requestedCategory = params.get("category");
const categoryKey = Object.prototype.hasOwnProperty.call(categories, requestedCategory) ? requestedCategory : "development";
const category = categories[categoryKey];
const allPosts = Array.isArray(window.ESAEMIP_POSTS) ? window.ESAEMIP_POSTS : [];
category.posts = allPosts.filter((post) => post.category === categoryKey);

document.documentElement.style.setProperty("--category-accent", category.accent);
document.body.dataset.category = categoryKey;
document.title = `${category.title} — Esaemip`;
document.querySelector("meta[name='description']").content = category.description;
document.querySelectorAll(".category-tabs a").forEach((link) => {
  const target = "category=" + categoryKey;
  const isCurrent = link.getAttribute("href").includes(target);
  link.classList.toggle("is-active", isCurrent);
  if (isCurrent) link.setAttribute("aria-current", "page");
});
document.getElementById("category-number").textContent = category.number + "번째 기록칸";
document.getElementById("category-ghost").textContent = category.number;
document.getElementById("category-title").textContent = category.title;
document.getElementById("category-description").textContent = category.description;
document.getElementById("focus-title").textContent = category.focusTitle;
document.getElementById("focus-description").textContent = category.focusDescription;
document.getElementById("post-count").textContent = `${category.posts.length}개의 글`;

const topicGrid = document.getElementById("topic-grid");
category.topics.forEach((topic, index) => {
  const card = document.createElement("article");
  const number = document.createElement("span");
  const title = document.createElement("h3");
  const body = document.createElement("p");

  card.className = "topic-card";
  number.textContent = String(index + 1).padStart(2, "0");
  title.textContent = topic.title;
  body.textContent = topic.body;
  card.append(number, title, body);
  topicGrid.append(card);
});

const postList = document.getElementById("post-list");
const emptyState = document.getElementById("empty-state");

if (category.posts.length > 0) {
  emptyState.hidden = true;
  postList.hidden = false;

  category.posts.forEach((post) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const date = document.createElement("time");

    link.href = post.url;
    title.textContent = post.title;
    description.textContent = post.description;
    date.dateTime = post.date;
    date.textContent = post.date.replaceAll("-", ".");
    link.append(title, description, date);
    item.append(link);
    postList.append(item);
  });
}
