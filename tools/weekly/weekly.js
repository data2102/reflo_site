/* 주간 업무 화면 — 체험판 (리플로)
   화면은 이 HTML, 데이터는 엑셀 파일 하나. 서버·DB 없음.
   크롬·엣지·웨일: 고른 파일에 바로 덮어쓴다(File System Access API). 그 밖: 내려받기로 저장.
   저장 직전에 파일이 그새 바뀌었으면 읽어 와서 번호별로 더 늦게 고친 쪽을 남기고 합친다. */
(function () {
"use strict";

/* ── 날짜 ── */
var pad = function (n) { return (n < 10 ? "0" : "") + n; };
var iso = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
var parse = function (s) { if (!s) return null; var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
var add = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
var TODAY = (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
var monday = function (d) { var x = new Date(d); var w = (x.getDay() + 6) % 7; return add(x, -w); };
var THIS_MON = monday(TODAY);
var md = function (s) { var d = parse(s); return d ? (d.getMonth() + 1) + "/" + d.getDate() : ""; };
var days = function (a, b) { return Math.round((b - a) / 864e5); };
var DAYN = ["월", "화", "수", "목", "금"];
var weekName = function (mon) {           // 그 주 목요일이 속한 달로 센다
  var th = add(mon, 3), first = new Date(th.getFullYear(), th.getMonth(), 1);
  var firstTh = add(first, (4 - first.getDay() + 7) % 7);
  return (th.getMonth() + 1) + "월 " + (Math.floor(days(firstTh, th) / 7) + 1) + "주차";
};
var uid = function () { return Math.random().toString(36).slice(2, 9); };
var now = function () { return Date.now(); };

/* ── 상태 ── */
var S = { tasks: [], week: [], rules: [], pins: [] };
var ROWS = ["중요", "그외", "진행 중", "예정"];
var CYCLES = ["매주", "매월", "분기", "반기", "연 1회"];

function seed() {
  var d = function (n) { return iso(add(TODAY, n)); };
  var W = iso(THIS_MON), P = iso(add(THIS_MON, -7)), PP = iso(add(THIS_MON, -14));
  var T = function (o) { return Object.assign({ id: uid(), who: "", now: "", why: "", unk: "", ask: "", status: "진행", doneAt: "", row: "그외", recur: "", u: now() }, o); };
  S.tasks = [
    T({ title: "홈페이지 유지보수 계약 갱신", who: "웹 제작 업체", now: md(d(-9)) + " 견적 받음, 범위 확인 중", why: "작년 계약에 월 수정 횟수가 없어 매번 추가 비용이 나왔다", unk: "도메인 갱신이 계약에 포함되는지", ask: "업체 담당자(메일)", due: d(-3), row: "중요" }),
    T({ title: "연말 거래처 선물 발주", who: "선물 업체", now: "명단 32곳 정리 끝, 수량 확정 전", why: "", unk: "올해 새로 늘어난 거래처 몇 곳 넣을지", ask: "대표님", due: d(2), row: "중요" }),
    T({ title: "11월 매출 정리 보고", now: "온라인 주문분만 정리함", why: "카드·현금 매출은 다음 달 5일에 들어와 마감을 7일로 잡았다", due: d(5) }),
    T({ title: "신규 직원 메일·계정 만들기", who: "새 직원", now: "", why: "", unk: "입사일이 확정됐는지", ask: "총무 담당", due: d(9) }),
    T({ title: "택배 단가 재협의", who: "택배 대리점", now: "작년 단가표 찾음", why: "월 물량이 늘어 구간이 바뀔 수 있다", ask: "대리점 소장님", due: d(16) }),
    T({ title: "사무실 인터넷 약정 만료 확인", now: "", why: "", unk: "약정 끝나는 날", ask: "통신사 고객센터", due: d(24) }),
    T({ title: "부가세 자료 세무사 전달", who: "세무사 사무실", now: "", why: "", due: d(30), recur: "r2" }),
    T({ title: "명함 재주문", now: "끝", status: "완료", doneAt: d(-1), due: d(-1) })
  ];
  var I = function (o) { return Object.assign({ id: uid(), done: false, doneAt: "", carried: 0, u: now() }, o); };
  S.week = [
    I({ wk: PP, row: "그외", day: 1, text: "창고 재고표 엑셀 정리" }),
    I({ wk: P, row: "그외", day: 0, text: "창고 재고표 엑셀 정리", carried: 1 }),
    I({ wk: P, row: "중요", day: 2, text: "대표님 보고 — 연말 일정" , done: true, doneAt: iso(add(THIS_MON, -5)) }),
    I({ wk: P, row: "그외", day: 3, text: "복합기 토너 주문" }),
    I({ wk: P, row: "예정", day: 4, text: "내년 휴무일 공지 초안" }),
    I({ wk: W, row: "중요", day: 0, text: "주간 회의 — 이번 주 할 일 나누기" , done: TODAY > THIS_MON, doneAt: TODAY > THIS_MON ? W : "" })
  ];
  S.rules = [
    { id: "r1", name: "월말 매출 정리", cycle: "매월", next: iso(new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1)), dueDays: 5, on: true, u: now() },
    { id: "r2", name: "부가세 자료 세무사 전달", cycle: "분기", next: iso(add(TODAY, 80)), dueDays: 10, on: true, u: now() },
    { id: "r3", name: "도메인·호스팅 갱신 확인", cycle: "연 1회", next: iso(add(TODAY, 45)), dueDays: 14, on: true, u: now() },
    { id: "r4", name: "주간 회의 자료", cycle: "매주", next: iso(add(THIS_MON, 7)), dueDays: 0, on: true, u: now() }
  ];
  S.pins = [];
}

/* ── 정기 업무: 날짜가 되면 업무를 만든다 ── */
function nextOf(dateStr, cycle) {
  var d = parse(dateStr);
  var m = { "매주": 0, "매월": 1, "분기": 3, "반기": 6, "연 1회": 12 }[cycle];
  if (m === 0) return iso(add(d, 7));
  return iso(new Date(d.getFullYear(), d.getMonth() + m, d.getDate()));
}
function runRules() {
  var made = 0;
  S.rules.forEach(function (r) {
    if (!r.on || !r.next) return;
    var guard = 0;
    while (parse(r.next) <= TODAY && guard++ < 24) {
      S.tasks.push({ id: uid(), title: r.name, who: "", now: "", why: "", unk: "", ask: "", status: "진행", doneAt: "", row: "그외", recur: r.id,
        due: iso(add(parse(r.next), +r.dueDays || 0)), u: now() });
      r.next = nextOf(r.next, r.cycle); r.u = now(); made++;
    }
  });
  return made;
}

/* ── 화면 공통 ── */
var $ = function (id) { return document.getElementById(id); };
var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var toastT;
function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2600); }
function track(name) { try { if (window.gtag) window.gtag("event", name); } catch (e) {} }
function dd(due) {
  if (!due) return '<span class="dd none">기한 없음</span>';
  var n = days(TODAY, parse(due));
  if (n < 0) return '<span class="dd over">' + (-n) + '일 지남</span>';
  if (n === 0) return '<span class="dd soon">오늘</span>';
  if (n <= 7) return '<span class="dd soon">D-' + n + '</span>';
  return '<span class="dd later">D-' + n + '</span>';
}
var open = function () { return S.tasks.filter(function (t) { return t.status !== "완료"; }); };

var TAB = "today";
function render() {
  var over = open().filter(function (t) { return t.due && parse(t.due) < TODAY; }).length;
  $("nOver").textContent = over; $("nOver").classList.toggle("hide", !over);
  ({ today: rToday, week: rWeek, list: rList, rules: rRules })[TAB]();
}
document.querySelectorAll(".tabs button").forEach(function (b) {
  b.addEventListener("click", function () {
    TAB = b.dataset.tab;
    document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
    ["today", "week", "list", "rules"].forEach(function (k) { $("v-" + k).classList.toggle("hide", k !== TAB); });
    render(); track("weekly_tab_" + TAB);
  });
});

/* ── 오늘 ── */
function rToday() {
  var o = open(), over = [], soon = [], rest = [];
  o.forEach(function (t) {
    var n = t.due ? days(TODAY, parse(t.due)) : null;
    if (n !== null && n < 0) over.push(t); else if (n !== null && n <= 7) soon.push(t); else rest.push(t);
  });
  var byDue = function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : 1; };
  over.sort(byDue); soon.sort(byDue); rest.sort(byDue);
  var doneWk = S.tasks.filter(function (t) { return t.status === "완료" && t.doneAt && parse(t.doneAt) >= THIS_MON; }).length
    + S.week.filter(function (i) { return i.done && i.doneAt && parse(i.doneAt) >= THIS_MON; }).length;
  var carried = S.week.filter(function (i) { return i.wk === iso(THIS_MON) && i.carried > 0 && !i.done; }).length;
  var row = function (t) {
    var sub = [];
    if (t.now) sub.push(esc(t.now));
    if (!t.why) sub.push("<em>「왜」가 비어 있어요</em>");
    return '<div class="r"><div>' + dd(t.due) + '</div><div><span class="t">' + esc(t.title) + (t.recur ? ' <span class="tg rc">정기</span>' : "") + '</span><span class="s">' + sub.join(" · ") + '</span></div>' +
      '<button class="btn sm" data-done="' + t.id + '"><i class="ti ti-check"></i>완료</button></div>';
  };
  var list = function (a) { return a.length ? '<div class="rows">' + a.map(row).join("") + "</div>" : '<div class="rows"><div class="empty">없어요</div></div>'; };
  var h = '<div class="kpis">' +
    '<div class="kpi bad"><span>기한 지남</span><b>' + over.length + '</b></div>' +
    '<div class="kpi warn"><span>7일 안 마감</span><b>' + soon.length + '</b></div>' +
    '<div class="kpi warn"><span>지난주에서 이어받은 일</span><b>' + carried + '</b></div>' +
    '<div class="kpi good"><span>이번 주 끝낸 일</span><b>' + doneWk + '</b></div></div>';
  h += '<h2 class="sec">먼저 볼 것 <small>기한이 지났거나 7일 안에 끝나요</small></h2>' + list(over.concat(soon));
  h += '<h2 class="sec">앞으로 8주, 일이 몰리는 주 <small>주마다 마감 건수 · 점선(5건)을 넘는 주는 미리 나눠 잡으세요</small></h2>' + loadChart();
  h += '<h2 class="sec">그 밖에 진행 중 <small>' + rest.length + '건</small></h2>' + list(rest);
  var up = [];
  S.rules.forEach(function (r) { if (r.on && r.next && days(TODAY, parse(r.next)) <= 60) up.push(r); });
  up.sort(function (a, b) { return a.next < b.next ? -1 : 1; });
  h += '<h2 class="sec">다가오는 정기 업무 <small>60일 안에 저절로 생겨요</small></h2>' + (up.length ? '<div class="rows">' + up.map(function (r) {
    return '<div class="r"><div><span class="dd later">' + md(r.next) + '</span></div><div><span class="t">' + esc(r.name) + '</span><span class="s">' + esc(r.cycle) + " · 생기면 기한 " + (r.dueDays || 0) + "일</span></div><span></span></div>";
  }).join("") + "</div>" : '<div class="rows"><div class="empty">없어요</div></div>');
  $("v-today").innerHTML = h;
}
function loadChart() {
  var cols = [], max = 5;
  for (var k = 0; k < 8; k++) {
    var a = add(THIS_MON, k * 7), b = add(a, 6), wk = iso(a);
    var n = open().filter(function (t) { var d = parse(t.due); return d && d >= a && d <= b; }).length +
      S.week.filter(function (i) { return i.wk === wk && !i.done; }).length;
    if (k === 0) n += open().filter(function (t) { var d = parse(t.due); return d && d < a; }).length;
    cols.push({ n: n, lab: k === 0 ? "이번 주" : (a.getMonth() + 1) + "/" + a.getDate() }); if (n > max) max = n;
  }
  var H = 96, line = Math.round(5 / max * H);
  return '<div class="load">' + cols.map(function (c) {
    return '<div class="col"><span class="num">' + c.n + '</span><div class="barv' + (c.n > 5 ? " hot" : "") + '" style="height:' + Math.max(4, Math.round(c.n / max * H)) + 'px"></div><span class="lab">' + c.lab + "</span></div>";
  }).join("") + '<div class="line" style="bottom:' + (line + 26) + 'px"><span>5건</span></div></div>';
}
$("v-today").addEventListener("click", function (e) {
  var b = e.target.closest("[data-done]"); if (!b) return;
  var t = S.tasks.find(function (x) { return x.id === b.dataset.done; });
  t.status = "완료"; t.doneAt = iso(TODAY); t.u = now(); changed("완료로 바꿨어요. 주간 업무 표에는 이번 주에 남아요.");
});

