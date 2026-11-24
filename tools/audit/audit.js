/* 내 파일 검산기 — 브라우저 안에서만 돈다. 파일을 어디로도 보내지 않는다.
   ------------------------------------------------------------------
   보는 것 (이것만 본다. 값이 옳은지는 보지 않는다)
   1. 합계·소계 줄이 자료 사이에 섞여 있는가        → 그대로 더하면 부풀어진다
   2. 날짜 열에 날짜가 아닌 칸이 있는가              → 기간으로 집계하면 빠진다
   3. 숫자 열에 글자가 든 칸이 있는가                → 합계에서 빠진다
   4. 모든 칸이 같은 줄이 두 번 이상 있는가          → 두 번 더해질 수 있다 (실제 두 건일 수도 있다)
   5. 같은 이름이 표기만 다르게 적혀 있는가          → 따로 집계된다
   지키는 것: 고치지 않는다. 찾아서 몇 번째 줄인지 보여 주기만 한다.
   합치기 도구(merge.js)의 읽기·머리글 찾기를 그대로 쓴다.
   ------------------------------------------------------------------ */
(function (root) {
  "use strict";
  var M = root.합치기도구;
  var 합계말 = ["합계", "소계", "총계", "누계", "총합", "total", "subtotal", "sum"];

  function 글자(c) { return M.글자(c); }
  function 빈칸(c) { return 글자(c) === ""; }

  function 합계줄(row) {
    for (var i = 0; i < row.length; i++) {
      if (빈칸(row[i])) continue;
      if (row[i].t !== "s") return false;
      var t = 글자(row[i]).replace(/[\s:：\[\]()【】<>]/g, "").toLowerCase();
      return 합계말.some(function (w) { return t === w || t.indexOf(w) === 0 || (t.length <= w.length + 3 && t.slice(-w.length) === w); });
    }
    return false;
  }

  function 진짜날짜(c, XLSX) {
    if (!c) return false;
    if (c.t === "d") return true;
    return c.t === "n" && !!c.z && XLSX.SSF.is_date(c.z);
  }
  // 엑셀이 CSV 를 열 때 날짜로 알아듣는 모양
  function 표준날짜글자(s) { return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(s); }

  // 사람 눈에는 숫자인 글자 — "1,200원", " 3 500 ", "₩12,000", "45건"
  function 숫자처럼(s) {
    var t = s.replace(/[\s,]/g, "").replace(/^[₩\\$]/, "").replace(/(원|건|개|명|%|krw)$/i, "");
    if (/^\(\d+(\.\d+)?\)$/.test(t)) t = "-" + t.slice(1, -1);          // (1200) → -1200
    if (/^[-+]?\d+(\.\d+)?$/.test(t)) return Number(t);
    return null;
  }

  // 표기만 다른 이름을 한데 묶는 열쇠
  function 느슨(s) {
    return s.normalize("NFKC").toLowerCase()
      .replace(/주식회사|유한회사|\(주\)|㈜|\(유\)/g, "")
      .replace(/[\s._\-·,()]/g, "");
  }

  function 열이름들(row) {
    var 본 = {};
    return row.map(function (c, i) {
      var n = 글자(c);
      if (!n) return "";
      if (본[n]) { 본[n]++; return n + "_" + 본[n]; }
      본[n] = 1; return n;
    });
  }

  /* 검산
     s: 합치기도구.읽기()가 준 시트 하나 (머리글행은 사용자가 고쳤을 수 있다)
     opts: { csv: 파일이 CSV 인가 } */
  function 검산(s, XLSX, opts) {
    opts = opts || {};
    var csv = !!opts.csv, h = s.머리글행, rows = s.줄들;
    var 결과 = { 머리글행: h + 1, 열: [], 줄수: { 전체: 0, 빈: 0, 합계: 0, 자료: 0 }, 찾은것: [], 숫자열: [], 문제: "" };
    if (h < 0 || h >= rows.length) { 결과.문제 = "머리글을 찾지 못했어요"; return 결과; }

    var 이름 = 열이름들(rows[h]), 열수 = 이름.length;
    var 자료 = [], 합계행 = [];                         // {r: 0부터, row}
    for (var r = h + 1; r < rows.length; r++) {
      var row = rows[r];
      결과.줄수.전체++;
      if (row.every(빈칸)) { 결과.줄수.빈++; continue; }
      if (합계줄(row)) { 결과.줄수.합계++; 합계행.push({ r: r, row: row }); continue; }
      결과.줄수.자료++;
      자료.push({ r: r, row: row });
    }

    // ── 열마다 종류를 정한다 (자료 줄만 본다) ──
    var 종류 = [], 날짜기준 = [];
    for (var c = 0; c < 열수; c++) {
      var n = 0, 숫자 = 0, 진짜 = 0, 글자날 = 0;
      자료.forEach(function (o) {
        var cell = o.row[c];
        if (빈칸(cell)) return;
        n++;
        if (진짜날짜(cell, XLSX)) 진짜++;
        else if (cell.t === "n") 숫자++;
        else if (표준날짜글자(글자(cell))) 글자날++;
      });
      var k = "글자";
      if (!이름[c] || n === 0) k = "없음";
      else if ((진짜 + 글자날) / n >= 0.6) k = "날짜";
      else if (숫자 / n >= 0.6) k = "숫자";
      종류.push(k);
      날짜기준.push(csv || 글자날 > 진짜 ? "글자" : "진짜");
      결과.열.push({ 이름: 이름[c], 종류: k, 값있는칸: n });
    }

    // ── 1. 합계·소계 줄 ──
    if (합계행.length) {
      결과.찾은것.push({
        종류: "합계줄", 건수: 합계행.length,
        줄: 합계행.map(function (o) { return { 행: o.r + 1, 보임: 줄보임(o.row) }; })
      });
    }

    // ── 2. 날짜 열의 날짜 아닌 칸 ──
    for (c = 0; c < 열수; c++) {
      if (종류[c] !== "날짜") continue;
      var 못읽음 = [];
      자료.forEach(function (o) {
        var cell = o.row[c];
        if (빈칸(cell)) return;
        var ok = 날짜기준[c] === "진짜" ? 진짜날짜(cell, XLSX) : (진짜날짜(cell, XLSX) || 표준날짜글자(글자(cell)));
        if (!ok) 못읽음.push({ 행: o.r + 1, 값: 글자(cell) });
      });
      if (못읽음.length) 결과.찾은것.push({ 종류: "날짜", 열: 이름[c], 건수: 못읽음.length, 줄: 못읽음 });
      if (!csv && 날짜기준[c] === "글자") 결과.찾은것.push({ 종류: "날짜전부글자", 열: 이름[c], 건수: 결과.열[c].값있는칸, 줄: [] });
    }

    // ── 3. 숫자 열의 글자 칸 + 열마다 더한 값 ──
    for (c = 0; c < 열수; c++) {
      if (종류[c] !== "숫자") continue;
      var 글자칸 = [], 그대로 = 0, 걸러 = 0, 빠진 = 0, 빠진건 = 0;
      자료.forEach(function (o) {
        var cell = o.row[c];
        if (빈칸(cell)) return;
        if (cell.t === "n") { 그대로 += cell.v; 걸러 += cell.v; return; }
        var 원 = 글자(cell);
        if (/^[-–—]$/.test(원)) return;                                  // 「-」 는 0 으로 쓰는 관행
        var v = 숫자처럼(원);
        if (v !== null) { 빠진 += v; 빠진건++; }
        글자칸.push({ 행: o.r + 1, 값: 원, 읽으면: v });
      });
      합계행.forEach(function (o) { var cell = o.row[c]; if (cell && cell.t === "n") 그대로 += cell.v; });
      결과.숫자열.push({ 열: 이름[c], 그대로: 그대로, 걸러: 걸러, 글자라빠진: 빠진, 글자라빠진건: 빠진건, 글자칸: 글자칸.length });
      if (글자칸.length) 결과.찾은것.push({ 종류: "숫자", 열: 이름[c], 건수: 글자칸.length, 줄: 글자칸, 빠진합: 빠진, 빠진건: 빠진건 });
    }

    // ── 4. 모든 칸이 같은 줄 ──
    var 본줄 = {}, 묶음 = [];
    자료.forEach(function (o) {
      var 찬 = 0, key = o.row.map(function (cell) { var t = 글자(cell); if (t) 찬++; return t; }).join("\u0001");
      if (찬 < 2) return;
      if (본줄[key]) 본줄[key].행.push(o.r + 1);
      else { 본줄[key] = { 행: [o.r + 1], 보임: 줄보임(o.row) }; 묶음.push(본줄[key]); }
    });
    var 겹침 = 묶음.filter(function (g) { return g.행.length > 1; });
    if (겹침.length) {
      결과.찾은것.push({
        종류: "중복", 건수: 겹침.reduce(function (a, g) { return a + g.행.length - 1; }, 0),
        줄: 겹침.map(function (g) { return { 행: g.행, 보임: g.보임 }; })
      });
    }

    // ── 5. 표기만 다른 이름 ──
    for (c = 0; c < 열수; c++) {
      if (종류[c] !== "글자") continue;
      var 세기 = {}, 값수 = 0, 칸 = 0;
      자료.forEach(function (o) {
        var cell = o.row[c];
        if (!cell || cell.v === undefined || cell.v === null) return;
        var 원 = String(cell.v);                                       // 앞뒤 공백까지 그대로 본다
        if (원.trim() === "") return;
        칸++;
        if (!세기[원]) { 세기[원] = 0; 값수++; }
        세기[원]++;
      });
      if (칸 < 4 || 값수 > 칸 * 0.7) continue;                          // 되풀이되는 이름이 있는 열만
      var 그룹 = {};
      Object.keys(세기).forEach(function (원) {
        var k = 느슨(원);
        if (!k) return;
        (그룹[k] = 그룹[k] || []).push({ 값: 원, 건수: 세기[원] });
      });
      var 흔들림 = Object.keys(그룹).filter(function (k) { return 그룹[k].length > 1; })
        .map(function (k) { return 그룹[k].sort(function (a, b) { return b.건수 - a.건수; }); });
      if (흔들림.length) 결과.찾은것.push({ 종류: "표기", 열: 이름[c], 건수: 흔들림.length, 줄: 흔들림 });
    }

    결과.깨끗 = 결과.찾은것.length === 0;
    return 결과;

    function 줄보임(row) {
      return row.map(글자).filter(function (t) { return t; }).slice(0, 5).join(" · ");
    }
  }

  root.검산도구 = { 검산: 검산, 합계줄: 합계줄, 숫자처럼: 숫자처럼, 느슨: 느슨, 표준날짜글자: 표준날짜글자 };
})(typeof window !== "undefined" ? window : globalThis);
