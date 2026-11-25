/* CPX 틀니 · 51개 토픽 진도판 */
(function () {
  'use strict';

  var DATA = null;
  var teeth = [];          // topic index -> element
  var meta = { total: 51, done: 0 };
  var playing = false;
  var timers = [];
  var zoom = 1;
  var ZOOMS = [1, 1.35, 1.8, 2.4];

  var CX = 500;
  var UPPER = { n: 26, tipY: 300, W: 326, H: 70, dir: 1 };
  var LOWER = { n: 25, tipY: 350, W: 326, H: 70, dir: -1 };
  var CROWN = 46;
  var SLOTS = [];
  var atSlot = [];

  var $ = function (id) { return document.getElementById(id); };
  var svgNS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------- geometry */

  function centerOut(n) {
    var out = [];
    if (n % 2 === 0) {
      var l = n / 2 - 1, r = n / 2;
      while (l >= 0 || r < n) {
        if (l >= 0) out.push(l);
        if (r < n) out.push(r);
        l--; r++;
      }
    } else {
      var c = (n - 1) / 2;
      out.push(c);
      var d = 1;
      while (out.length < n) {
        if (c - d >= 0) out.push(c - d);
        if (c + d < n) out.push(c + d);
        d++;
      }
    }
    return out;
  }

  var orderUpper = centerOut(UPPER.n);
  var orderLower = centerOut(LOWER.n);

  function archSlot(arch, p) {
    var A = arch === 'u' ? UPPER : LOWER;
    var pitch = (2 * A.W) / A.n;
    var x = CX - A.W + (p + 0.5) * pitch;
    var xn = (x - CX) / A.W;
    var c = Math.sqrt(Math.max(0, 1 - xn * xn));
    var y = A.tipY - A.dir * A.H * (1 - c);
    var m = (-A.dir * A.H * xn) / (A.W * Math.max(0.06, c));
    m = Math.max(-0.65, Math.min(0.65, m));       // 기울기 상한 33도
    var nx = m, ny = -A.dir;
    var rot = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
    var mid = arch === 'u' ? UPPER.n / 2 : (LOWER.n - 1) / 2;
    var k = arch === 'u'
      ? Math.round(Math.abs(p - mid + 0.5) - 0.5)
      : Math.abs(p - mid);
    var type = k === 0 || k === 1 ? 'inc' : k === 2 ? 'can' : k <= 4 ? 'pre' : 'mol';
    var scale = k === 0 ? 1.04 : k === 1 ? 0.98 : k === 2 ? 1.0 : k <= 4 ? 0.98 : 1.0 - Math.min(0.1, (k - 5) * 0.014);
    return { x: x, y: y, rot: rot, pitch: pitch, w: pitch * 0.95 * scale, type: type, k: k };
  }

  function buildSlots() {
    SLOTS = [];
    orderUpper.forEach(function (p) { SLOTS.push(archSlot('u', p)); });
    orderLower.forEach(function (p) { SLOTS.push(archSlot('l', p)); });
    return SLOTS;
  }

  /* ------------------------------------------------------------------ shapes */

  function crownPath(type, w, H) {
    var hw = w / 2;
    var f = function (v) { return Math.round(v * 100) / 100; };
    if (type === 'inc') {
      return 'M' + f(-hw) + ' ' + f(-H * 0.14) +
        'C' + f(-hw) + ' ' + f(-H * 0.66) + ' ' + f(-hw * 0.84) + ' ' + f(-H) + ' 0 ' + f(-H) +
        'C' + f(hw * 0.84) + ' ' + f(-H) + ' ' + f(hw) + ' ' + f(-H * 0.66) + ' ' + f(hw) + ' ' + f(-H * 0.14) +
        'C' + f(hw) + ' ' + f(-H * 0.03) + ' ' + f(hw * 0.44) + ' 0 0 0' +
        'C' + f(-hw * 0.44) + ' 0 ' + f(-hw) + ' ' + f(-H * 0.03) + ' ' + f(-hw) + ' ' + f(-H * 0.14) + 'Z';
    }
    if (type === 'can') {
      return 'M' + f(-hw) + ' ' + f(-H * 0.2) +
        'C' + f(-hw) + ' ' + f(-H * 0.62) + ' ' + f(-hw * 0.8) + ' ' + f(-H) + ' 0 ' + f(-H) +
        'C' + f(hw * 0.8) + ' ' + f(-H) + ' ' + f(hw) + ' ' + f(-H * 0.62) + ' ' + f(hw) + ' ' + f(-H * 0.2) +
        'C' + f(hw * 0.72) + ' ' + f(-H * 0.1) + ' ' + f(hw * 0.34) + ' ' + f(-H * 0.01) + ' 0 0' +
        'C' + f(-hw * 0.34) + ' ' + f(-H * 0.01) + ' ' + f(-hw * 0.72) + ' ' + f(-H * 0.1) + ' ' + f(-hw) + ' ' + f(-H * 0.2) + 'Z';
    }
    var cusp = type === 'pre' ? 2 : 3;
    var base = 'M' + f(-hw) + ' ' + f(-H * 0.24) +
      'L' + f(-hw) + ' ' + f(-H * 0.82) +
      'Q' + f(-hw) + ' ' + f(-H) + ' ' + f(-hw * 0.58) + ' ' + f(-H) +
      'L' + f(hw * 0.58) + ' ' + f(-H) +
      'Q' + f(hw) + ' ' + f(-H) + ' ' + f(hw) + ' ' + f(-H * 0.82) +
      'L' + f(hw) + ' ' + f(-H * 0.24);
    if (cusp === 2) {
      return base +
        'Q' + f(hw) + ' ' + f(-H * 0.08) + ' ' + f(hw * 0.34) + ' ' + f(-H * 0.08) +
        'L' + f(hw * 0.06) + ' ' + f(-H * 0.01) +
        'L' + f(-hw * 0.06) + ' ' + f(-H * 0.01) +
        'L' + f(-hw * 0.34) + ' ' + f(-H * 0.08) +
        'Q' + f(-hw) + ' ' + f(-H * 0.08) + ' ' + f(-hw) + ' ' + f(-H * 0.24) + 'Z';
    }
    return base +
      'Q' + f(hw) + ' ' + f(-H * 0.06) + ' ' + f(hw * 0.5) + ' ' + f(-H * 0.07) +
      'L' + f(hw * 0.16) + ' ' + f(-H * 0.02) +
      'L0 ' + f(-H * 0.07) +
      'L' + f(-hw * 0.16) + ' ' + f(-H * 0.02) +
      'L' + f(-hw * 0.5) + ' ' + f(-H * 0.07) +
      'Q' + f(-hw) + ' ' + f(-H * 0.06) + ' ' + f(-hw) + ' ' + f(-H * 0.24) + 'Z';
  }

  function buildTooth(t, s, idx) {
    var H = s.type === 'inc' ? CROWN + 2 : s.type === 'can' ? CROWN + 3 : s.type === 'pre' ? CROWN - 2 : CROWN - 4;
    var w = s.w;
    var hw = w / 2;
    var g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'tooth');
    g.setAttribute('data-i', idx);
    g.setAttribute('transform', 'translate(' + s.x.toFixed(2) + ' ' + s.y.toFixed(2) + ') rotate(' + s.rot.toFixed(2) + ')');
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '-1');
    g.setAttribute('aria-label', t.num + ' ' + t.title + (t.done ? ' 완료' : ' 미완료'));

    var body = document.createElementNS(svgNS, 'g');
    body.setAttribute('class', 'body');

    var ring = document.createElementNS(svgNS, 'circle');
    ring.setAttribute('class', 'ring');
    ring.setAttribute('cx', 0);
    ring.setAttribute('cy', -H * 0.5);
    ring.setAttribute('r', hw * 1.35);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#c98a72');
    ring.setAttribute('stroke-dasharray', '3 5');
    ring.setAttribute('opacity', '0.22');
    body.appendChild(ring);

    var crownFill = document.createElementNS(svgNS, 'path');
    crownFill.setAttribute('class', 'crown');
    crownFill.setAttribute('d', crownPath(s.type, w, H));
    body.appendChild(crownFill);

    var gloss = document.createElementNS(svgNS, 'ellipse');
    gloss.setAttribute('class', 'gloss');
    gloss.setAttribute('cx', -hw * 0.3);
    gloss.setAttribute('cy', -H * 0.66);
    gloss.setAttribute('rx', hw * 0.26);
    gloss.setAttribute('ry', H * 0.2);
    gloss.setAttribute('transform', 'rotate(-14 ' + (-hw * 0.3) + ' ' + (-H * 0.66) + ')');
    body.appendChild(gloss);

    var shade = document.createElementNS(svgNS, 'ellipse');
    shade.setAttribute('class', 'shade');
    shade.setAttribute('cx', hw * 0.4);
    shade.setAttribute('cy', -H * 0.3);
    shade.setAttribute('rx', hw * 0.22);
    shade.setAttribute('ry', H * 0.17);
    body.appendChild(shade);

    var spark = document.createElementNS(svgNS, 'g');
    spark.setAttribute('class', 'spark');
    var d = 15;
    var star = document.createElementNS(svgNS, 'path');
    star.setAttribute('d', 'M0 ' + (-H * 0.55 - d) + ' L' + (d * 0.28) + ' ' + (-H * 0.55 - d * 0.28) +
      ' L' + d + ' ' + (-H * 0.55) + ' L' + (d * 0.28) + ' ' + (-H * 0.55 + d * 0.28) +
      ' L0 ' + (-H * 0.55 + d) + ' L' + (-d * 0.28) + ' ' + (-H * 0.55 + d * 0.28) +
      ' L' + (-d) + ' ' + (-H * 0.55) + ' L' + (-d * 0.28) + ' ' + (-H * 0.55 - d * 0.28) + 'Z');
    star.setAttribute('fill', '#fff3d6');
    spark.appendChild(star);
    [['-0.95', '-0.78', 2.2], ['0.92', '-0.9', 2.8], ['0.55', '-0.05', 1.8], ['-0.5', '0.02', 1.5]].forEach(function (p) {
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', (hw * parseFloat(p[0])).toFixed(1));
      c.setAttribute('cy', (H * parseFloat(p[1])).toFixed(1));
      c.setAttribute('r', p[2]);
      c.setAttribute('fill', '#ffe6b0');
      spark.appendChild(c);
    });
    body.appendChild(spark);

    var num = document.createElementNS(svgNS, 'text');
    num.setAttribute('class', 'tn');
    num.setAttribute('transform', 'rotate(' + (-s.rot).toFixed(2) + ')');
    num.setAttribute('x', 0);
    num.setAttribute('y', -H * 0.42);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('font-size', '11');
    num.setAttribute('font-weight', '700');
    num.setAttribute('fill', '#9b7b66');
    num.setAttribute('pointer-events', 'none');
    num.textContent = t.num;
    body.appendChild(num);

    g.appendChild(body);
    return g;
  }

  function gumPath(arch) {
    var A = arch === 'u' ? UPPER : LOWER;
    var pts = [];
    var N = 110;
    for (var i = 0; i <= N; i++) {
      var xn = -1 + (2 * i) / N;
      var x = CX + A.W * xn;
      var c = Math.sqrt(Math.max(0, 1 - xn * xn));
      var y = A.tipY - A.dir * A.H * (1 - c);
      pts.push([x, y]);
    }
    var top = CROWN + 17;
    var bot = CROWN - 30;
    var line = function (p, off) { return p[0].toFixed(1) + ' ' + (p[1] - A.dir * off).toFixed(1); };
    var d = 'M' + line(pts[0], bot);
    for (var j = 1; j < pts.length; j++) d += ' L' + line(pts[j], bot);
    d += ' L' + line(pts[pts.length - 1], top);
    for (var k = pts.length - 2; k >= 0; k--) d += ' L' + line(pts[k], top);
    return d + ' Z';
  }

  function draw() {
    var gums = $('gums');
    var teethLayer = $('teeth');
    while (gums.firstChild) gums.removeChild(gums.firstChild);
    while (teethLayer.firstChild) teethLayer.removeChild(teethLayer.firstChild);

    var gu = document.createElementNS(svgNS, 'path');
    gu.setAttribute('class', 'gum');
    gu.setAttribute('d', gumPath('u'));
    gu.setAttribute('fill', 'url(#gum)');
    gums.appendChild(gu);

    var gl = document.createElementNS(svgNS, 'path');
    gl.setAttribute('class', 'gum');
    gl.setAttribute('d', gumPath('l'));
    gl.setAttribute('fill', 'url(#gumLower)');
    gums.appendChild(gl);

    teeth = [];
    atSlot = [];
    buildSlots();
    DATA.topics.forEach(function (t, i) {
      var sl = (t.slot != null && SLOTS[t.slot]) ? t.slot : i;
      while (atSlot[sl] !== undefined) sl++;
      var s = SLOTS[sl];
      var el = buildTooth(t, s, i);
      el._s = s;
      el._slot = sl;
      teethLayer.appendChild(el);
      teeth.push(el);
      atSlot[sl] = i;
    });
  }

  /* ------------------------------------------------------------------- state */

  function isDone(i) { return !!(DATA && DATA.topics[i] && DATA.topics[i].done); }

  function paintCounter(done) {
    var total = DATA ? DATA.topics.length : 51;
    $('doneNum').textContent = done;
    $('remainNum').textContent = Math.max(0, total - done);
    $('barFill').style.width = Math.max(1.5, (done / total) * 100) + '%';
  }

  function markNext() {
    if (!DATA) return;
    var nextIdx = -1;
    for (var s = 0; s < atSlot.length; s++) {
      var i = atSlot[s];
      if (i === undefined) continue;
      if (!DATA.topics[i].done) { nextIdx = i; break; }
    }
    teeth.forEach(function (el, i) { el.classList.toggle('next', i === nextIdx); });
  }

  function setFilled(i, on, delay) {
    var el = teeth[i];
    if (!el) return;
    var body = el.querySelector('.body');
    if (on) {
      el.classList.add('filled');
      if (delay != null) {
        el.classList.remove('rise', 'flash');
        void el.offsetWidth;
        body.style.animation = 'none';
        void body.offsetWidth;
        body.style.animation = '';
        el.classList.add('rise');
        el.style.setProperty('--d', (delay || 0) + 'ms');
        body.style.animationDelay = (delay || 0) + 'ms';
        var sp = el.querySelector('.spark');
        sp.style.animationDelay = (delay || 0) + 'ms';
        el.classList.add('flash');
        var gl = el.querySelector('.glint');
        setTimeout(function () { el.classList.remove('flash', 'rise'); body.style.animationDelay = ''; }, (delay || 0) + 950);
      }
    } else {
      el.classList.remove('filled', 'rise', 'flash');
      body.style.animation = '';
    }
  }

  function applyState(animate) {
    teeth.forEach(function (el, i) {
      if (isDone(i)) {
        if (animate) setFilled(i, true, 180 + i * 26);
        else { el.classList.add('filled'); el.classList.remove('rise'); }
      } else {
        el.classList.remove('filled', 'rise');
      }
    });
    paintCounter(meta.done);
    markNext();
  }

  /* ----------------------------------------------------------------- preview */

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function replay() {
    if (!DATA) return;
    clearTimers();
    playing = true;
    $('previewTag').classList.add('on');
    $('replay').disabled = true;

    teeth.forEach(function (el) { el.classList.remove('filled', 'rise', 'flash'); });
    paintCounter(0);

    var step = 32;
    var order = atSlot.filter(function (i) { return i !== undefined; });
    for (var k = 0; k < order.length; k++) {
      (function (idx, n) {
        later(function () {
          setFilled(idx, true, 0);
          paintCounter(n + 1);
          if (n === order.length - 1) {
            later(function () { finishPreview(); }, 2600);
          }
        }, 120 + k * step);
      })(order[k], k);
    }
  }

  function finishPreview() {
    $('previewTag').classList.remove('on');
    $('replay').disabled = false;
    var n = DATA.topics.length - 1;
    for (var i = n; i >= 0; i--) {
      (function (idx) {
        later(function () {
          if (!isDone(idx)) setFilled(idx, false);
          if (idx === 0) {
            paintCounter(meta.done);
            markNext();
            playing = false;
          }
        }, (n - idx) * 14);
      })(i);
    }
    // 완료된 치아는 남겨 둔다.
    later(function () {
      teeth.forEach(function (el, i) { if (isDone(i)) el.classList.add('filled'); });
      playing = false;
    }, (n + 1) * 14 + 40);
  }

  /* -------------------------------------------------------------------- sheet */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function lines(v) {
    if (v == null) return [];
    if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
    if (Array.isArray(v)) return v.filter(function (x) { return x && String(x).trim(); }).map(String);
    if (typeof v === 'object') {
      var out = [];
      if (v.items) out = out.concat(lines(v.items));
      else {
        Object.keys(v).forEach(function (k) {
          if (typeof v[k] === 'string' && v[k].trim()) out.push(v[k]);
        });
      }
      return out;
    }
    return [];
  }

  var SECTIONS = [
    ['C', 'C 증상 묘사'], ['A', 'A 동반 증상'], ['F', 'F 악화 완화'],
    ['PEx', '신체 검진'], ['교육', '교육']
  ];

  function sectionsHtml(obj, cls) {
    var h = '<div class="' + cls + '">';
    var any = false;
    SECTIONS.forEach(function (pair) {
      var ls = lines(obj[pair[0]]);
      if (!ls.length) return;
      any = true;
      h += '<div class="sec"><h3>' + esc(pair[1]) + '</h3>';
      if (ls.length === 1 && pair[0] !== 'C' && pair[0] !== 'A') {
        h += '<p>' + esc(ls[0]) + '</p>';
      } else {
        h += '<ul>' + ls.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      h += '</div>';
    });
    return any ? h + '</div>' : '';
  }

  function openTopic(i) {
    var t = DATA.topics[i];
    if (!t) return;
    $('sheetNum').textContent = t.num;
    $('sheetTitle').textContent = t.title;
    var state = $('sheetState');
    state.textContent = t.done ? '완료' : '아직 정리 전';
    state.className = 'statechip' + (t.done ? ' done' : '');
    $('sheetMeta').textContent = t.done
      ? (t.doneDate ? t.doneDate + ' 완료' : '완료')
      : '노션 ' + String(meta.done) + ' / ' + String(meta.total) + ' 진행 중';

    var body = '';
    if (t.done && t.mine) {
      body += sectionsHtml(t.mine, 'mine');
    } else {
      body += '<div class="empty"><b>아직 내 답이 정리되지 않은 토픽이에요.</b>' +
        '이 소켓은 비어 있지만, 아래 기본 대본으로 먼저 연습해 두면 좋아요.</div>';
    }
    var scriptHtml = sectionsHtml(t.script || {}, 'scriptbody');
    if (scriptHtml) {
      body += '<details class="script"' + (t.done ? '' : ' open') + '><summary>' +
        (t.done ? '기본 대본 보기' : '기본 대본') + '</summary>' + scriptHtml + '</details>';
    }
    $('sheetBody').innerHTML = body;
    $('sheetNotion').href = meta.notion || 'https://www.notion.so/422b0b095d2e817c8944eaf6b4057d3f';
    $('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    if (history.replaceState) history.replaceState(null, '', '#' + t.num);
    $('sheetBody').scrollTop = 0;
  }

  function closeSheet() {
    $('sheet').hidden = true;
    document.body.style.overflow = '';
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* --------------------------------------------------------------------- list */

  function buildList() {
    var ul = $('rows');
    ul.innerHTML = '';
    var nextIdx = -1;
    for (var s = 0; s < atSlot.length; s++) {
      var idx = atSlot[s];
      if (idx !== undefined && !DATA.topics[idx].done) { nextIdx = idx; break; }
    }
    DATA.topics.forEach(function (t, i) {
      var li = document.createElement('li');
      li.className = 'row' + (t.done ? ' done' : '') + (i === nextIdx ? ' nextrow' : '');
      li.innerHTML = '<span class="n">' + esc(t.num) + '</span><span class="t">' + esc(t.title) +
        '</span><span class="dot"></span>';
      li.addEventListener('click', function () { openTopic(i); });
      ul.appendChild(li);
    });
  }

  /* --------------------------------------------------------------------- init */

  function bind() {
    $('replay').addEventListener('click', replay);
    $('zoomIn').addEventListener('click', function () {
      var k = ZOOMS.indexOf(zoom);
      zoom = ZOOMS[Math.min(ZOOMS.length - 1, k + 1)];
      $('stage').style.setProperty('--zoom', zoom);
      $('stage').scrollLeft = ($('stage').scrollWidth - $('stage').clientWidth) / 2;
    });
    $('zoomOut').addEventListener('click', function () {
      var k = ZOOMS.indexOf(zoom);
      zoom = ZOOMS[Math.max(0, k - 1)];
      $('stage').style.setProperty('--zoom', zoom);
      $('stage').scrollLeft = ($('stage').scrollWidth - $('stage').clientWidth) / 2;
    });
    $('toggleNums').addEventListener('click', function () {
      var on = $('mouth').classList.toggle('nums');
      this.setAttribute('aria-pressed', on ? 'true' : 'false');
      this.classList.toggle('on', on);
    });
    $('toggleList').addEventListener('click', function () {
      var open = $('listView').hidden;
      $('listView').hidden = !open;
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
      this.classList.toggle('on', open);
      if (open) $('listView').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('sheetClose').addEventListener('click', closeSheet);
    document.querySelector('[data-close]').addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('sheet').hidden) closeSheet();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!$('sheet').hidden) {
          var num = $('sheetNum').textContent;
          var idx = DATA.topics.findIndex(function (t) { return t.num === num; });
          var nxt = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
          if (nxt >= 0 && nxt < DATA.topics.length) openTopic(nxt);
        }
      }
    });

    $('mouth').addEventListener('click', function (e) {
      if (playing) return;
      var box = $('mouth').getBoundingClientRect();
      var vb = $('mouth').viewBox.baseVal;
      var px = ((e.clientX - box.left) / box.width) * vb.width + vb.x;
      var py = ((e.clientY - box.top) / box.height) * vb.height + vb.y;
      var best = -1, bd = Infinity;
      teeth.forEach(function (el, i) {
        var s = el._s;
        var dx = (px - s.x) / 30;
        var dy = (py - (s.y - 20)) / 42;
        var d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0 && bd < 1.25) openTopic(best);
    });
    $('mouth').addEventListener('keydown', function () { });
  }

  function init(data) {
    DATA = data;
    meta = data.meta || { total: data.topics.length, done: 0 };
    if (!meta.notion) meta.notion = 'https://www.notion.so/422b0b095d2e817c8944eaf6b4057d3f';
    draw();
    bind();
    buildList();
    paintCounter(meta.done);
    $('lastDone').textContent = meta.lastDone ? '마지막 완료 ' + meta.lastDone : '아직 채운 치아가 없어요';
    $('footNote').textContent = '진도는 CPX 문진 노트와 같은 키워드 파일에서 만들어집니다. ' +
      (meta.generated ? '최근 반영 ' + meta.generated : '');
    applyState(true);

    var h = decodeURIComponent((location.hash || '').replace('#', ''));
    if (h) {
      var idx = DATA.topics.findIndex(function (t) { return t.num === h; });
      if (idx >= 0) setTimeout(function () { openTopic(idx); }, 400);
    }
  }

  fetch('data.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(init)
    .catch(function (err) {
      $('hint').textContent = '데이터를 불러오지 못했어요 (' + err.message + ')';
    });
})();
