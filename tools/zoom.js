/* 양식 미리보기 그림을 누르면 크게 본다. 다시 누르거나 Esc 로 닫는다. */
(function () {
  "use strict";
  var imgs = document.querySelectorAll(".pv img");
  if (!imgs.length || !window.HTMLDialogElement) return;
  var d = document.createElement("dialog");
  d.className = "zoom";
  d.setAttribute("aria-label", "그림 크게 보기");
  var big = document.createElement("img");
  d.appendChild(big);
  document.body.appendChild(d);
  d.addEventListener("click", function () { d.close(); });
  imgs.forEach(function (im) {
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", (im.alt || "양식 그림") + " — 크게 보기");
    function open() { big.src = im.currentSrc || im.src; big.alt = im.alt; d.showModal(); }
    im.addEventListener("click", open);
    im.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
})();