/* ── 주간 업무 ── */
var WK = new Date(THIS_MON);
function pinOf(wk, id) { return S.pins.find(function (p) { return p.wk === wk && p.id === id; }); }
function weekItems(mon) {
  var wk = iso(mon), fri = add(mon, 4), out = [];
  S.week.filter(function (i) { return i.wk === wk; }).forEach(function (i) {
    out.push({ kind: "m", id: i.id, row: i.row, day: i.day, text: i.text, done: i.done, doneAt: i.doneAt, carried: i.carried });
  });
  S.tasks.forEach(function (t) {
    var d = parse(t.due), base = null;
    if (t.status === "완료") {
      var dn = parse(t.doneAt);
      if (dn && dn >= mon && dn <= add(mon, 6)) base = { row: t.row || "그외", day: Math.min(4, (dn.getDay() + 6) % 7) };
    } else if (d && d >= mon && d <= add(mon, 6)) base = { row: t.row || "그외", day: Math.min(4, (d.getDay() + 6) % 7) };
    else if (d && d < mon && days(d, mon) <= 21 && wk === iso(THIS_MON)) base = { row: "진행 중", day: 0, over: true };
    else if (d && d > fri && days(fri, d) <= 14) base = { row: "예정", day: 4 };
    else if (!d && wk === iso(THIS_MON)) base = { row: "진행 중", day: 0 };
    if (!base) return;
    var p = pinOf(wk, t.id); if (p && p.hide) return;
    out.push({ kind: "a", id: t.id, row: p ? p.row : base.row, day: p ? p.day : base.day, text: t.title, sub: t.who, due: t.due, over: base.over || (d && d < TODAY),
      done: t.status === "완료", doneAt: t.doneAt, recur: !!t.recur });
  });
  return out;
}
function rWeek() {
  var wk = iso(WK), prev = iso(add(WK, -7)), items = weekItems(WK);
  var hidden = S.pins.filter(function (p) { return p.wk === wk && p.hide; }).length;
  var leftover = S.week.filter(function (i) { return i.wk === prev && !i.done; });
  var already = S.week.some(function (i) { return i.wk === wk && i.carried > 0; });
  var h = '<div class="wkbar"><button class="btn" data-w="-1" aria-label="이전 주"><i class="ti ti-chevron-left"></i></button><h3>' + weekName(WK) +
    '</h3><button class="btn" data-w="1" aria-label="다음 주"><i class="ti ti-chevron-right"></i></button>' +
    (wk !== iso(THIS_MON) ? '<button class="btn sm" data-w="0">이번 주로</button>' : "") +
    '<span class="sp"></span><button class="btn" id="carry" data-track="weekly_carry"><i class="ti ti-arrow-forward-up"></i>지난주에서 이어받기</button></div>';
  if (leftover.length && !already) h += '<div class="ask"><i class="ti ti-info-circle"></i>지난주에 못 끝낸 일이 ' + leftover.length + '건 있어요. 「이어받음」 표시를 달아 이번 주로 가져올까요?<button class="btn sm pri" id="carry2">가져오기</button></div>';
  h += '<div class="gridwrap"><table class="wk"><thead><tr><th class="rh"></th>' + DAYN.map(function (n, i) {
    var d = add(WK, i); return '<th class="' + (iso(d) === iso(TODAY) ? "today" : "") + '">' + n + " " + (d.getMonth() + 1) + "/" + d.getDate() + "</th>";
  }).join("") + "</tr></thead><tbody>";
  ROWS.forEach(function (r) {
    h += '<tr><th class="rh">' + r + "</th>";
    for (var d = 0; d < 5; d++) {
      h += '<td class="cell" data-row="' + r + '" data-day="' + d + '">' + items.filter(function (i) { return i.row === r && i.day === d; }).map(card).join("") +
        '<button class="addc" data-add>+ 적기</button></td>';
    }
    h += "</tr>";
  });
  h += "</tbody></table></div>";
  h += '<div class="legend"><span><i style="background:var(--accent)"></i>업무 목록에서 저절로 올라온 일</span><span><i style="background:var(--success)"></i>정기 업무</span><span><i style="background:var(--text-disabled)"></i>직접 적은 일</span>' +
    (hidden ? '<span>이번 주 표에서 숨긴 일 ' + hidden + '건 <button class="btn sm" id="unhide">되살리기</button></span>' : "") + "</div>";
  h += '<p class="note">카드를 끌어 다른 칸에 놓을 수 있어요. 끝낸 일은 지워지지 않고 취소선으로 그 주에 남아요 — 「이번 주에 뭘 끝냈지?」에 바로 답할 수 있게요.</p>';
  $("v-week").innerHTML = h;
}
function card(i) {
  var tags = [];
  if (i.carried > 0) tags.push('<span class="tg carry" title="' + (i.carried + 1) + '주째">이어받음</span>');
  if (i.recur) tags.push('<span class="tg rc">정기</span>');
  if (i.kind === "a" && i.due && !i.done) tags.push('<span class="tg ' + (i.over ? "over" : "due") + '">기한 ' + md(i.due) + "</span>");
  if (i.done && i.doneAt) tags.push('<span class="tg fin">완료 ' + md(i.doneAt) + "</span>");
  var cls = "cd" + (i.kind === "a" ? (i.recur ? " recur" : " auto") : "") + (i.done ? " done" : "");
  return '<div class="' + cls + '" draggable="' + !i.done + '" data-kind="' + i.kind + '" data-id="' + i.id + '">' +
    '<span class="tx"' + (i.kind === "m" && !i.done ? ' contenteditable="true"' : "") + ">" + esc(i.text) + "</span>" +
    (i.sub ? '<span class="tg" style="margin-top:3px">' + esc(i.sub) + "</span>" : "") +
    (tags.length ? '<div class="tags">' + tags.join("") + "</div>" : "") +
    '<div class="ops">' + (i.done ? "" : '<button data-op="l" title="앞 요일">◀</button><button data-op="r" title="뒤 요일">▶</button><button data-op="u" title="위 칸">▲</button><button data-op="d" title="아래 칸">▼</button>') +
    '<button data-op="ok" title="' + (i.done ? "다시 진행 중으로" : "끝냄") + '">' + (i.done ? "↺" : "✓") + '</button><button data-op="x" title="' + (i.kind === "m" ? "지우기" : "이번 주 표에서만 숨기기") + '">✕</button></div></div>';
}
function placeItem(kind, id, row, day) {
  var wk = iso(WK);
  if (kind === "m") { var m = S.week.find(function (x) { return x.id === id; }); m.row = row; m.day = day; m.u = now(); }
  else { var p = pinOf(wk, id); if (!p) { p = { wk: wk, id: id }; S.pins.push(p); } p.row = row; p.day = day; p.hide = false; p.u = now(); }
  changed();
}
function carryOver() {
  var wk = iso(WK), prev = iso(add(WK, -7)), n = 0;
  var have = S.week.filter(function (i) { return i.wk === wk; }).map(function (i) { return i.text.trim(); });
  var seen = {};
  S.week.filter(function (i) { return i.wk === prev && !i.done; }).forEach(function (i) {
    var k = i.text.trim(); if (!k || seen[k] || have.indexOf(k) >= 0) return; seen[k] = 1;
    S.week.push({ id: uid(), wk: wk, row: i.row, day: 0, text: i.text, done: false, doneAt: "", carried: (i.carried || 0) + 1, u: now() }); n++;
  });
  changed(n ? n + "건을 이어받았어요. 몇 주째인지는 「이어받음」에 마우스를 올리면 보여요." : "이어받을 일이 없어요. 지난주 일은 모두 끝났거나 이미 가져왔어요.");
}
var V = $("v-week");
V.addEventListener("click", function (e) {
  var w = e.target.closest("[data-w]");
  if (w) { WK = w.dataset.w === "0" ? new Date(THIS_MON) : add(WK, 7 * +w.dataset.w); return rWeek(); }
  if (e.target.closest("#carry") || e.target.closest("#carry2")) return carryOver();
  if (e.target.closest("#unhide")) { S.pins.forEach(function (p) { if (p.wk === iso(WK)) p.hide = false; }); return changed(); }
  var a = e.target.closest("[data-add]");
  if (a) {
    var td = a.closest("td"), it = { id: uid(), wk: iso(WK), row: td.dataset.row, day: +td.dataset.day, text: "", done: false, doneAt: "", carried: 0, u: now() };
    S.week.push(it); rWeek();
    var el = V.querySelector('[data-id="' + it.id + '"] .tx'); if (el) el.focus();
    return;
  }
  var op = e.target.closest("[data-op]"); if (!op) return;
  var c = op.closest(".cd"), kind = c.dataset.kind, id = c.dataset.id, td2 = c.closest("td");
  var row = ROWS.indexOf(td2.dataset.row), day = +td2.dataset.day;
  switch (op.dataset.op) {
    case "l": return placeItem(kind, id, ROWS[row], Math.max(0, day - 1));
    case "r": return placeItem(kind, id, ROWS[row], Math.min(4, day + 1));
    case "u": return placeItem(kind, id, ROWS[Math.max(0, row - 1)], day);
    case "d": return placeItem(kind, id, ROWS[Math.min(ROWS.length - 1, row + 1)], day);
    case "ok":
      if (kind === "m") { var m = S.week.find(function (x) { return x.id === id; }); m.done = !m.done; m.doneAt = m.done ? iso(TODAY) : ""; m.u = now(); }
      else { var t = S.tasks.find(function (x) { return x.id === id; }); var d = t.status !== "완료"; t.status = d ? "완료" : "진행"; t.doneAt = d ? iso(TODAY) : ""; t.u = now(); }
      return changed();
    case "x":
      if (kind === "m") S.week = S.week.filter(function (x) { return x.id !== id; });
      else { var p = pinOf(iso(WK), id); if (!p) { p = { wk: iso(WK), id: id, row: ROWS[row], day: day }; S.pins.push(p); } p.hide = true; p.u = now(); }
      return changed(kind === "m" ? "" : "이번 주 표에서만 숨겼어요. 업무 목록에는 그대로 있어요.");
  }
});
V.addEventListener("focusout", function (e) {
  var tx = e.target.closest && e.target.closest(".tx[contenteditable]"); if (!tx) return;
  var id = tx.closest(".cd").dataset.id, m = S.week.find(function (x) { return x.id === id; }); if (!m) return;
  var v = tx.textContent.trim();
  if (!v) { S.week = S.week.filter(function (x) { return x !== m; }); return changed(); }
  if (v !== m.text) { m.text = v; m.u = now(); changed(); }
});
V.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.matches(".tx[contenteditable]")) { e.preventDefault(); e.target.blur(); } });
var drag = null;
V.addEventListener("dragstart", function (e) {
  var c = e.target.closest && e.target.closest(".cd"); if (!c || document.activeElement && document.activeElement.isContentEditable) { e.preventDefault(); return; }
  drag = { kind: c.dataset.kind, id: c.dataset.id }; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", c.dataset.id); } catch (x) {}
});
V.addEventListener("dragover", function (e) { var td = e.target.closest("td.cell"); if (!td || !drag) return; e.preventDefault(); V.querySelectorAll(".drop-on").forEach(function (x) { x.classList.remove("drop-on"); }); td.classList.add("drop-on"); });
V.addEventListener("drop", function (e) { var td = e.target.closest("td.cell"); if (!td || !drag) return; e.preventDefault(); var d = drag; drag = null; placeItem(d.kind, d.id, td.dataset.row, +td.dataset.day); });
V.addEventListener("dragend", function () { drag = null; V.querySelectorAll(".drop-on").forEach(function (x) { x.classList.remove("drop-on"); }); });

