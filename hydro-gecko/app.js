/* 💧 만성 탈수 탈출 챌린지
   - localStorage에 즉시 저장
   - state.json(원격)과 병합: 같은 날이면 더 큰 값, 더 새로운 날이면 그 날 값을 채택
*/
(function () {
  'use strict';

  var GOAL = 1500;
  var KST = 'Asia/Seoul';
  var STATE_KEY = 'hydroGecko:state:v2';
  var SETTINGS_KEY = 'hydroGecko:settings:v1';

  var QUESTS = [
    { id: 'morning',  time: '09:00', name: '모닝 워터',      ml: 250, xp: 10, icon: '🌅', sub: '기상 직후 첫 잔' },
    { id: 'lunch',    time: '13:00', name: '점심 포션',      ml: 300, xp: 15, icon: '🍚', sub: '식사와 함께 한 컵' },
    { id: 'afternoon',time: '17:00', name: '오후 버프',      ml: 300, xp: 15, icon: '⚡️', sub: '집중력 충전 타임' },
    { id: 'night',    time: '20:30', name: '나이트 한 모금', ml: 200, xp: 10, icon: '🌙', sub: '잠들기 전 수분' },
    { id: 'free',     time: '수시로', name: '자유 한 컵',    ml: 150, xp: 10, icon: '🥤', sub: '언제든 한 잔 더', repeat: true }
  ];

  var LEVELS = [
    { lv: 1, min: 0,    max: 99,   name: '바싹 마른 선인장',       short: '선인장',  glow: 'rgba(255,207,139,.26)' },
    { lv: 2, min: 100,  max: 249,  name: '이슬 머금은 새싹',        short: '새싹',    glow: 'rgba(110,242,192,.30)' },
    { lv: 3, min: 250,  max: 499,  name: '촉촉한 크레스티드 게코',  short: '게코',    glow: 'rgba(255,190,130,.30)' },
    { lv: 4, min: 500,  max: 999,  name: '수분 풀충전 오아시스',    short: '오아시스', glow: 'rgba(95,227,255,.34)' },
    { lv: 5, min: 1000, max: Infinity, name: '걸어다니는 에비앙 마스터', short: '에비앙', glow: 'rgba(190,240,255,.38)' }
  ];

  var CHEERS = {
    1: ['목말라…', '물 한 잔만', '아직 바싹 마름', '물이 필요해'],
    2: ['이슬 맛있다!', '조금씩 촉촉', '한 모금 더!', '싹이 났어'],
    3: ['촉촉 최고!', '게코도 마셨어', '물 마실 시간', '피부가 좋아졌어'],
    4: ['풍덩!', '오아시스 완성', '물이 넘실넘실', '완전 촉촉'],
    5: ['에비앙급 컨디션', '수분 마스터', '오늘도 완벽', '물이 곧 나야']
  };
  var POPS = ['짠!', '벌컥!', '한 모금 완료', '촉촉!'] ;

  var BADGES = [
    { id: 'first-sip', icon: '🥤', name: '첫 한 모금',   check: function (s) { return s.totalMl > 0; } },
    { id: 'goal-1',    icon: '🥇', name: '첫 목표 달성', check: function (s) { return hasGoal(s); } },
    { id: 'perfect',   icon: '✅', name: '4타임 올클리어', check: function (s) { return anyDay(s, function (h) { return h.goal && h.q >= 4; }); } },
    { id: 'streak-3',  icon: '🔥', name: '3일 개근',     check: function (s) { return s.bestStreak >= 3; } },
    { id: 'streak-7',  icon: '👑', name: '7일 개근',     check: function (s) { return s.bestStreak >= 7; } },
    { id: 'streak-14', icon: '🏆', name: '14일 개근',    check: function (s) { return s.bestStreak >= 14; } },
    { id: 'streak-30', icon: '💎', name: '30일 완주',    check: function (s) { return s.bestStreak >= 30; } },
    { id: 'level-3',   icon: '🦎', name: '게코 도달',    check: function (s) { return s.xp >= 250; } },
    { id: 'level-5',   icon: '🚀', name: '에비앙 등극',  check: function (s) { return s.xp >= 1000; } },
    { id: 'coffee-3',  icon: '☕', name: '카페인 상쇄 3회', check: function (s) { return s.coffeeClears >= 3; } },
    { id: 'over-2000', icon: '🐳', name: '하루 2L 클럽', check: function (s) { return anyDay(s, function (h) { return h.ml >= 2000; }); } },
    { id: 'night-owl', icon: '🦉', name: '새벽 물 한 잔', check: function (s) { return s.nightSips > 0; } }
  ];

  /* ---------------- date helpers ---------------- */
  function dayKey(d) {
    var dt = d || new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
    } catch (e) {
      return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
    }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function kstIso(d) {
    var dt = d || new Date();
    try {
      var f = new Intl.DateTimeFormat('en-GB', {
        timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
      });
      var p = {};
      f.formatToParts(dt).forEach(function (x) { p[x.type] = x.value; });
      var hh = p.hour === '24' ? '00' : p.hour;
      return p.year + '-' + p.month + '-' + p.day + 'T' + hh + ':' + p.minute + ':' + p.second + '+09:00';
    } catch (e) {
      return dt.toISOString();
    }
  }
  function addDays(key, n) {
    var a = key.split('-').map(Number);
    var dt = new Date(Date.UTC(a[0], a[1] - 1, a[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }
  function diffDays(a, b) {
    var x = a.split('-').map(Number), y = b.split('-').map(Number);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }
  function hourKst() {
    try {
      var h = new Intl.DateTimeFormat('en-GB', { timeZone: KST, hour: '2-digit', hourCycle: 'h23' }).format(new Date());
      return parseInt(h, 10);
    } catch (e) { return new Date().getHours(); }
  }
  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------------- state ---------------- */
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function normalize(raw) {
    var s = (raw && typeof raw === 'object') ? raw : {};
    var hist = {};
    if (s.history && typeof s.history === 'object') {
      Object.keys(s.history).forEach(function (k) {
        var h = s.history[k] || {};
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
        hist[k] = { ml: num(h.ml), xp: num(h.xp), goal: !!h.goal, q: num(h.q) };
      });
    }
    return {
      xp: num(s.xp),
      todayMl: num(s.todayMl),
      todayXp: num(s.todayXp),
      streak: num(s.streak),
      bestStreak: num(s.bestStreak) || num(s.streak),
      lastDate: (typeof s.lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastDate)) ? s.lastDate : dayKey(),
      lastGoalDate: (typeof s.lastGoalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastGoalDate)) ? s.lastGoalDate : null,
      firstDate: (typeof s.firstDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.firstDate)) ? s.firstDate : null,
      coffeeDebuff: Math.min(3, num(s.coffeeDebuff)),
      coffees: num(s.coffees),
      coffeeClears: num(s.coffeeClears),
      nightSips: num(s.nightSips),
      completedQuests: Array.isArray(s.completedQuests) ? s.completedQuests.filter(function (x) { return typeof x === 'string'; }) : [],
      freeCups: num(s.freeCups),
      totalMl: num(s.totalMl),
      history: hist,
      badges: Array.isArray(s.badges) ? s.badges.filter(function (x) { return typeof x === 'string'; }) : [],
      updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : null
    };
  }

  function blankState() {
    return normalize({
      xp: 0, todayMl: 0, todayXp: 0, streak: 0, bestStreak: 0, lastDate: dayKey(),
      coffeeDebuff: 0, completedQuests: [], freeCups: 0, history: {}, badges: [], updatedAt: kstIso()
    });
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* private mode */ }
    return blankState();
  }
  function saveLocal() {
    state.updatedAt = kstIso();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    updateSyncNote();
  }
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  var state = loadLocal();
  var settings = loadSettings();
  var undoStack = [];
  var lastLevel = null;
  var syncState = { msg: '동기화 대기 중', ok: null };

  function levelFor(xp) {
    for (var i = LEVELS.length - 1; i >= 0; i--) if (xp >= LEVELS[i].min) return LEVELS[i];
    return LEVELS[0];
  }
  function isGoalDone() { return !!state.history[state.lastDate] && !!state.history[state.lastDate].goal; }

  /* ---------------- day rollover ---------------- */
  function rollover() {
    var today = dayKey();
    if (state.lastDate === today) return false;
    if (state.lastDate > today) { // 시계 되돌림: 그대로 둔다
      return false;
    }
    if (state.lastGoalDate && diffDays(state.lastGoalDate, today) > 1) state.streak = 0;
    state.lastDate = today;
    state.todayMl = 0;
    state.todayXp = 0;
    state.completedQuests = [];
    state.freeCups = 0;
    state.coffeeDebuff = 0;
    undoStack = [];
    saveLocal();
    return true;
  }

  /* ---------------- persistence of today's record ---------------- */
  function writeToday() {
    var k = state.lastDate;
    var h = state.history[k] || { ml: 0, xp: 0, goal: false, q: 0 };
    h.ml = state.todayMl;
    h.xp = state.todayXp;
    h.q = state.completedQuests.length;
    state.history[k] = h;
    if (!state.firstDate || k < state.firstDate) state.firstDate = k;
  }

  function completeGoalIfReached() {
    var h = state.history[state.lastDate];
    if (!h || h.goal || state.todayMl < GOAL) return false;
    h.goal = true;
    var y = addDays(state.lastDate, -1);
    state.streak = (state.lastGoalDate === y) ? (state.streak + 1) : 1;
    state.lastGoalDate = state.lastDate;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    return true;
  }

  /* ---------------- actions ---------------- */
  function addWater(quest, silent) {
    rollover();
    var q = quest || QUESTS[4];
    var before = levelFor(state.xp).lv;
    var cleared = 0;
    var bonus = 0;
    if (state.coffeeDebuff > 0) {
      state.coffeeDebuff -= 1;
      state.coffeeClears += 1;
      cleared = 1;
      bonus = 20;
    }
    var hour = hourKst();
    if (hour >= 0 && hour < 5) state.nightSips += 1;

    state.todayMl += q.ml;
    var gained = q.xp + bonus;
    state.xp += gained;
    state.todayXp += gained;
    state.totalMl += q.ml;
    if (!state.firstDate) state.firstDate = state.lastDate;

    if (q.repeat) state.freeCups += 1;
    else if (state.completedQuests.indexOf(q.id) === -1) state.completedQuests.push(q.id);

    writeToday();
    var goalMade = completeGoalIfReached();

    undoStack.push({ type: 'water', questId: q.id, ml: q.ml, xp: q.xp, bonus: bonus, cleared: cleared, repeat: !!q.repeat, goalMade: goalMade });
    if (undoStack.length > 20) undoStack.shift();

    saveLocal();
    render();

    if (!silent) {
      bounce();
      burst(q.ml);
      say(q.ml >= 300 ? '벌컥! ' + comma(q.ml) + 'ml' : (POPS[Math.floor(Math.random() * POPS.length)] + ' +' + comma(q.ml) + 'ml'));
      sfx.plop();
      toast('+' + comma(q.ml) + 'ml  +' + gained + ' XP' + (cleared ? '  ☕ 디버프 해제!' : ''), cleared ? 'gold' : '');
      var afterLv = levelFor(state.xp);
      if (goalMade && afterLv.lv > before) {
        setTimeout(function () {
          sfx.level();
          showOverlay('🎉', '목표 달성 + LEVEL UP', '1,500ml 완주, ' + state.streak + '일 연속. 이제 ' + afterLv.name + ' 등극!');
          burst(400);
          toast('🔥 ' + state.streak + '일 연속 달성!', 'gold');
        }, 420);
      } else if (goalMade) {
        celebrateGoal();
      } else if (afterLv.lv > before) {
        celebrateLevel(afterLv);
      }
    }
    return { ml: q.ml, xp: gained };
  }

  function drinkCoffee() {
    rollover();
    if (state.coffeeDebuff >= 3) {
      toast('디버프가 이미 3개예요. 맹물 한 잔부터!');
      return;
    }
    state.coffeeDebuff += 1;
    state.coffees += 1;
    undoStack.push({ type: 'coffee' });
    if (undoStack.length > 20) undoStack.shift();
    saveLocal();
    render();
    toast('☕ 탈수 디버프 +1, 다음 맹물 한 잔이면 +20 XP');
    sfx.pop();
  }

  function undo() {
    rollover();
    var a = undoStack.pop();
    if (!a) return;
    if (a.type === 'coffee') {
      state.coffeeDebuff = Math.max(0, state.coffeeDebuff - 1);
      state.coffees = Math.max(0, state.coffees - 1);
    } else {
      state.todayMl = Math.max(0, state.todayMl - a.ml);
      state.todayXp = Math.max(0, state.todayXp - a.xp - a.bonus);
      state.xp = Math.max(0, state.xp - a.xp - a.bonus);
      state.totalMl = Math.max(0, state.totalMl - a.ml);
      if (a.repeat) state.freeCups = Math.max(0, state.freeCups - 1);
      else state.completedQuests = state.completedQuests.filter(function (id) { return id !== a.questId; });
      if (a.cleared) { state.coffeeDebuff = Math.min(3, state.coffeeDebuff + 1); state.coffeeClears = Math.max(0, state.coffeeClears - 1); }
      var h = state.history[state.lastDate];
      if (h) {
        h.ml = state.todayMl; h.xp = state.todayXp; h.q = state.completedQuests.length;
        if (h.goal && state.todayMl < GOAL) {
          h.goal = false;
          if (state.lastGoalDate === state.lastDate) {
            state.lastGoalDate = null;
            state.streak = Math.max(0, state.streak - 1);
          }
        }
      }
      toast('되돌렸어요  -' + comma(a.ml) + 'ml');
    }
    saveLocal();
    render();
  }

  /* ---------------- remote sync ---------------- */
  function mergeHistory(target, remoteHist) {
    Object.keys(remoteHist || {}).forEach(function (k) {
      var r = remoteHist[k];
      var l = target[k];
      if (!l) { target[k] = { ml: r.ml, xp: r.xp, goal: r.goal, q: r.q }; return; }
      target[k] = {
        ml: Math.max(l.ml, r.ml),
        xp: Math.max(l.xp, r.xp),
        goal: !!(l.goal || r.goal),
        q: Math.max(l.q, r.q)
      };
    });
  }
  function union(a, b) {
    var set = {};
    a.concat(b).forEach(function (x) { set[x] = 1; });
    return Object.keys(set);
  }

  function applyRemote(raw) {
    var r = normalize(raw);
    var beforeXp = state.xp;
    var beforeLv = levelFor(state.xp).lv;

    mergeHistory(state.history, r.history);
    state.bestStreak = Math.max(state.bestStreak, r.bestStreak, r.streak);
    state.coffees = Math.max(state.coffees, r.coffees);
    state.coffeeClears = Math.max(state.coffeeClears, r.coffeeClears);
    state.nightSips = Math.max(state.nightSips, r.nightSips);
    state.totalMl = Math.max(state.totalMl, r.totalMl, sumHistory());
    state.badges = union(state.badges, r.badges);
    if (r.firstDate && (!state.firstDate || r.firstDate < state.firstDate)) state.firstDate = r.firstDate;

    var remoteNewerDay = r.lastDate > state.lastDate;
    var sameDay = r.lastDate === state.lastDate;

    if (sameDay) {
      state.xp = Math.max(state.xp, r.xp);
      state.todayMl = Math.max(state.todayMl, r.todayMl);
      state.todayXp = Math.max(state.todayXp, r.todayXp);
      state.coffeeDebuff = Math.max(state.coffeeDebuff, r.coffeeDebuff);
      state.freeCups = Math.max(state.freeCups, r.freeCups);
      state.completedQuests = union(state.completedQuests, r.completedQuests);
      state.streak = Math.max(state.streak, r.streak);
      if (r.lastGoalDate && (!state.lastGoalDate || r.lastGoalDate > state.lastGoalDate)) state.lastGoalDate = r.lastGoalDate;
      writeToday();
    } else if (remoteNewerDay) {
      state.lastDate = r.lastDate;
      state.xp = Math.max(state.xp, r.xp);
      state.todayMl = r.todayMl;
      state.todayXp = r.todayXp;
      state.completedQuests = r.completedQuests.slice();
      state.freeCups = r.freeCups;
      state.coffeeDebuff = r.coffeeDebuff;
      state.streak = Math.max(state.streak, r.streak);
      if (r.lastGoalDate) state.lastGoalDate = r.lastGoalDate;
      undoStack = [];
      writeToday();
    } else {
      // 원격이 과거 날짜: 누적 값만 반영
      state.xp = Math.max(state.xp, r.xp);
    }

    var changed = state.xp !== beforeXp;
    var afterLv = levelFor(state.xp).lv;
    saveLocal();
    render();
    if (changed) {
      var diff = state.xp - beforeXp;
      toast('채팅 기록 동기화  +' + comma(diff) + ' XP', 'gold');
      if (afterLv > beforeLv) celebrateLevel(levelFor(state.xp));
    }
    return changed;
  }

  function sumHistory() {
    return Object.keys(state.history).reduce(function (a, k) { return a + num(state.history[k].ml); }, 0);
  }

  function fetchRemote(silent) {
    if (location.protocol === 'file:') {
      setSync('로컬 파일 모드, 기기에만 저장', false);
      return;
    }
    setSync('state.json 확인 중…', null);
    fetch('./state.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        applyRemote(json);
        setSync('state.json 동기화 완료', true);
      })
      .catch(function (err) {
        setSync('원격 동기화 실패, 기기에만 저장 중', false);
        if (!silent) console.warn('[hydro-gecko] state.json sync failed:', err && err.message);
      });
  }
  function timeShort(d) {
    try {
      return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
    } catch (e) { return ''; }
  }
  function setSync(msg, ok) { syncState = { msg: msg, ok: ok }; updateSyncNote(); }
  function updateSyncNote() {
    var el = document.getElementById('syncNote');
    if (!el) return;
    var t = '';
    try {
      t = new Intl.DateTimeFormat('ko-KR', { timeZone: KST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    } catch (e) { t = ''; }
    el.textContent = syncState.msg + (t && syncState.ok !== null ? '  ' + t : '');
  }

  /* ---------------- sound ---------------- */
  var sfx = (function () {
    var ctx = null;
    function ac() {
      if (settings.sound === false) return null;
      try {
        if (!ctx) {
          var C = window.AudioContext || window.webkitAudioContext;
          if (!C) return null;
          ctx = new C();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch (e) { return null; }
    }
    function tone(freq, to, dur, type, vol, delay) {
      var c = ac(); if (!c) return;
      var t0 = c.currentTime + (delay || 0);
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    return {
      plop: function () { tone(520, 190, 0.16, 'sine', 0.11); tone(900, 1400, 0.1, 'triangle', 0.05, 0.02); },
      pop: function () { tone(260, 160, 0.1, 'square', 0.05); },
      level: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, null, 0.34, 'triangle', 0.09, i * 0.11); }); },
      badge: function () { [784, 988].forEach(function (f, i) { tone(f, null, 0.24, 'sine', 0.08, i * 0.09); }); },
      stamp: function () { tone(330, 220, 0.22, 'sine', 0.1); tone(660, 880, 0.26, 'triangle', 0.06, 0.05); }
    };
  })();

  /* ---------------- visual effects ---------------- */
  function bounce() {
    var w = document.getElementById('petWrap');
    w.classList.remove('bounce');
    void w.offsetWidth;
    w.classList.add('bounce');
    setTimeout(function () { w.classList.remove('bounce'); }, 700);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }

  function burst(ml) {
    var layer = document.getElementById('particles');
    var n = ml >= 300 ? 18 : 12;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('span');
      d.className = 'drop';
      var ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.7;
      var dist = 45 + Math.random() * 90;
      d.style.left = '50%';
      d.style.top = '58%';
      d.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      d.style.setProperty('--dy', (Math.sin(ang) * dist - 20).toFixed(1) + 'px');
      d.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      var s = 0.6 + Math.random() * 0.9;
      d.style.width = (9 * s) + 'px';
      d.style.height = (11 * s) + 'px';
      layer.appendChild(d);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300); })(d);
    }
  }

  var bubbleTimer = null;
  function say(text) {
    var b = document.getElementById('bubble');
    b.textContent = text;
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { b.classList.remove('show'); }, 1300);
  }

  function toast(text, kind) {
    var wrap = document.getElementById('toastWrap');
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'gold' ? ' gold' : '');
    el.textContent = text;
    wrap.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
  }

  function confetti(n) {
    var box = document.getElementById('confetti');
    var colors = ['#5fe3ff', '#7ef0c8', '#ffd166', '#ff9fb2', '#b9a7ff', '#ffffff'];
    for (var i = 0; i < (n || 60); i++) {
      var el = document.createElement('i');
      el.style.left = (Math.random() * 100) + '%';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (1.9 + Math.random() * 1.6) + 's';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      el.style.width = (5 + Math.random() * 6) + 'px';
      el.style.height = (9 + Math.random() * 10) + 'px';
      el.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
      box.appendChild(el);
      (function (e) { setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 4200); })(el);
    }
  }

  var overlayTimer = null;
  function showOverlay(emoji, title, sub) {
    var ov = document.getElementById('overlay');
    document.getElementById('overlayEmoji').textContent = emoji;
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlaySub').textContent = sub;
    ov.classList.add('show');
    ov.setAttribute('aria-hidden', 'false');
    confetti(70);
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(hideOverlay, 4600);
  }
  function hideOverlay() {
    var ov = document.getElementById('overlay');
    ov.classList.remove('show');
    ov.setAttribute('aria-hidden', 'true');
    document.getElementById('confetti').innerHTML = '';
  }

  function celebrateGoal() {
    sfx.stamp();
    showOverlay('🏅', '오늘 목표 달성!', '1,500ml 완주. ' + state.streak + '일 연속 기록 중이에요.');
    setTimeout(function () { toast('🔥 ' + state.streak + '일 연속 달성!', 'gold'); }, 620);
  }
  function celebrateLevel(lv) {
    setTimeout(function () {
      sfx.level();
      showOverlay('✨', 'LEVEL UP!  Lv.' + lv.lv, '이제 ' + lv.name + ' 등극!');
      burst(400);
    }, 400);
  }

  /* ---------------- render ---------------- */
  function render() {
    var lv = levelFor(state.xp);
    var pets = document.querySelectorAll('.pet');
    for (var i = 0; i < pets.length; i++) {
      var active = i === lv.lv - 1;
      pets[i].classList.toggle('on', active);
      pets[i].setAttribute('aria-hidden', active ? 'false' : 'true');
      pets[i].setAttribute('focusable', 'false');
    }
    document.getElementById('stageGlow').style.background =
      'radial-gradient(circle, ' + lv.glow + ', rgba(95,227,255,.04) 55%, transparent 72%)';
    document.getElementById('lvBadge').textContent = 'Lv.' + lv.lv;
    document.getElementById('lvName').textContent = lv.name;

    document.getElementById('xpNow').textContent = comma(state.xp) + ' XP';
    var next = lv.max === Infinity ? null : lv.max + 1;
    var pct;
    if (next === null) {
      pct = 100;
      document.getElementById('xpNext').textContent = '최고 레벨, 수분 마스터';
    } else {
      pct = Math.max(0, Math.min(100, ((state.xp - lv.min) / (next - lv.min)) * 100));
      document.getElementById('xpNext').textContent = '다음 진화까지 ' + comma(next - state.xp);
    }
    document.getElementById('xpFill').style.width = pct.toFixed(1) + '%';

    var ml = state.todayMl;
    document.getElementById('mlNow').textContent = comma(ml);
    document.getElementById('goalPct').textContent = Math.round(Math.min(100, (ml / GOAL) * 100)) + '%';
    document.getElementById('barFill').style.width = Math.max(0, Math.min(100, (ml / GOAL) * 100)).toFixed(1) + '%';
    document.getElementById('streakVal').textContent = state.streak;
    document.getElementById('cupVal').textContent = state.completedQuests.length + state.freeCups;
    document.getElementById('xpVal').textContent = comma(state.xp);

    renderQuests();
    renderStamps();
    renderBadges();

    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    document.getElementById('soundBtn').textContent = settings.sound === false ? '🔇' : '🔊';

    if (lastLevel !== null && lv.lv > lastLevel) { /* 축하는 addWater에서 처리 */ }
    lastLevel = lv.lv;
    updateSyncNote();
  }

  function renderQuests() {
    var box = document.getElementById('questList');
    box.innerHTML = '';
    QUESTS.forEach(function (q) {
      var done = !q.repeat && state.completedQuests.indexOf(q.id) !== -1;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quest' + (done ? ' done' : '');
      btn.setAttribute('data-quest', q.id);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      var sub = q.time + '  ' + q.sub;
      if (q.repeat && state.freeCups > 0) sub += '  오늘 ' + state.freeCups + '회';
      btn.innerHTML =
        '<span class="qIcon">' + q.icon + '</span>' +
        '<span class="qMain"><b>' + q.name + '  ' + comma(q.ml) + 'ml</b><small>' + sub + '</small></span>' +
        '<span class="qXp">+' + q.xp + ' XP</span>';
      btn.addEventListener('click', function () {
        if (done) { toast('이미 마신 컵이에요. 더 마셨다면 자유 한 컵을 눌러 주세요'); return; }
        addWater(q);
      });
      box.appendChild(btn);
    });
    document.getElementById('questHint').textContent = state.completedQuests.length + ' / 4';

    var debuff = document.getElementById('debuffCount');
    debuff.textContent = state.coffeeDebuff > 0 ? '디버프 ' + state.coffeeDebuff : '없음';
    document.getElementById('coffeeBox').firstElementChild.classList.toggle('armed', state.coffeeDebuff > 0);
  }

  function renderStamps() {
    var grid = document.getElementById('stampGrid');
    grid.innerHTML = '';
    var today = dayKey();
    var start = state.firstDate;
    var block = 0;
    var startBlock = today;
    if (start) {
      var since = diffDays(start, today);
      block = Math.max(0, Math.floor(since / 30));
      startBlock = addDays(start, block * 30);
    }
    var goals = 0, total = 0;
    for (var i = 0; i < 30; i++) {
      var key = addDays(startBlock, i);
      var h = state.history[key];
      var cell = document.createElement('div');
      cell.className = 'stamp';
      var num = block * 30 + i + 1;
      if (key === today) cell.classList.add('today');
      if (key > today) cell.classList.add('future');
      if (h && h.goal) { cell.classList.add('goal'); goals++; }
      else if (h && h.ml > 0) cell.classList.add('part');
      if (h && h.ml > 0) total++;
      cell.innerHTML = '<span class="d">' + num + '</span><span class="mark">✓</span>';
      cell.title = key + (h ? '  ' + h.ml + 'ml' : '');
      grid.appendChild(cell);
    }
    document.getElementById('stampHint').textContent = goals + '일 달성';
    var memo = document.getElementById('stampMemo');
    if (!state.firstDate) memo.textContent = '첫 한 잔을 마시면 1일차 도장판이 열려요.';
    else memo.textContent = '이번 30일 구간 ' + goals + '일 완주, 마신 날 ' + total + '일. 연속 최고 기록 ' + state.bestStreak + '일.';
  }

  function renderBadges() {
    var grid = document.getElementById('badgeGrid');
    grid.innerHTML = '';
    var on = 0;
    BADGES.forEach(function (b) {
      var has = state.badges.indexOf(b.id) !== -1;
      if (has) on++;
      var el = document.createElement('div');
      el.className = 'badge' + (has ? ' on' : '');
      el.innerHTML = '<span class="bIcon">' + b.icon + '</span><span class="bName">' + (has ? b.name : '???') + '</span>';
      el.title = b.name;
      grid.appendChild(el);
    });
    document.getElementById('badgeHint').textContent = on + ' / ' + BADGES.length;
  }

  function evalBadges(silent) {
    var fresh = [];
    BADGES.forEach(function (b) {
      if (state.badges.indexOf(b.id) === -1 && b.check(state)) {
        state.badges.push(b.id);
        fresh.push(b);
      }
    });
    if (fresh.length) {
      saveLocal();
      renderBadges();
      if (!silent) {
        fresh.forEach(function (b, i) {
          setTimeout(function () { toast(b.icon + ' 업적 달성  ' + b.name, 'gold'); sfx.badge(); }, 650 + i * 1100);
        });
      }
    }
    return fresh;
  }

  /* hooks: render 이후 배지 검사 */
  var _render = render;
  render = function () { _render(); evalBadges(false); };
  var _applyRemote = applyRemote;
  applyRemote = function (raw) { var r = _applyRemote(raw); evalBadges(true); return r; };

  /* ---------------- helpers used by badge checks ---------------- */
  function hasGoal(s) {
    return Object.keys(s.history).some(function (k) { return s.history[k].goal; });
  }
  function anyDay(s, fn) {
    return Object.keys(s.history).some(function (k) { return fn(s.history[k]); });
  }

  /* ---------------- background bubbles ---------------- */
  function seedBubbles() {
    var box = document.getElementById('bgBubbles');
    for (var i = 0; i < 14; i++) {
      var b = document.createElement('span');
      var s = 4 + Math.random() * 12;
      b.style.width = s + 'px';
      b.style.height = s + 'px';
      b.style.left = (Math.random() * 100) + '%';
      b.style.animationDuration = (9 + Math.random() * 14) + 's';
      b.style.animationDelay = (-Math.random() * 18) + 's';
      b.style.opacity = (0.18 + Math.random() * 0.4).toFixed(2);
      box.appendChild(b);
    }
  }

  /* ---------------- wiring ---------------- */
  function bind() {
    document.getElementById('coffeeBtn').addEventListener('click', drinkCoffee);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('overlayBtn').addEventListener('click', hideOverlay);
    document.getElementById('overlay').addEventListener('click', function (e) {
      if (e.target.id === 'overlay') hideOverlay();
    });
    document.getElementById('soundBtn').addEventListener('click', function () {
      settings.sound = settings.sound === false;
      saveSettings();
      render();
      if (settings.sound !== false) sfx.plop();
      toast(settings.sound === false ? '소리 꺼짐' : '소리 켜짐');
    });
    document.getElementById('stage').addEventListener('click', function () {
      var lv = levelFor(state.xp);
      var list = CHEERS[lv.lv];
      say(list[Math.floor(Math.random() * list.length)]);
      bounce();
      sfx.pop();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        var rolled = rollover();
        if (rolled) render();
        fetchRemote(true);
      }
    });
    window.addEventListener('pageshow', function () {
      var rolled = rollover();
      if (rolled) render();
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    rollover();
    seedBubbles();
    bind();
    render();
    fetchRemote(false);
    // 첫 화면에서 조용히 상태 노출 (검증용)
    window.__hydro = {
      getState: function () { return JSON.parse(JSON.stringify(state)); },
      getLevel: function () { return levelFor(state.xp); },
      addWater: function (id) { var q = QUESTS.filter(function (x) { return x.id === id; })[0]; return addWater(q, true); },
      sync: function () { return fetchRemote(true); },
      preview: function (emoji, title, sub) { showOverlay(emoji || '🎉', title || '미리보기', sub || ''); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
