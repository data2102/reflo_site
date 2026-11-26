/* 답변집 — 체험판 (리플로). 화면은 HTML, 데이터는 엑셀 파일 하나. 서버·DB 없음.
   저장 방식은 팀 업무 화면(tools/weekly)과 같다: 고른 파일에 바로 덮어쓰고, 그새 바뀌었으면 번호별로 늦게 고친 쪽을 남겨 합친다. */
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var pad = function (n) { return (n < 10 ? "0" : "") + n; };
var iso = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
var ago = function (n) { var d = new Date(TODAY); d.setDate(d.getDate() - n); return iso(d); };
var daysSince = function (s) { var m = String(s || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? Math.round((TODAY - new Date(+m[1], +m[2] - 1, +m[3])) / 864e5) : null; };
var uid = function () { return Math.random().toString(36).slice(2, 9); };
var now = function () { return Date.now(); };
var toastT;
function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2800); }
function track(n) { try { if (window.gtag) window.gtag("event", n); } catch (e) {} }

var S = { answers: [], gaps: [] };
function seed() {
  var A = function (cat, title, keys, body, src, d) { return { id: uid(), cat: cat, title: title, keys: keys, body: body, src: src, fixed: ago(d), used: 0, u: now() }; };
  S.answers = [
    A("배송", "언제 받을 수 있나요?", "배송 출고 도착 며칠", "안녕하세요.\n평일 오후 2시 이전 주문은 당일 출고되고, 출고 후 보통 1~2일 안에 받으실 수 있습니다.\n도서·산간 지역은 하루 이틀 더 걸릴 수 있습니다.\n감사합니다.", "배송 안내 페이지", 20),
    A("배송", "배송지를 바꾸고 싶어요", "주소 변경 배송지", "안녕하세요.\n출고 전이라면 바로 바꿔 드릴 수 있습니다. 바꾸실 주소를 알려 주세요.\n이미 출고된 뒤에는 택배사에서만 변경할 수 있어, 송장 번호와 함께 택배사 연락처를 안내해 드리겠습니다.\n감사합니다.", "지난 답변", 75),
    A("환불·교환", "환불하고 싶어요", "환불 반품 취소", "안녕하세요.\n받으신 날부터 7일 안에, 사용하지 않은 상품은 환불해 드립니다.\n단순 변심은 왕복 배송비가 듭니다. 상품에 문제가 있으면 배송비는 저희가 부담합니다.\n주문 번호를 알려 주시면 반품 접수해 드리겠습니다.\n감사합니다.", "환불 규정 (2026년 3월 개정)", 240),
    A("환불·교환", "다른 색으로 바꿀 수 있나요?", "교환 색상 사이즈", "안녕하세요.\n받으신 날부터 7일 안에, 사용하지 않은 상품은 교환해 드립니다.\n바꾸실 상품의 재고를 먼저 확인해 드릴게요. 원하시는 색상(사이즈)을 알려 주세요.\n감사합니다.", "환불 규정", 40),
    A("결제·증빙", "세금계산서 발행되나요?", "세금계산서 계산서 사업자", "안녕하세요.\n발행해 드립니다. 사업자등록증과 받으실 메일 주소를 보내 주세요.\n결제하신 달의 다음 달 10일까지 요청하셔야 그 달 날짜로 발행됩니다.\n감사합니다.", "세무사 확인", 15),
    A("결제·증빙", "견적서 받을 수 있을까요?", "견적 견적서 대량 단체", "안녕하세요.\n품목과 수량, 받으실 날짜를 알려 주시면 견적서를 보내 드립니다.\n50개 이상은 수량에 따라 단가가 달라집니다.\n감사합니다.", "지난 답변", 200),
    A("이용 안내", "전화가 안 돼요 / 언제 통화되나요?", "영업시간 전화 상담 통화", "안녕하세요.\n상담은 평일 오전 10시부터 오후 5시까지입니다(점심 12~1시 제외).\n통화가 어려울 때는 이 메일이나 문의 게시판에 남겨 주시면 영업일 하루 안에 답드립니다.\n감사합니다.", "홈페이지 안내", 10),
    A("이용 안내", "로그인이 안 돼요", "로그인 비밀번호 아이디", "안녕하세요.\n로그인 화면의 「비밀번호 찾기」에서 가입하신 메일로 재설정 링크를 받으실 수 있습니다.\n메일이 오지 않으면 스팸함을 확인해 주시고, 그래도 없으면 가입하신 메일 주소를 알려 주세요.\n감사합니다.", "지난 답변", 55)
  ];
  S.gaps = [
    { id: uid(), text: "해외로도 보내 주나요?", count: 3, first: ago(18), u: now() },
    { id: uid(), text: "영수증에 품목을 나눠서 적어 줄 수 있나요?", count: 1, first: ago(4), u: now() }
  ];
}