/* ── 업무 목록 (카드 04의 네 칸) ── */
var LF = "open", NEWID = null;
var COLS = [["title", "일"], ["who", "상대"], ["now", "지금 어디까지"], ["why", "왜 이렇게 했나"], ["unk", "아직 모르는 것"], ["ask", "막히면 누구에게"]];
function rList() {
  var rows = S.tasks.filter(function (t) { return LF === "all" || (LF === "open" ? t.status !== "완료" : t.status === "완료"); });
  rows.sort(function (a, b) { if (a.id === NEWID) return -1; if (b.id === NEWID) return 1; return (a.due || "9999") < (b.due || "9999") ? -1 : 1; });
  var h = '<div class="lbar"><div class="seg">' + [["open", "진행 중"], ["done", "끝낸 일"], ["all", "전체"]].map(function (f) {
    return '<button data-f="' + f[0] + '" class="' + (LF === f[0] ? "on" : "") + '">' + f[1] + "</button>"; }).join("") +
    '</div><span class="sp"></span><button class="btn pri" id="newT" data-track="weekly_new"><i class="ti ti-plus"></i>새 업무</button></div>';
  h += '<div class="tablewrap" style="overflow:auto"><table class="ed"><thead><tr>' + COLS.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") +
    "<th>기한</th><th>구분</th><th>상태</th></tr></thead><tbody>";
  h += rows.map(function (t) {
    return '<tr data-id="' + t.id + '" class="' + (t.status === "완료" ? "done" : "") + (t.id === NEWID ? " new" : "") + '">' + COLS.map(function (c) {
      return '<td class="' + (c[0] === "why" && !t.why && t.status !== "완료" ? "why-empty" : "") + '"><span contenteditable="true" data-k="' + c[0] + '">' + esc(t[c[0]]) + "</span></td>";
    }).join("") + '<td><input type="date" data-k="due" value="' + esc(t.due || "") + '"></td><td><select data-k="row">' + ROWS.map(function (r) {
      return "<option" + (t.row === r ? " selected" : "") + ">" + r + "</option>"; }).join("") + '</select></td><td><select data-k="status"><option' + (t.status !== "완료" ? " selected" : "") + ">진행</option><option" + (t.status === "완료" ? " selected" : "") + ">완료</option></select></td></tr>";
  }).join("") || '<tr><td colspan="9" class="empty">없어요</td></tr>';
  h += "</tbody></table></div>";
  h += '<p class="note">주황 칸은 「왜 이렇게 했나」가 비어 있는 일이에요. 순서는 지난 자료로 따라 할 수 있지만, 이유는 그 사람이 나가면 같이 사라져요. 칸을 눌러 바로 고치면 저장돼요.</p>';
  $("v-list").innerHTML = h;
}
var L = $("v-list");
L.addEventListener("click", function (e) {
  var f = e.target.closest("[data-f]"); if (f) { LF = f.dataset.f; return rList(); }
  if (e.target.closest("#newT")) {
    var t = { id: uid(), title: "", who: "", now: "", why: "", unk: "", ask: "", due: "", status: "진행", doneAt: "", row: "그외", recur: "", u: now() };
    S.tasks.push(t); NEWID = t.id; LF = "open"; rList();
    var el = L.querySelector('tr[data-id="' + t.id + '"] [data-k="title"]'); if (el) el.focus();
  }
});
L.addEventListener("focusout", function (e) {
  var el = e.target; if (!el.matches || !el.matches("[contenteditable][data-k]")) return;
  var t = S.tasks.find(function (x) { return x.id === el.closest("tr").dataset.id; }); var v = el.textContent.trim();
  if (t && t[el.dataset.k] !== v) { t[el.dataset.k] = v; t.u = now(); changed(null, true); }
});
L.addEventListener("change", function (e) {
  var el = e.target; if (!el.dataset || !el.dataset.k) return;
  var t = S.tasks.find(function (x) { return x.id === el.closest("tr").dataset.id; }); if (!t) return;
  t[el.dataset.k] = el.value;
  if (el.dataset.k === "status") t.doneAt = el.value === "완료" ? iso(TODAY) : "";
  t.u = now(); changed();
});
L.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.matches("[contenteditable]")) { e.preventDefault(); e.target.blur(); } });

