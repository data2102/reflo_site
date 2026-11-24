/* 리플로 Reflo — 방문 측정 (Google Analytics 4)
   ------------------------------------------------------------------
   바꿀 곳은 아래 한 줄뿐입니다.
   GA4 측정 ID 를 받으면 "G-XXXXXXXXXX" 자리에 그대로 넣으세요.
   넣기 전에는 아무것도 보내지 않습니다. 빈 채로 올려도 사이트는 멀쩡합니다.
   ------------------------------------------------------------------ */
var 측정ID = "G-W7Y2V6YX6N";

(function () {
  "use strict";

  // 1) ID 를 아직 넣지 않았으면 여기서 멈춘다.
  //    자리표시자(G-XXXXXXXXXX)도 가짜로 본다. 숫자가 하나도 없으면 ID 가 아니다.
  if (!/^G-[A-Z0-9]{8,}$/.test(측정ID)) return;
  if (!/[0-9]/.test(측정ID)) return;

  // 2) 내가 내 사이트를 보는 것은 세지 않는다.
  //    주소 끝에 ?me=1 을 붙여 한 번 들어오면 그 브라우저는 이후 계속 제외된다.
  //    (해제: ?me=0)
  try {
    if (location.search.indexOf("me=1") > -1) localStorage.setItem("reflo_me", "1");
    if (location.search.indexOf("me=0") > -1) localStorage.removeItem("reflo_me");
    if (localStorage.getItem("reflo_me") === "1") return;
  } catch (e) { /* 저장을 막아둔 브라우저면 그냥 센다 */ }

  // 3) GA4 불러오기
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + 측정ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", 측정ID);

  // 4) 누른 것을 기록한다.
  //    <a data-track="이름"> 이 붙은 링크만 센다. 그 밖의 클릭은 보내지 않는다.
  document.addEventListener("click", function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === "A" && el.getAttribute("data-track")) {
        gtag("event", el.getAttribute("data-track"), { page_path: location.pathname });
        return;
      }
      el = el.parentNode;
    }
  }, true);
})();