/* ── 찾기 ── */
var CAT = "", EDIT = null;
function score(a, toks) {
  var t = (a.title + " " + a.keys).toLowerCase(), b = a.body.toLowerCase(), s = 0;
  for (var i = 0; i < toks.length; i++) { var k = toks[i]; if (t.indexOf(k) >= 0) s += 3; else if (b.indexOf(k) >= 0) s += 1; else return 0; }
  return s;
}
function hl(text, toks) {
  var h = esc(text); if (!toks.length) return h;
  toks.forEach(function (k) { if (k.length < 1) return; h = h.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), function (m) { return "<mark>" + m + "</mark>"; }); });
  return h;
}
function render() {
  var cats = []; S.answers.forEach(function (a) { if (a.cat && cats.indexOf(a.cat) < 0) cats.push(a.cat); });
  $("chips").innerHTML = '<button class="chip' + (!CAT ? " on" : "") + '" data-c="">전체</button>' + cats.map(function (c) { return '<button class="chip' + (CAT === c ? " on" : "") + '" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
  var q = $("q").value.trim().toLowerCase(), toks = q ? q.split(/\s+/) : [];
  var rows = S.answers.filter(function (a) { return !CAT || a.cat === CAT; }).map(function (a) { return { a: a, s: toks.length ? score(a, toks) : 1 }; }).filter(function (r) { return r.s > 0 || r.a.id === EDIT; });
  rows.sort(function (x, y) { if (x.a.id === EDIT) return -1; if (y.a.id === EDIT) return 1; return (y.s - x.s) || ((y.a.used || 0) - (x.a.used || 0)); });
  $("count").textContent = (toks.length ? "찾은 답 " : "답변 ") + rows.length + "개" + (toks.length ? "" : " · 많이 꺼내 쓴 순");
  $("list").innerHTML = rows.map(function (r) {
    var a = r.a, d = daysSince(a.fixed), old = d !== null && d > 180, ed = a.id === EDIT;
    return '<article class="ans' + (ed ? " editing" : "") + '" data-id="' + a.id + '"><h3><span class="q" contenteditable="true" data-k="title">' + (ed ? esc(a.title) : hl(a.title, toks)) + "</span></h3>" +
      '<div class="body" contenteditable="true" data-k="body">' + (ed ? esc(a.body) : hl(a.body, toks)) + "</div>" +
      '<div class="edit">분류 <input data-k="cat" value="' + esc(a.cat) + '" size="10"> 찾을 때 쓸 말 <input data-k="keys" value="' + esc(a.keys) + '" size="22"> 근거 <input data-k="src" value="' + esc(a.src) + '" size="18"></div>' +
      '<div class="meta"><span class="tg cat">' + esc(a.cat || "분류 없음") + '</span><span class="tg ' + (old ? "old" : "ok") + '">고친 날 ' + esc(a.fixed) + (old ? " · 여섯 달 지남" : "") + "</span>" +
      (a.src ? "<span>근거: " + esc(a.src) + "</span>" : "<span>근거 없음</span>") + (a.used ? "<span>" + a.used + "번 꺼내 씀</span>" : "") + '<span class="sp"></span>' +
      '<button class="btn sm" data-act="more">' + (ed ? "닫기" : "분류·근거") + "</button>" + (ed ? '<button class="btn sm" data-act="del">지우기</button>' : "") +
      (old ? '<button class="btn sm" data-act="ok">지금도 맞아요</button>' : "") +
      '<button class="btn sm pri" data-act="copy"><i class="ti ti-copy"></i>복사</button></div></article>';
  }).join("") || '<div class="none">「' + esc($("q").value.trim()) + '」에 맞는 답이 아직 없어요.<br><button class="btn pri" id="toGap" style="margin-top:10px"><i class="ti ti-pencil-plus"></i>없던 질문으로 적어 두기</button></div>';
  var n = S.gaps.length; $("nGap").textContent = n; $("nGap").classList.toggle("hide", !n);
  renderGaps();
}
function renderGaps() {
  var g = S.gaps.slice().sort(function (a, b) { return (b.count - a.count) || (a.first < b.first ? -1 : 1); });
  $("gaps").innerHTML = g.map(function (x) {
    return '<div class="gap" data-id="' + x.id + '"><span class="t">' + esc(x.text) + '</span><span class="c">' + x.count + "번 · " + esc(x.first) + ' 처음</span><button class="btn sm" data-g="plus">또 왔어요</button><button class="btn sm pri" data-g="fill">답 채우기</button><button class="btn sm" data-g="del" aria-label="지우기">✕</button></div>';
  }).join("") || '<div class="none">적어 둔 질문이 없어요. 답변집에 없는 문의가 오면 여기에 적어 두세요.</div>';
}
$("q").addEventListener("input", function () { EDIT = null; render(); });
$("chips").addEventListener("click", function (e) { var c = e.target.closest("[data-c]"); if (c) { CAT = c.dataset.c; render(); } });
$("newA").addEventListener("click", function () { newAnswer("", ""); });
function newAnswer(title, body) {
  var a = { id: uid(), cat: CAT || "", title: title, keys: "", body: body || "안녕하세요.\n\n감사합니다.", src: "", fixed: iso(TODAY), used: 0, u: now() };
  S.answers.push(a); EDIT = a.id; $("q").value = ""; changed();
  document.querySelector('[data-tab="find"]').click();
  var el = document.querySelector('.ans[data-id="' + a.id + '"] .' + (title ? "body" : "q")); if (el) { el.focus(); el.scrollIntoView({ block: "center" }); }
}
$("list").addEventListener("click", function (e) {
  if (e.target.closest("#toGap")) { addGap($("q").value.trim()); $("q").value = ""; render(); document.querySelector('[data-tab="gaps"]').click(); return; }
  var b = e.target.closest("[data-act]"); if (!b) return;
  var a = S.answers.find(function (x) { return x.id === b.closest(".ans").dataset.id; });
  switch (b.dataset.act) {
    case "copy":
      var done = function () { a.used = (a.used || 0) + 1; a.u = now(); changed("복사했어요. 메일에 붙여 넣고 이름·주문 번호만 고치면 돼요."); track("answers_copy"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(a.body).then(done, function () { toast("복사하지 못했어요. 답을 끌어서 직접 복사해 주세요."); });
      else { var ta = document.createElement("textarea"); ta.value = a.body; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (x) {} ta.remove(); }
      return;
    case "more": EDIT = EDIT === a.id ? null : a.id; return render();
    case "ok": a.fixed = iso(TODAY); a.u = now(); return changed("오늘 확인한 것으로 적었어요.");
    case "del": S.answers = S.answers.filter(function (x) { return x !== a; }); EDIT = null; return changed("지웠어요.");
  }
});
$("list").addEventListener("focusout", function (e) {
  var el = e.target; if (!el.dataset || !el.dataset.k) return;
  var art = el.closest(".ans"); if (!art) return;
  var a = S.answers.find(function (x) { return x.id === art.dataset.id; }); if (!a) return;
  var v = (el.tagName === "INPUT" ? el.value : el.innerText).replace(/ /g, " ").trim();
  if (v === a[el.dataset.k]) return;
  a[el.dataset.k] = v; a.u = now();
  if (el.dataset.k === "body" || el.dataset.k === "title") a.fixed = iso(TODAY);
  changed(null, document.activeElement && art.contains(document.activeElement));
});
$("list").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.matches(".q")) { e.preventDefault(); e.target.blur(); } });
function addGap(text) {
  if (!text) return;
  var same = S.gaps.find(function (g) { return g.text.replace(/\s/g, "") === text.replace(/\s/g, ""); });
  if (same) { same.count++; same.u = now(); toast("이미 적어 둔 질문이에요. 횟수를 올렸어요."); }
  else { S.gaps.push({ id: uid(), text: text, count: 1, first: iso(TODAY), u: now() }); toast("적어 뒀어요."); }
  changed(); track("answers_gap");
}
$("gapForm").addEventListener("submit", function (e) { e.preventDefault(); addGap($("gapIn").value.trim()); $("gapIn").value = ""; });
$("gaps").addEventListener("click", function (e) {
  var b = e.target.closest("[data-g]"); if (!b) return;
  var g = S.gaps.find(function (x) { return x.id === b.closest(".gap").dataset.id; });
  if (b.dataset.g === "plus") { g.count++; g.u = now(); return changed(); }
  S.gaps = S.gaps.filter(function (x) { return x !== g; });
  if (b.dataset.g === "fill") { newAnswer(g.text, ""); toast("질문을 제목으로 옮겼어요. 확인된 답을 적어 주세요."); track("answers_fill"); } else changed();
});
document.querySelectorAll(".tabs button").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
    $("v-find").classList.toggle("hide", b.dataset.tab !== "find"); $("v-gaps").classList.toggle("hide", b.dataset.tab !== "gaps");
  });
});