/* ── 정기 업무 ── */
function rRules() {
  var h = '<div class="lbar"><span>한 번 적어 두면 날짜가 됐을 때 업무 목록에 저절로 생겨요.</span><span class="sp"></span><button class="btn pri" id="newR"><i class="ti ti-plus"></i>정기 업무 추가</button></div>';
  h += '<div class="tablewrap" style="overflow:auto"><table class="rl"><thead><tr><th>업무</th><th>주기</th><th>다음 날짜</th><th>기한(일)</th><th>사용</th><th></th></tr></thead><tbody>';
  h += S.rules.map(function (r) {
    return '<tr data-id="' + r.id + '"><td><input type="text" data-k="name" value="' + esc(r.name) + '"></td><td><select data-k="cycle">' + CYCLES.map(function (c) {
      return "<option" + (r.cycle === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + '</select></td><td><input type="date" data-k="next" value="' + esc(r.next) +
      '"></td><td><input type="number" min="0" style="width:64px" data-k="dueDays" value="' + esc(r.dueDays) + '"></td><td><input type="checkbox" data-k="on"' + (r.on ? " checked" : "") +
      '></td><td><button class="btn sm" data-del="' + r.id + '">빼기</button></td></tr>';
  }).join("") || '<tr><td colspan="6" class="empty">없어요</td></tr>';
  h += "</tbody></table></div><p class=\"note\">며칠 못 열어도 밀린 회차를 차례로 채워 줘요. 「사용」을 끄면 지우지 않고 쉬어 가요.</p>";
  $("v-rules").innerHTML = h;
}
var R = $("v-rules");
R.addEventListener("change", function (e) {
  var el = e.target; if (!el.dataset.k) return;
  var r = S.rules.find(function (x) { return x.id === el.closest("tr").dataset.id; });
  r[el.dataset.k] = el.type === "checkbox" ? el.checked : el.dataset.k === "dueDays" ? +el.value : el.value; r.u = now();
  var n = runRules(); changed(n ? "정기 업무 " + n + "건이 업무 목록에 생겼어요." : null, true);
});
R.addEventListener("click", function (e) {
  if (e.target.closest("#newR")) { S.rules.push({ id: uid(), name: "새 정기 업무", cycle: "매월", next: iso(add(TODAY, 7)), dueDays: 3, on: true, u: now() }); return changed(); }
  var d = e.target.closest("[data-del]"); if (d) { S.rules = S.rules.filter(function (r) { return r.id !== d.dataset.del; }); changed(); }
});

/* ── 엑셀 파일로 읽고 쓰기 ── */
var SHEETS = {
  tasks: ["업무", [["id", "번호"], ["title", "일"], ["who", "상대"], ["now", "지금 어디까지"], ["why", "왜 이렇게 했나"], ["unk", "아직 모르는 것"], ["ask", "막히면 누구에게"], ["due", "기한"], ["status", "상태"], ["doneAt", "끝낸 날"], ["row", "구분"], ["recur", "정기 번호"], ["u", "고친 때"]]],
  week: ["주간표", [["id", "번호"], ["wk", "주(월요일)"], ["row", "구분"], ["day", "요일"], ["text", "내용"], ["done", "끝냄"], ["doneAt", "끝낸 날"], ["carried", "이어받은 횟수"], ["u", "고친 때"]]],
  rules: ["정기업무", [["id", "번호"], ["name", "업무"], ["cycle", "주기"], ["next", "다음 날짜"], ["dueDays", "기한(일)"], ["on", "사용"], ["u", "고친 때"]]],
  pins: ["화면설정", [["wk", "주(월요일)"], ["id", "업무 번호"], ["row", "구분"], ["day", "요일"], ["hide", "숨김"], ["u", "고친 때"]]]
};
function toBook() {
  var wb = XLSX.utils.book_new();
  var guide = [["리플로 · 주간 업무 화면 데이터 파일"], [""], ["이 파일은 https://refloworks.com/tools/weekly/ 화면에서 열어 쓰는 데이터예요."], ["엑셀로 열어 고쳐도 됩니다. 「번호」와 「고친 때」 열은 지우지 마세요 — 여러 사람이 고친 것을 합칠 때 씁니다."],
    ["팀이 같이 쓰려면 이 파일을 공유 폴더(NAS·구글 드라이브·원드라이브)에 두고, 각자 화면에서 이 파일을 여세요."], [""], ["마지막 저장: " + new Date().toLocaleString("ko-KR")]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), "안내");
  Object.keys(SHEETS).forEach(function (k) {
    var cols = SHEETS[k][1];
    var aoa = [cols.map(function (c) { return c[1]; })].concat(S[k].map(function (o) {
      return cols.map(function (c) { var v = o[c[0]]; if (typeof v === "boolean") return v ? "Y" : ""; if (k === "week" && c[0] === "day") return DAYN[v] || ""; return v == null ? "" : v; });
    }));
    var ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = cols.map(function (c) { return { wch: Math.max(8, c[1].length * 2 + 2) }; });
    XLSX.utils.book_append_sheet(wb, ws, SHEETS[k][0]);
  });
  return wb;
}
function fromBook(wb) {
  var out = { tasks: [], week: [], rules: [], pins: [] }, got = false;
  Object.keys(SHEETS).forEach(function (k) {
    var ws = wb.Sheets[SHEETS[k][0]]; if (!ws) return; got = true;
    var cols = SHEETS[k][1], rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    var head = rows.shift() || [];
    rows.forEach(function (r) {
      var o = {}; cols.forEach(function (c) { var i = head.indexOf(c[1]); o[c[0]] = i >= 0 ? String(r[i]).trim() : ""; });
      if (!o.id && k !== "pins") o.id = uid();
      if (k === "week") { o.day = Math.max(0, DAYN.indexOf(o.day)); o.done = o.done === "Y"; o.carried = +o.carried || 0; }
      if (k === "rules") { o.on = o.on === "Y"; o.dueDays = +o.dueDays || 0; }
      if (k === "pins") { o.day = +o.day || 0; o.hide = o.hide === "Y"; }
      o.u = +o.u || 0;
      if (k === "tasks" && !o.title) return; if (k === "week" && !o.text) return;
      out[k].push(o);
    });
  });
  if (!got && wb.Sheets["주간보고"]) {            // 무료 양식 「주간 업무 보고」 (make_weekly.py) — 묶음 제목으로 찾는다
    var R = XLSX.utils.sheet_to_json(wb.Sheets["주간보고"], { header: 1, raw: false, defval: "" });
    var dstr = function (v) { v = String(v || "").replace(/\./g, "-").trim(); return /^\d{4}-\d{1,2}-\d{1,2}/.test(v) ? iso(parse(v)) : ""; };
    var wk = iso(THIS_MON), sec = "";
    for (var ri = 0; ri < R.length; ri++) { if (String(R[ri][2]).indexOf("주 시작일") >= 0 && R[ri + 1]) { var w0 = dstr(R[ri + 1][2]); if (w0) wk = iso(monday(parse(w0))); } }
    var prevWk = iso(add(parse(wk), -7));
    R.forEach(function (r) {
      var a0 = String(r[0] || "").trim();
      if (a0 === "이번 주 한 일" || a0 === "다음 주 할 일" || a0 === "막힌 것 · 요청") { sec = a0; return; }
      if (!sec || !a0 || a0 === "업무" || a0 === "내용" || a0 === "요약" || a0.indexOf("「몇 주째」") === 0) return;
      if (sec === "이번 주 한 일") {
        var st = String(r[2]).trim(), n = parseInt(r[3], 10) || 1, done = st === "완료";
        out.week.push({ id: uid(), wk: wk, row: st === "밀림" ? "진행 중" : "그외", day: 0, text: a0 + (r[1] ? " — " + String(r[1]).trim() : ""), done: done, doneAt: done ? wk : "", carried: Math.max(0, n - 1), u: now() });
      } else if (sec === "다음 주 할 일") {
        out.tasks.push({ id: uid(), title: a0, who: "", now: String(r[1] || "").trim(), why: "", unk: "", ask: "", due: dstr(r[4]), status: "진행", doneAt: "", row: "예정", recur: "", u: now() });
      } else {
        out.tasks.push({ id: uid(), title: a0, who: String(r[2] || "").trim(), now: "", why: "", unk: String(r[1] || "").trim(), ask: String(r[2] || "").trim(), due: dstr(r[4]), status: "진행", doneAt: "", row: "중요", recur: "", u: now() });
      }
    });
    out.fromReport = out.week.length + out.tasks.length; got = true;
    if (!out.fromReport) return null;
    return out;
  }
  if (!got) {                                    // 업무 인수인계서 양식의 「진행 중인 일」
    var ws = wb.Sheets["진행 중인 일"];
    if (!ws) return null;
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }), hi = rows.findIndex(function (r) { return r.indexOf("일") >= 0 && r.indexOf("기한") >= 0; });
    if (hi < 0) return null;
    var h = rows[hi], col = function (n) { return h.indexOf(n); };
    rows.slice(hi + 1).forEach(function (r) {
      var title = String(r[col("일")] || "").trim(); if (!title) return;
      var due = String(r[col("기한")] || "").replace(/\./g, "-").trim();
      out.tasks.push({ id: uid(), title: title, who: r[col("상대 (누구와)")] || "", now: r[col("어디까지 됐나")] || "", why: "", unk: "", ask: r[col("담당")] || "",
        due: /^\d{4}-\d{1,2}-\d{1,2}/.test(due) ? iso(parse(due)) : "", status: "진행", doneAt: "", row: "그외", recur: "", u: now() });
    });
    out.fromHandover = true;
  }
  return out;
}
function merge(other) {                          // 번호가 같으면 더 늦게 고친 쪽을 남긴다
  var n = 0;
  ["tasks", "week", "rules"].forEach(function (k) {
    var map = {}; S[k].forEach(function (o) { map[o.id] = o; });
    other[k].forEach(function (o) { var m = map[o.id]; if (!m) { S[k].push(o); n++; } else if ((o.u || 0) > (m.u || 0)) { Object.assign(m, o); n++; } });
  });
  other.pins.forEach(function (o) { var m = pinOf(o.wk, o.id); if (!m) S.pins.push(o); else if ((o.u || 0) > (m.u || 0)) Object.assign(m, o); });
  return n;
}

