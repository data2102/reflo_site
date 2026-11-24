/* 엑셀 파일 합치기 — 브라우저 안에서만 돈다. 파일을 어디로도 보내지 않는다.
   ------------------------------------------------------------------
   지키는 것
   1. 열은 머리글 이름으로 맞춘다. 순서가 달라도 섞이지 않는다.
   2. 일부 파일에만 있는 열을 숨기지 않고 보여 준다.
   3. 뺀 줄(빈 줄, 합계 줄)은 세어서 적는다. 파일별 줄 수의 합 = 합친 줄 수.
   4. 값은 셀을 그대로 옮긴다. 날짜·금액 서식과 앞자리 0 을 건드리지 않는다.
   ------------------------------------------------------------------ */
(function (root) {
  "use strict";

  var 합계말 = ["합계", "소계", "총계", "누계", "total", "subtotal"];

  function 글자(cell) {
    if (!cell || cell.v === undefined || cell.v === null) return "";
    return String(cell.w !== undefined ? cell.w : cell.v).replace(/\s+/g, " ").trim();
  }

  function 빈칸(cell) { return 글자(cell) === ""; }

  // CSV 는 전부 글자로 읽은 뒤, 숫자가 분명한 것만 숫자로 바꾼다.
  // 앞자리 0 (00123, 010-…) 과 긴 번호(16자리 이상)는 글자로 둔다.
  function 숫자로(s) {
    var t = s.trim();
    if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t)) return Number(t);
    if (/^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ""));
    return null;
  }

  function 글자풀기(buf) {
    var u8 = new Uint8Array(buf);
    try { return new TextDecoder("utf-8", { fatal: true }).decode(u8); }
    catch (e) { return new TextDecoder("euc-kr").decode(u8); }      // 엑셀이 저장한 한글 CSV
  }

  /* 파일 하나 → [{파일, 시트, 줄들}]  줄들은 셀 객체의 2차원 배열 */
  function 읽기(name, buf, XLSX) {
    var csv = /\.(csv|txt|tsv)$/i.test(name), wb;
    if (csv) {
      wb = XLSX.read(글자풀기(buf).replace(/^﻿/, ""), { type: "string", raw: true });
    } else {
      wb = XLSX.read(buf, { type: "array", cellNF: true, cellDates: false });
    }
    return wb.SheetNames.map(function (sn) {
      var ws = wb.Sheets[sn], rows = [];
      if (ws && ws["!ref"]) {
        var rg = XLSX.utils.decode_range(ws["!ref"]);
        for (var r = rg.s.r; r <= rg.e.r; r++) {
          var row = [];
          for (var c = rg.s.c; c <= rg.e.c; c++) {
            var cell = ws[XLSX.utils.encode_cell({ r: r, c: c })];
            if (cell && csv && cell.t === "s") {
              var n = 숫자로(String(cell.v));
              if (n !== null) cell = { t: "n", v: n };
            }
            row.push(cell || null);
          }
          rows.push(row);
        }
      }
      var s = { 파일: name, 시트: sn, 줄들: rows };
      s.머리글행 = 머리글찾기(rows);
      return s;
    });
  }

  /* 머리글 줄 찾기 — 앞 20줄 가운데, 칸이 충분히 차 있고 전부 글자인 첫 줄. 0부터 센다. 없으면 -1 */
  function 머리글찾기(rows) {
    var top = rows.slice(0, 20), 찬 = top.map(function (r) {
      return r.filter(function (c) { return !빈칸(c); }).length;
    });
    var 최대 = Math.max.apply(null, 찬.concat([0]));
    if (최대 < 1) return -1;
    var 기준 = Math.max(Math.min(2, 최대), Math.ceil(최대 * 0.6));
    for (var i = 0; i < top.length; i++) {
      if (찬[i] < 기준) continue;
      var 전부글자 = top[i].every(function (c) { return 빈칸(c) || c.t === "s"; });
      if (전부글자) return i;
    }
    return 찬.indexOf(최대);
  }

  function 합계줄(row) {
    for (var i = 0; i < row.length; i++) {
      if (빈칸(row[i])) continue;
      var t = 글자(row[i]).replace(/\s/g, "").toLowerCase();
      return 합계말.some(function (w) { return t === w || t.indexOf(w) === 0; });
    }
    return false;
  }

  /* 합치기
     sources: 읽기()가 준 것 가운데 쓸 것들 (머리글행은 사용자가 고쳤을 수 있다)
     opts: { 출처열: true, 합계빼기: true, 별칭: {"거래처명": "거래처"} } */
  function 합치기(sources, opts) {
    opts = opts || {};
    var 별칭 = opts.별칭 || {};
    var 열 = [], 열번호 = {}, 열출처 = {}, 기록 = [], 줄 = [];

    function 열넣기(이름, si) {
      var 이름2 = 별칭[이름] || 이름;
      if (!(이름2 in 열번호)) { 열번호[이름2] = 열.length; 열.push(이름2); 열출처[이름2] = {}; }
      열출처[이름2][si] = true;
      return 열번호[이름2];
    }

    sources.forEach(function (s, si) {
      var h = s.머리글행, 로그 = { 파일: s.파일, 시트: s.시트, 머리글행: h + 1, 전체: 0, 빈줄: 0, 합계줄: 0, 가져옴: 0, 열: [] };
      기록.push(로그);
      if (h < 0 || h >= s.줄들.length) { 로그.문제 = "머리글을 찾지 못했어요"; return; }
      var 본 = {}, 자리 = [];
      s.줄들[h].forEach(function (c, ci) {
        var 이름 = 글자(c);
        if (!이름) { 자리.push(-1); return; }
        if (본[이름]) { 본[이름]++; 이름 = 이름 + "_" + 본[이름]; } else 본[이름] = 1;   // 같은 이름이 두 번
        로그.열.push(이름);
        자리.push(열넣기(이름, si));
      });
      for (var r = h + 1; r < s.줄들.length; r++) {
        var row = s.줄들[r];
        로그.전체++;
        if (row.every(빈칸)) { 로그.빈줄++; continue; }
        if (opts.합계빼기 !== false && 합계줄(row)) { 로그.합계줄++; continue; }
        var out = { 값: {}, si: si, 원행: r + 1 };
        var 머리없는값 = 0;
        row.forEach(function (c, ci) {
          if (빈칸(c)) return;
          if (자리[ci] === undefined || 자리[ci] < 0) { 머리없는값++; return; }
          out.값[자리[ci]] = c;
        });
        if (머리없는값) 로그.머리없는칸 = (로그.머리없는칸 || 0) + 머리없는값;
        로그.가져옴++;
        줄.push(out);
      }
    });

    var n = sources.length;
    var 일부열 = 열.filter(function (이름) { return Object.keys(열출처[이름]).length < n; })
      .map(function (이름) {
        return { 열: 이름, 있는곳: Object.keys(열출처[이름]).map(Number), 비슷한열: 비슷한(이름, 열) };
      });

    return {
      열: 열, 줄: 줄, 기록: 기록, 일부열: 일부열, 출처열: opts.출처열 !== false,
      합친줄수: 줄.length,
      맞음: 기록.reduce(function (a, l) { return a + l.가져옴; }, 0) === 줄.length
    };
  }

  // 띄어쓰기·괄호·기호만 다르거나 한쪽이 다른 쪽을 품은 이름 — "같은 열인가요?" 하고 물어볼 후보
  function 느슨(이름) { return 이름.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[\s_\-./·:]/g, ""); }
  function 비슷한(이름, 열) {
    var a = 느슨(이름);
    if (!a) return [];
    return 열.filter(function (b) {
      if (b === 이름) return false;
      var t = 느슨(b);
      if (!t) return false;
      return a === t || (a.length >= 2 && t.length >= 2 && (a.indexOf(t) > -1 || t.indexOf(a) > -1));
    });
  }

  /* 결과 → 통합 문서 (합친 자료 + 합치기 기록) */
  function 문서만들기(res, sources, XLSX) {
    var 머리 = res.열.slice();
    if (res.출처열) 머리.push("출처 파일");
    var aoa = [머리];
    res.줄.forEach(function (o) {
      var row = res.열.map(function (_, i) {
        var c = o.값[i];
        if (!c) return null;
        var k = { t: c.t, v: c.v };
        if (c.z) k.z = c.z;
        return k;
      });
      if (res.출처열) {
        var s = sources[o.si];
        row.push(s.시트여럿 ? s.파일 + " / " + s.시트 : s.파일);
      }
      aoa.push(row);
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = 머리.map(function (h) { return { wch: Math.min(40, Math.max(10, h.length * 2 + 2)) }; });

    var log = [["파일", "시트", "머리글 행", "머리글 아래 줄 수", "빈 줄", "합계·소계 줄", "가져온 줄", "비고"]];
    res.기록.forEach(function (l) {
      log.push([l.파일, l.시트, l.머리글행, l.전체, l.빈줄, l.합계줄, l.가져옴,
        l.문제 || (l.머리없는칸 ? "머리글이 없는 칸의 값 " + l.머리없는칸 + "개는 옮기지 않았어요" : "")]);
    });
    log.push([]);
    log.push(["합친 줄 수", res.합친줄수]);
    if (res.일부열.length) {
      log.push([]);
      log.push(["일부 파일에만 있는 열", "있는 파일"]);
      res.일부열.forEach(function (x) {
        log.push([x.열, x.있는곳.map(function (i) { return sources[i].파일; }).join(", ")]);
      });
    }
    var ws2 = XLSX.utils.aoa_to_sheet(log);
    ws2["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 40 }];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "합친 자료");
    XLSX.utils.book_append_sheet(wb, ws2, "합치기 기록");
    return wb;
  }

  root.합치기도구 = { 읽기: 읽기, 머리글찾기: 머리글찾기, 합치기: 합치기, 문서만들기: 문서만들기, 글자: 글자, 숫자로: 숫자로 };
})(typeof window !== "undefined" ? window : globalThis);