/* ── 엑셀 파일 ── */
var SHEETS = {
  answers: ["답변", [["id", "번호"], ["cat", "분류"], ["title", "문의 (문의한 사람의 말로)"], ["keys", "찾을 때 쓸 말"], ["body", "답"], ["src", "근거"], ["fixed", "고친 날"], ["used", "꺼내 쓴 횟수"], ["u", "고친 때"]]],
  gaps: ["없던 질문", [["id", "번호"], ["text", "질문"], ["count", "온 횟수"], ["first", "처음 온 날"], ["u", "고친 때"]]]
};
function toBook() {
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["리플로 · 답변집 데이터 파일"], [""], ["https://refloworks.com/tools/answers/ 화면에서 열어 쓰는 데이터예요. 엑셀로 열어 고쳐도 됩니다."], ["「번호」와 「고친 때」 열은 지우지 마세요 — 여러 사람이 고친 것을 합칠 때 씁니다."], ["팀이 같이 쓰려면 이 파일을 공유 폴더에 두고, 각자 화면에서 이 파일을 여세요."], [""], ["마지막 저장: " + new Date().toLocaleString("ko-KR")]]), "안내");
  Object.keys(SHEETS).forEach(function (k) {
    var cols = SHEETS[k][1], ws = XLSX.utils.aoa_to_sheet([cols.map(function (c) { return c[1]; })].concat(S[k].map(function (o) { return cols.map(function (c) { return o[c[0]] == null ? "" : o[c[0]]; }); })));
    ws["!cols"] = cols.map(function (c) { return { wch: c[0] === "body" ? 60 : c[0] === "title" ? 32 : 14 }; });
    XLSX.utils.book_append_sheet(wb, ws, SHEETS[k][0]);
  });
  return wb;
}
function fromBook(wb) {
  if (!wb.Sheets[SHEETS.answers[0]]) return null;
  var out = { answers: [], gaps: [] };
  Object.keys(SHEETS).forEach(function (k) {
    var ws = wb.Sheets[SHEETS[k][0]]; if (!ws) return;
    var cols = SHEETS[k][1], rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }), head = rows.shift() || [];
    rows.forEach(function (r) {
      var o = {}; cols.forEach(function (c) { var i = head.indexOf(c[1]); o[c[0]] = i >= 0 ? String(r[i]).replace(/\r\n/g, "\n").trim() : ""; });
      if (!o.id) o.id = uid(); o.u = +o.u || 0;
      if (k === "answers") { if (!o.title && !o.body) return; o.used = +o.used || 0; } else { if (!o.text) return; o.count = +o.count || 1; }
      out[k].push(o);
    });
  });
  return out;
}
function merge(other) {
  var n = 0;
  ["answers", "gaps"].forEach(function (k) {
    var map = {}; S[k].forEach(function (o) { map[o.id] = o; });
    other[k].forEach(function (o) { var m = map[o.id]; if (!m) { S[k].push(o); n++; } else if ((o.u || 0) > (m.u || 0)) { Object.assign(m, o); n++; } });
  });
  return n;
}
var FS = "showSaveFilePicker" in window, handle = null, lastMod = 0, fname = "", dirty = false, saving = false, saveT;
var TYPES = [{ description: "엑셀 파일", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }];
function pill() {
  var on = !!handle; $("filePill").classList.toggle("on", on);
  $("filePill").querySelector("i").className = "ti " + (on ? "ti-cloud-check" : "ti-flask");
  $("fileTxt").textContent = on ? fname + " · " + (dirty ? "저장 중…" : "자동 저장 켜짐 · " + new Date().toTimeString().slice(0, 5) + " 저장됨")
    : fname ? fname + " · 고친 뒤 「저장」을 누르면 파일로 내려받아져요" : "체험 중 · 예시 데이터 (아직 저장 안 함)";
  $("saveTxt").textContent = handle ? "다른 이름으로 저장" : "내 PC에 저장";
}
function changed(msg, quiet) { dirty = true; if (!quiet) render(); if (msg) toast(msg); if (handle) { pill(); clearTimeout(saveT); saveT = setTimeout(autosave, 700); } }
async function autosave() {
  if (!handle || saving) return; saving = true;
  try {
    if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted" && (await handle.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("perm");
    var f = await handle.getFile();
    if (lastMod && f.lastModified !== lastMod) { var other = fromBook(XLSX.read(await f.arrayBuffer(), { type: "array" })); if (other) { var n = merge(other); if (n) { toast("그새 다른 사람이 고친 " + n + "건을 합쳐서 저장했어요."); render(); } } }
    var w = await handle.createWritable(); await w.write(XLSX.write(toBook(), { bookType: "xlsx", type: "array" })); await w.close();
    lastMod = (await handle.getFile()).lastModified; dirty = false;
  } catch (e) { toast("저장하지 못했어요. 파일이 다른 곳에서 열려 있으면 닫고 다시 해 주세요."); }
  saving = false; pill();
}
$("btnSave").addEventListener("click", async function () {
  if (FS) {
    try { var h = await window.showSaveFilePicker({ suggestedName: "우리회사-답변집.xlsx", types: TYPES }); handle = h; fname = h.name; lastMod = 0; dirty = true; pill(); await autosave(); toast("저장했어요. 이제 고칠 때마다 이 파일에 바로 저장돼요."); track("answers_saved_fs"); }
    catch (e) { if (e.name !== "AbortError") toast("저장하지 못했어요."); }
  } else { XLSX.writeFile(toBook(), fname || "우리회사-답변집.xlsx"); dirty = false; pill(); toast("파일로 내려받았어요. 다음에 「파일 열기」로 그 파일을 고르면 이어서 써요."); track("answers_saved_dl"); }
});
async function loadFile(file, h) {
  try {
    var d = fromBook(XLSX.read(await file.arrayBuffer(), { type: "array" }));
    if (!d) return toast("이 파일에서 「답변」 시트를 찾지 못했어요. 이 화면에서 저장한 파일을 골라 주세요.");
    S = d; fname = file.name; handle = h || null; lastMod = h ? file.lastModified : 0; dirty = false; EDIT = null; CAT = ""; $("q").value = "";
    render(); pill(); toast("열었어요. 답변 " + S.answers.length + "개" + (h ? " · 고치면 이 파일에 바로 저장돼요." : "")); track("answers_opened");
  } catch (e) { toast("파일을 읽지 못했어요."); }
}
$("btnOpen").addEventListener("click", async function () {
  if ("showOpenFilePicker" in window) { try { var hs = await window.showOpenFilePicker({ types: TYPES }); await loadFile(await hs[0].getFile(), hs[0]); } catch (e) { if (e.name !== "AbortError") toast("파일을 열지 못했어요."); } }
  else $("pick").click();
});
$("pick").addEventListener("change", function (e) { var f = e.target.files[0]; if (f) loadFile(f, null); e.target.value = ""; });

seed(); render(); pill();
window.__answers = { S: function () { return S; }, toBook: toBook, fromBook: fromBook, merge: merge };
})();