var FS = "showSaveFilePicker" in window, handle = null, lastMod = 0, fname = "", dirty = false, saving = false, saveT;
var TYPES = [{ description: "엑셀 파일", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }];
function pill() {
  var p = $("filePill"), on = !!handle;
  p.classList.toggle("on", on);
  p.querySelector("i").className = "ti " + (on ? "ti-cloud-check" : "ti-flask");
  $("fileTxt").textContent = on ? (fname + " · " + (dirty ? "저장 중…" : "자동 저장 켜짐 · " + new Date().toTimeString().slice(0, 5) + " 저장됨"))
    : fname ? fname + " · 고친 뒤 「저장」을 누르면 파일로 내려받아져요" : "체험 중 · 예시 데이터 (아직 저장 안 함)";
  $("saveTxt").textContent = handle ? "다른 이름으로 저장" : "내 PC에 저장";
}
function changed(msg, quiet) {
  dirty = true; if (!quiet) render(); else { var over = open().filter(function (t) { return t.due && parse(t.due) < TODAY; }).length; $("nOver").textContent = over; $("nOver").classList.toggle("hide", !over); }
  if (msg) toast(msg);
  if (handle) { pill(); clearTimeout(saveT); saveT = setTimeout(autosave, 700); }
}
async function bytes() { return XLSX.write(toBook(), { bookType: "xlsx", type: "array" }); }
async function autosave() {
  if (!handle || saving) return; saving = true;
  try {
    if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted" && (await handle.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("perm");
    var f = await handle.getFile();
    if (lastMod && f.lastModified !== lastMod) {
      var other = fromBook(XLSX.read(await f.arrayBuffer(), { type: "array" }));
      if (other) { var n = merge(other); if (n) { toast("그새 다른 사람이 고친 " + n + "건을 합쳐서 저장했어요."); render(); } }
    }
    var w = await handle.createWritable(); await w.write(await bytes()); await w.close();
    lastMod = (await handle.getFile()).lastModified; dirty = false; track("weekly_autosave");
  } catch (e) { toast("저장하지 못했어요. 파일이 다른 곳에서 열려 있으면 닫고 다시 해 주세요."); }
  saving = false; pill();
}
$("btnSave").addEventListener("click", async function () {
  if (FS) {
    try {
      var h = await window.showSaveFilePicker({ suggestedName: "우리팀-주간업무.xlsx", types: TYPES });
      handle = h; fname = h.name; lastMod = 0; dirty = true; pill(); await autosave();
      toast("저장했어요. 이제 고칠 때마다 이 파일에 바로 저장돼요."); track("weekly_saved_fs");
    } catch (e) { if (e.name !== "AbortError") toast("저장하지 못했어요."); }
  } else {
    XLSX.writeFile(toBook(), fname || "우리팀-주간업무.xlsx"); dirty = false; pill();
    toast("파일로 내려받았어요. 다음에 「파일 열기」로 그 파일을 고르면 이어서 써요."); track("weekly_saved_dl");
  }
});
async function loadFile(file, h) {
  try {
    var data = fromBook(XLSX.read(await file.arrayBuffer(), { type: "array" }));
    if (!data) return toast("이 파일에서 업무 표를 찾지 못했어요. 이 화면에서 저장한 파일이나 업무 인수인계서 양식을 골라 주세요.");
    S = { tasks: data.tasks, week: data.week, rules: data.rules, pins: data.pins };
    fname = file.name; dirty = false;
    if (data.fromReport) { handle = null; toast("주간 업무 보고 양식에서 " + data.fromReport + "건을 가져왔어요. 「내 PC에 저장」을 누르면 화면용 파일로 따로 저장돼요."); TAB = "week"; document.querySelector('[data-tab="week"]').click(); }
    else if (data.fromHandover) { handle = null; toast("인수인계서의 「진행 중인 일」 " + data.tasks.length + "건을 가져왔어요. 「왜」 칸을 채우고 저장해 보세요."); TAB = "list"; document.querySelector('[data-tab="list"]').click(); }
    else { handle = h || null; lastMod = h ? file.lastModified : 0; toast("열었어요. 업무 " + S.tasks.length + "건" + (h ? " · 고치면 이 파일에 바로 저장돼요." : "")); }
    var n = runRules(); if (n) changed("정기 업무 " + n + "건이 생겼어요.", true);
    WK = new Date(THIS_MON); render(); pill(); track("weekly_opened");
  } catch (e) { toast("파일을 읽지 못했어요."); }
}
$("btnOpen").addEventListener("click", async function () {
  if ("showOpenFilePicker" in window) {
    try { var hs = await window.showOpenFilePicker({ types: TYPES }); var h = hs[0]; await loadFile(await h.getFile(), h); }
    catch (e) { if (e.name !== "AbortError") toast("파일을 열지 못했어요."); }
  } else $("pick").click();
});
$("pick").addEventListener("change", function (e) { var f = e.target.files[0]; if (f) loadFile(f, null); e.target.value = ""; });
window.addEventListener("beforeunload", function (e) { if (dirty && !handle && fname) { e.preventDefault(); e.returnValue = ""; } });

/* ── 시작 ── */
seed(); runRules(); render(); pill();
window.__weekly = { S: function () { return S; }, merge: merge, fromBook: fromBook, toBook: toBook, weekItems: weekItems, carryOver: carryOver };
})();
