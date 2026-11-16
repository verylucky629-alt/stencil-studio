/* ============================================================
   Stencil Studio
   White background remover + photo-to-stencil converter
   100% client side — no upload, no external API.
   ============================================================ */
'use strict';
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

  /* ---------------- i18n ---------------- */
  const EN = {
    tagline: 'Remove white · Photo → stencil',
    view_original: 'Original',
    view_bg: 'Background',
    view_stencil: 'Stencil',
    drop_title: 'Drop an image here',
    drop_sub: 'JPG · PNG · WebP · HEIC · up to 20MB',
    drop_privacy: 'Your image is processed on this device and never uploaded.',
    pick_file: 'Choose file',
    camera: 'Camera',
    sample: 'Sample image',
    compare: 'Compare',
    new_image: 'New image',
    reset_all: 'Reset',
    bg_title: 'Remove white background',
    bg_tol: 'Tolerance',
    bg_tol_hint: 'Raise it to erase off-white tones and soft shadows',
    bg_feather: 'Soften edges',
    bg_feather_hint: 'Smooths the stair-stepped border',
    bg_color: 'Colour to erase',
    eyedrop: 'Eyedropper',
    auto_color: 'Auto',
    bg_note: 'Not white? Pick any background colour with the eyedropper.',
    bg_preview: 'Preview backdrop',
    checker: 'Checker',
    white: 'White',
    black: 'Black',
    bg_to_stencil: 'Send to stencil',
    st_title: 'Photo to stencil',
    mode: 'Mode',
    mode_outline: 'Outline',
    mode_adaptive: 'Drawing',
    mode_threshold: 'B&W',
    mode_outline_desc: 'Traces the edges of the photo into a line drawing',
    mode_adaptive_desc: 'Splits light and shadow like a printable drawing — best for photos',
    mode_threshold_desc: 'Hard black-and-white silhouette at one brightness level',
    st_threshold: 'Threshold',
    st_detail: 'Detail',
    st_detail_hint: 'Lower keeps big shapes, higher keeps fine detail',
    st_contrast: 'Contrast',
    st_thickness: 'Line weight',
    st_noise: 'Noise removal',
    st_noise_hint: 'Cleans up specks and small blotches',
    invert: 'Invert',
    flip: 'Mirror for transfer paper',
    transparent_bg: 'Transparent background',
    st_to_bg: 'Back to background',
    export_title: 'Export',
    quality: 'Resolution',
    q_screen: 'Screen',
    q_high: 'High',
    q_max: 'Max',
    save_bg: 'Cutout PNG',
    save_stencil: 'Stencil PNG',
    print: 'Print',
    export_note: 'PNG keeps the transparent background.',
    footer: '100% in your browser · nothing is uploaded',
    drop_release: 'Drop to start',
    working: 'Working…',
    bad_file: 'That file is not an image. Try JPG or PNG.',
    too_big: 'That image is too large (max 25MB).',
    heic_err: 'This browser cannot open that HEIC file. Please convert it to JPG first.',
    need_image: 'Load an image first.',
    saved: 'Saved to your downloads.',
    sample_err: 'Could not load the sample.',
    picked: 'Colour set to {c}.',
    pick_hint: 'Tap the image to pick the colour to erase.',
    reset_done: 'Settings reset.'
  };
  const KO = {
    bad_file: '이미지 파일이 아닙니다. JPG나 PNG를 사용해 주세요.',
    too_big: '이미지가 너무 큽니다 (최대 25MB).',
    heic_err: '이 브라우저에서는 이 HEIC 파일을 열 수 없습니다. JPG로 변환해 주세요.',
    need_image: '먼저 이미지를 불러와 주세요.',
    saved: '다운로드 폴더에 저장했습니다.',
    sample_err: '샘플 이미지를 불러오지 못했습니다.',
    picked: '색을 {c}로 지정했습니다.',
    pick_hint: '캔버스를 눌러 지울 색을 고르세요',
    reset_done: '설정을 초기화했습니다.'
  };
  const MODE_HINT = {
    ko: {
      outline: '사진의 경계선만 뽑아 라인 드로잉으로 만듭니다',
      adaptive: '밝고 어두운 영역을 나눠 채색 도안처럼 만듭니다 · 사진에 적합',
      threshold: '임계값 하나를 기준으로 순수 흑백 실루엣을 만듭니다'
    },
    en: {
      outline: 'Traces the edges of the photo into a line drawing',
      adaptive: 'Splits light and shadow like a printable drawing — best for photos',
      threshold: 'Hard black-and-white silhouette at one brightness level'
    }
  };
  let lang = localStorage.getItem('ss.lang') || 'ko';
  const koCache = new Map();

  function collectKo() {
    $$('[data-i18n]').forEach(el => koCache.set(el, el.textContent));
  }
  function t(key, vars) {
    let s = lang === 'en' ? (EN[key] || null) : (KO[key] || null);
    if (!s) {
      // fall back to the Korean text rendered in the page
      const el = $$('[data-i18n="' + key + '"]')[0];
      s = el && koCache.get(el) ? koCache.get(el) : (EN[key] || key);
    }
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const en = EN[key];
      el.textContent = (l === 'en' && en) ? en : (koCache.get(el) || el.textContent);
    });
    $('#langBtn').textContent = l === 'ko' ? 'EN' : 'KO';
    $('#langBtn').setAttribute('aria-label', l === 'ko' ? 'Switch to English' : '한국어로 전환');
    document.title = l === 'en'
      ? 'Stencil Studio — White Background Remover & Photo to Stencil'
      : 'Stencil Studio — 흰 배경 제거 · 스텐실 변환';
    localStorage.setItem('ss.lang', l);
    updateModeHint();
  }

  /* ---------------- state ---------------- */
  const MAX_PREVIEW = 1500;
  const state = {
    bitmap: null,
    name: 'image',
    bg: { on: true, tol: 30, feather: 25, color: '#ffffff', preview: 'checker' },
    st: { on: true, mode: 'outline', threshold: 55, detail: 55, contrast: 50, thickness: 1, noise: 25, invert: false, flip: false, transparent: false },
    view: 'stencil',
    compare: false,
    split: 50,
    quality: 2,
    srcPrev: null, bgPrev: null, outPrev: null,
    eyedrop: false
  };

  /* ---------------- canvas helpers ---------------- */
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const ctx2d = c => c.getContext('2d', { willReadFrequently: true });

  function sourceCanvas(maxDim) {
    const bm = state.bitmap;
    if (!bm) return null;
    const w0 = bm.width || bm.naturalWidth;
    const h0 = bm.height || bm.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const c = canvasOf(w, h);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(bm, 0, 0, w, h);
    return c;
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return [255, 255, 255];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp255(Math.round(v)).toString(16).padStart(2, '0')).join('');

  /* ---------------- step 1: background removal ---------------- */
  function bgRemove(src, o) {
    const w = src.width, h = src.height;
    const out = canvasOf(w, h);
    const img = ctx2d(src).getImageData(0, 0, w, h);
    const d = img.data;
    const key = hexToRgb(o.color);
    const tr = key[0], tg = key[1], tb = key[2];
    const hard = (o.tol / 100) * 150;                 // fully erased up to this distance
    const soft = Math.max(0.8, (o.feather / 100) * 80); // fade width
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;
      const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb;
      const dist = (dr < 0 ? -dr : dr) * 0.30 + (dg < 0 ? -dg : dg) * 0.59 + (db < 0 ? -db : db) * 0.11;
      let al;
      if (dist <= hard) al = 0;
      else if (dist >= hard + soft) al = 1;
      else { const k = (dist - hard) / soft; al = k * k * (3 - 2 * k); }

      if (al <= 0) { d[i + 3] = 0; continue; }
      if (al < 1) {
        // decontaminate edge pixels so no key-colour halo survives
        const inv = 1 / Math.max(al, 0.4);
        d[i] = clamp255(tr + (d[i] - tr) * inv);
        d[i + 1] = clamp255(tg + (d[i + 1] - tg) * inv);
        d[i + 2] = clamp255(tb + (d[i + 2] - tb) * inv);
        d[i + 3] = Math.round(a * al);
      }
    }
    out.getContext('2d').putImageData(img, 0, 0);
    return out;
  }

  /* ---------------- step 2: stencil ---------------- */
  function boxBlur(src, w, h, r) {
    if (r <= 0) return src;
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    const win = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / win;
        sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / win;
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function integralImage(src, w, h) {
    const W = w + 1;
    const I = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      const o = y * w, prev = y * W, cur = (y + 1) * W;
      for (let x = 0; x < w; x++) {
        rowSum += src[o + x];
        I[cur + x + 1] = I[prev + x + 1] + rowSum;
      }
    }
    return I;
  }

  function adaptiveMask(lum, w, h, thresh, detail) {
    const I = integralImage(lum, w, h);
    const W = w + 1;
    const r = Math.max(4, Math.round(34 - detail * 0.28));
    const k = 0.04 + (thresh / 100) * 0.34;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      const iy1 = (y1 + 1) * W, iy0 = y0 * W;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
        const area = (y1 - y0 + 1) * (x1 - x0 + 1);
        const sum = I[iy1 + x1 + 1] - I[iy0 + x1 + 1] - I[iy1 + x0] + I[iy0 + x0];
        const mean = sum / area;
        mask[y * w + x] = lum[y * w + x] < mean * (1 - k) ? 1 : 0;
      }
    }
    return mask;
  }

  function thresholdMask(lum, w, h, thresh) {
    const cut = (thresh / 100) * 255;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < lum.length; i++) if (lum[i] < cut) mask[i] = 1;
    return mask;
  }

  function sobelMask(lum, w, h, thresh, detail) {
    const mask = new Uint8Array(w * h);
    const cutoff = ((thresh / 100) * 235 + 10) * (1.18 - detail / 220);
    for (let y = 1; y < h - 1; y++) {
      const o = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = o + x;
        const tl = lum[i - w - 1], tc = lum[i - w], tr = lum[i - w + 1];
        const ml = lum[i - 1], mr = lum[i + 1];
        const bl = lum[i + w - 1], bc = lum[i + w], br = lum[i + w + 1];
        const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        const gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
        if ((gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy) > cutoff) mask[i] = 1;
      }
    }
    return mask;
  }

  function morph(mask, w, h, k, grow) {
    if (!k) return mask;
    const tmp = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        let v = grow ? 0 : 1;
        const x0 = Math.max(0, x - k), x1 = Math.min(w - 1, x + k);
        for (let xx = x0; xx <= x1; xx++) {
          if (grow) { if (mask[o + xx]) { v = 1; break; } }
          else if (!mask[o + xx]) { v = 0; break; }
        }
        tmp[o + x] = v;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let v = grow ? 0 : 1;
        const y0 = Math.max(0, y - k), y1 = Math.min(h - 1, y + k);
        for (let yy = y0; yy <= y1; yy++) {
          if (grow) { if (tmp[yy * w + x]) { v = 1; break; } }
          else if (!tmp[yy * w + x]) { v = 0; break; }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  }

  function despeckle(mask, w, h, minArea) {
    if (minArea < 3) return mask;
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const comp = new Int32Array(w * h);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      let sp = 0, n = 0;
      stack[sp++] = i; seen[i] = 1;
      while (sp) {
        const p = stack[--sp];
        comp[n++] = p;
        const x = p % w, y = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const q = ny * w + nx;
            if (mask[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
          }
        }
      }
      if (n < minArea) for (let j = 0; j < n; j++) mask[comp[j]] = 0;
    }
    return mask;
  }

  function compose(mask, w, h, o) {
    const img = new ImageData(w, h);
    const d = img.data;
    const transparent = !!o.transparent;
    const invert = !!o.invert;
    const flip = !!o.flip;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const sx = flip ? w - 1 - x : x;
        let ink = mask[row + sx] ? 1 : 0;
        if (invert) ink ^= 1;
        const p = (row + x) * 4;
        if (ink) {
          d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 255;
        } else if (transparent) {
          d[p + 3] = 0;
        } else {
          d[p] = 255; d[p + 1] = 255; d[p + 2] = 255; d[p + 3] = 255;
        }
      }
    }
    const c = canvasOf(w, h);
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  }

  function stencilPass(src, o) {
    const w = src.width, h = src.height, N = w * h;
    const data = ctx2d(src).getImageData(0, 0, w, h).data;
    const lum = new Float32Array(N);
    const cf = 1 + ((o.contrast - 50) / 50) * 1.4;
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      const a = data[p + 3] / 255;
      const l = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) * a + 255 * (1 - a);
      const v = 128 + (l - 128) * cf;
      lum[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    const br = Math.round((o.noise / 100) * 2.6);
    const field = br > 0 ? boxBlur(lum, w, h, br) : lum;

    let mask;
    if (o.mode === 'adaptive') mask = adaptiveMask(field, w, h, o.threshold, o.detail);
    else if (o.mode === 'threshold') mask = thresholdMask(field, w, h, o.threshold);
    else mask = sobelMask(field, w, h, o.threshold, o.detail);

    if (o.thickness > 0) mask = morph(mask, w, h, o.thickness, true);
    else if (o.thickness < 0) mask = morph(mask, w, h, -o.thickness, false);

    const minArea = Math.round(Math.pow(o.noise / 100, 2) * 420);
    if (minArea > 2) mask = despeckle(mask, w, h, minArea);

    return compose(mask, w, h, o);
  }

  /* ---------------- render ---------------- */
  function render() {
    if (!state.bitmap) return;
    const src = sourceCanvas(MAX_PREVIEW);
    state.srcPrev = src;
    state.bgPrev = state.bg.on ? bgRemove(src, state.bg) : src;
    state.outPrev = state.st.on ? stencilPass(state.bgPrev, state.st) : state.bgPrev;
    paint();
  }

  function currentImage() {
    if (!state.srcPrev) return null;
    if (state.view === 'original') return state.srcPrev;
    if (state.view === 'bg') return state.bgPrev;
    return state.outPrev || state.bgPrev || state.srcPrev;
  }

  function paint() {
    const base = $('#cvBase');
    const img = currentImage();
    if (!img) return;
    base.width = img.width;
    base.height = img.height;
    const bx = base.getContext('2d');
    bx.clearRect(0, 0, base.width, base.height);
    bx.drawImage(img, 0, 0);

    // original overlay for compare
    const compareOn = state.compare && state.view !== 'original' && state.srcPrev;
    const layer = $('#layerOrig');
    layer.style.display = compareOn ? 'block' : 'none';
    if (compareOn) {
      const oc = $('#cvOrig');
      oc.width = state.srcPrev.width;
      oc.height = state.srcPrev.height;
      const ox = oc.getContext('2d');
      ox.clearRect(0, 0, oc.width, oc.height);
      ox.drawImage(state.srcPrev, 0, 0);
    }
    $('#splitHandle').hidden = !compareOn;
    $('#canvasBox').style.setProperty('--split', state.split + '%');

    // stage backdrop
    const stage = $('#stage');
    stage.classList.remove('mode-checker', 'mode-white', 'mode-black', 'mode-dark');
    if (state.view === 'original') stage.classList.add('mode-dark');
    else if (state.view === 'bg') stage.classList.add('mode-' + state.bg.preview);
    else stage.classList.add(state.st.on && !state.st.transparent ? 'mode-white' : 'mode-checker');

    $('#dropzone').hidden = true;
    $('#canvasHolder').hidden = false;
    $('#dims').textContent = (state.bitmap.width || state.bitmap.naturalWidth) + ' × ' + (state.bitmap.height || state.bitmap.naturalHeight);
    layoutStage();
  }

  function layoutStage() {
    if (!state.srcPrev || $('#canvasHolder').hidden) return;
    const box = $('#canvasBox');
    const holder = $('.canvas-holder');
    const cw = state.srcPrev.width, ch = state.srcPrev.height;
    const availW = Math.max(80, holder.clientWidth - 32);
    const availH = Math.max(80, holder.clientHeight - 32);
    const s = Math.min(availW / cw, availH / ch);
    box.style.width = Math.max(40, Math.floor(cw * s)) + 'px';
    box.style.height = Math.max(40, Math.floor(ch * s)) + 'px';
  }

  /* ---------------- busy / scheduling ---------------- */
  let renderTimer = null, busyTimer = null, rendering = false, pending = false;

  function showBusy() {
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { $('#busy').hidden = false; }, 160);
  }
  function hideBusy() {
    clearTimeout(busyTimer);
    $('#busy').hidden = true;
  }
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(runRender, 70);
  }
  function runRender() {
    if (!state.bitmap) return;
    if (rendering) { pending = true; return; }
    rendering = true;
    showBusy();
    requestAnimationFrame(() => setTimeout(() => {
      try { render(); }
      catch (err) { console.error(err); }
      finally {
        rendering = false;
        hideBusy();
        if (pending) { pending = false; scheduleRender(); }
      }
    }, 0));
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function stageToast(msg) {
    const el = $('#stageToast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2000);
  }

  /* ---------------- controls ---------------- */
  const RANGES = [
    ['tolerance', 'bg', 'tol', 'outTolerance'],
    ['feather', 'bg', 'feather', 'outFeather'],
    ['threshold', 'st', 'threshold', 'outThreshold'],
    ['detail', 'st', 'detail', 'outDetail'],
    ['contrast', 'st', 'contrast', 'outContrast'],
    ['thickness', 'st', 'thickness', 'outThickness'],
    ['noise', 'st', 'noise', 'outNoise']
  ];

  function syncRange(el) {
    const min = +el.min, max = +el.max, v = +el.value;
    el.style.setProperty('--fill', (((v - min) / (max - min)) * 100) + '%');
  }
  function refreshAllRanges() {
    RANGES.forEach(([id, g, k, out]) => {
      const el = $('#' + id);
      el.value = state[g][k];
      syncRange(el);
      $('#' + out).textContent = (k === 'thickness' && state[g][k] > 0 ? '+' : '') + state[g][k];
    });
  }

  function updateModeHint() {
    const hint = MODE_HINT[lang] || MODE_HINT.ko;
    $('#modeHint').textContent = hint[state.st.mode] || hint.outline;
  }

  function setBgColor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return;
    const v = '#' + m[1].toLowerCase();
    state.bg.color = v;
    $('#bgColor').value = v;
    $('#bgColorHex').value = v;
  }

  function sampleCornerColor(canvas) {
    const w = canvas.width, h = canvas.height;
    const patch = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    const pts = [[0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch]];
    const ctx = ctx2d(canvas);
    let r = 0, g = 0, b = 0, n = 0;
    pts.forEach(([x, y]) => {
      const d = ctx.getImageData(x, y, patch, patch).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    });
    if (!n) return '#ffffff';
    return rgbToHex(r / n, g / n, b / n);
  }

  /* ---------------- file loading ---------------- */
  async function loadFile(file) {
    if (!file) return;
    const isImage = /^image\//.test(file.type) || /\.(jpe?g|png|webp|avif|heic|heif|bmp|gif)$/i.test(file.name || '');
    if (!isImage) { toast(t('bad_file')); return; }
    if (file.size > 25 * 1024 * 1024) { toast(t('too_big')); return; }

    const name = (file.name || 'image').replace(/\.[^.]+$/, '');
    let bmp = null;
    if ('createImageBitmap' in window) {
      try { bmp = await createImageBitmap(file); } catch (e) { bmp = null; }
    }
    if (bmp) { startWith(bmp, name); return; }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); startWith(img, name); };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('heic_err')); };
    img.src = url;
  }

  function startWith(src, name) {
    state.bitmap = src;
    state.name = name || 'image';
    state.view = 'stencil';
    state.compare = false;
    $('#compareBtn').setAttribute('aria-pressed', 'false');
    $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === 'stencil')));

    const probe = sourceCanvas(MAX_PREVIEW);
    setBgColor(sampleCornerColor(probe));

    $('#dropzone').hidden = true;
    $('#canvasHolder').hidden = false;
    runRender();
    setTimeout(layoutStage, 60);
  }

  /* ---------------- export ---------------- */
  function exportTarget(kind, maxDim) {
    const src = sourceCanvas(maxDim);
    if (!src) return null;
    if (kind === 'bg') return state.bg.on ? bgRemove(src, state.bg) : src;
    const bg = state.bg.on ? bgRemove(src, state.bg) : src;
    return state.st.on ? stencilPass(bg, state.st) : bg;
  }

  function canvasToBlob(canvas) {
    return new Promise(res => {
      if (canvas.toBlob) canvas.toBlob(b => res(b), 'image/png');
      else res(null);
    });
  }

  function downloadBlob(blob, filename) {
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return true;
  }

  const QUALITY_DIM = { 1: 1500, 2: 3200, 3: 5000 };

  async function exportPNG(kind) {
    if (!state.bitmap) { toast(t('need_image')); return; }
    showBusy();
    await nextFrame();
    try {
      const canvas = exportTarget(kind, QUALITY_DIM[state.quality] || 3200);
      if (!canvas) return;
      let blob = await canvasToBlob(canvas);
      if (!blob) {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = state.name + '-' + (kind === 'bg' ? 'bg' : 'stencil') + '.png';
        a.click();
        toast(t('saved'));
        return;
      }
      downloadBlob(blob, state.name + '-' + (kind === 'bg' ? 'bg' : 'stencil') + '.png');
      toast(t('saved'));
    } catch (err) {
      console.error(err);
      toast(lang === 'en' ? 'Export failed. Try a lower resolution.' : '저장에 실패했습니다. 해상도를 낮춰보세요.');
    } finally {
      hideBusy();
    }
  }

  async function printResult() {
    if (!state.bitmap) { toast(t('need_image')); return; }
    showBusy();
    await nextFrame();
    try {
      const canvas = exportTarget('stencil', 3200);
      const img = document.createElement('img');
      const area = $('#printArea');
      area.innerHTML = '';
      img.src = canvas.toDataURL('image/png');
      await new Promise(r => { img.onload = r; img.onerror = r; });
      area.appendChild(img);
      window.print();
    } catch (err) {
      console.error(err);
      toast(lang === 'en' ? 'Could not prepare the print.' : '인쇄 준비에 실패했습니다.');
    } finally {
      hideBusy();
    }
  }

  /* ---------------- wiring ---------------- */
  function bind() {
    collectKo();

    // language / theme
    $('#langBtn').addEventListener('click', () => applyLang(lang === 'ko' ? 'en' : 'ko'));
    const theme = localStorage.getItem('ss.theme') || 'dark';
    document.documentElement.dataset.theme = theme;
    $('#themeBtn').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('ss.theme', next);
      $('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#0d0f13' : '#eef0f4');
    });

    // file inputs
    $('#pickBtn').addEventListener('click', () => $('#fileInput').click());
    $('#camBtn').addEventListener('click', () => $('#cameraInput').click());
    $('#newBtn').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; loadFile(f); });
    $('#cameraInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; loadFile(f); });

    // sample
    $('#sampleBtn').addEventListener('click', async () => {
      try {
        const r = await fetch('assets/sample.png', { cache: 'force-cache' });
        if (!r.ok) throw new Error(r.status);
        const blob = await r.blob();
        const file = new File([blob], 'sample.png', { type: blob.type || 'image/png' });
        loadFile(file);
      } catch (e) { console.error(e); toast(t('sample_err')); }
    });

    // ranges
    RANGES.forEach(([id, g, k, out]) => {
      const el = $('#' + id);
      el.addEventListener('input', () => {
        state[g][k] = +el.value;
        $('#' + out).textContent = (k === 'thickness' && +el.value > 0 ? '+' : '') + el.value;
        syncRange(el);
        scheduleRender();
      });
    });

    // bg switches
    $('#bgSwitch').addEventListener('change', e => {
      state.bg.on = e.target.checked;
      $('#cardBg').classList.toggle('is-off', !state.bg.on);
      scheduleRender();
    });
    $('#stSwitch').addEventListener('change', e => {
      state.st.on = e.target.checked;
      $('#cardSt').classList.toggle('is-off', !state.st.on);
      if (state.st.on && state.view !== 'stencil') {
        state.view = 'stencil';
        $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === 'stencil')));
      }
      scheduleRender();
    });

    // color
    const onColor = () => {
      setBgColor($('#bgColor').value);
      scheduleRender();
    };
    $('#bgColor').addEventListener('input', onColor);
    $('#bgColorHex').addEventListener('change', () => {
      const v = $('#bgColorHex').value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v)) { setBgColor(v); scheduleRender(); }
      else $('#bgColorHex').value = state.bg.color;
    });
    $('#autoColorBtn').addEventListener('click', () => {
      if (!state.srcPrev) return;
      setBgColor(sampleCornerColor(state.srcPrev));
      scheduleRender();
      stageToast(lang === 'en' ? 'Corner colour detected' : '모서리 색을 자동으로 잡았습니다');
    });

    // eyedropper
    const setPicking = on => {
      state.eyedrop = on;
      $('#eyedropBtn').setAttribute('aria-pressed', String(on));
      $('#stage').classList.toggle('picking', on);
      if (on) stageToast(t('pick_hint'));
    };
    $('#eyedropBtn').addEventListener('click', () => setPicking(!state.eyedrop));

    $('#stage').addEventListener('click', e => {
      if (!state.eyedrop || !state.srcPrev) return;
      const base = $('#cvBase');
      const r = base.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const x = Math.floor((e.clientX - r.left) / r.width * state.srcPrev.width);
      const y = Math.floor((e.clientY - r.top) / r.height * state.srcPrev.height);
      const px = ctx2d(state.srcPrev).getImageData(Math.min(x, state.srcPrev.width - 1), Math.min(y, state.srcPrev.height - 1), 1, 1).data;
      setBgColor(rgbToHex(px[0], px[1], px[2]));
      setPicking(false);
      scheduleRender();
      stageToast(t('picked', { c: state.bg.color }));
    });

    // bg preview segmented
    $$('#bgPreviewSeg button').forEach(b => b.addEventListener('click', () => {
      state.bg.preview = b.dataset.bgPreview;
      $$('#bgPreviewSeg button').forEach(x => x.classList.toggle('on', x === b));
      if (state.view !== 'bg') {
        state.view = 'bg';
        $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === 'bg')));
      }
      paint();
    }));

    // mode segmented
    $$('#modeSeg button').forEach(b => b.addEventListener('click', () => {
      state.st.mode = b.dataset.mode;
      $$('#modeSeg button').forEach(x => x.classList.toggle('on', x === b));
      updateModeHint();
      if (!state.st.on) {
        state.st.on = true;
        $('#stSwitch').checked = true;
        $('#cardSt').classList.remove('is-off');
      }
      if (state.view !== 'stencil') {
        state.view = 'stencil';
        $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === 'stencil')));
      }
      scheduleRender();
    }));

    // quality
    $$('#qualitySeg button').forEach(b => b.addEventListener('click', () => {
      state.quality = +b.dataset.q;
      $$('#qualitySeg button').forEach(x => x.classList.toggle('on', x === b));
    }));

    // chain buttons
    const goView = v => {
      state.view = v;
      $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === v)));
      paint();
      if (window.innerWidth <= 900) $('#panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $('#toStencilBtn').addEventListener('click', () => {
      if (!state.bitmap) { toast(t('need_image')); return; }
      state.st.on = true;
      $('#stSwitch').checked = true;
      $('#cardSt').classList.remove('is-off');
      goView('stencil');
      runRender();
      $('#cardSt').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#toBgBtn').addEventListener('click', () => {
      goView('bg');
      $('#cardBg').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // stage tabs
    $$('.tab').forEach(b => b.addEventListener('click', () => {
      if (!state.bitmap) return;
      state.view = b.dataset.view;
      $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      paint();
    }));

    // compare
    $('#compareBtn').addEventListener('click', () => {
      if (!state.bitmap) return;
      state.compare = !state.compare;
      $('#compareBtn').setAttribute('aria-pressed', String(state.compare));
      if (state.compare && state.view === 'original') {
        state.view = 'stencil';
        $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === 'stencil')));
      }
      paint();
    });

    // split drag
    const handle = $('#splitHandle');
    let dragging = false;
    handle.addEventListener('pointerdown', e => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const r = $('#canvasBox').getBoundingClientRect();
      state.split = Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100));
      $('#canvasBox').style.setProperty('--split', state.split + '%');
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointercancel', () => { dragging = false; });

    // exports
    $('#exportBgBtn').addEventListener('click', () => exportPNG('bg'));
    $('#exportStBtn').addEventListener('click', () => exportPNG('stencil'));
    $('#printBtn').addEventListener('click', printResult);

    // reset
    $('#resetBtn').addEventListener('click', () => {
      state.bg = { on: true, tol: 30, feather: 25, color: '#ffffff', preview: 'checker' };
      state.st = { on: true, mode: 'outline', threshold: 55, detail: 55, contrast: 50, thickness: 1, noise: 25, invert: false, flip: false, transparent: false };
      state.quality = 2;
      state.compare = false;
      state.split = 50;
      $('#bgSwitch').checked = true; $('#stSwitch').checked = true;
      $('#cardBg').classList.remove('is-off'); $('#cardSt').classList.remove('is-off');
      $('#invertSwitch').checked = false; $('#flipSwitch').checked = false; $('#transSwitch').checked = false;
      $$('#modeSeg button').forEach(x => x.classList.toggle('on', x.dataset.mode === 'outline'));
      $$('#qualitySeg button').forEach(x => x.classList.toggle('on', x.dataset.q === '2'));
      $$('#bgPreviewSeg button').forEach(x => x.classList.toggle('on', x.dataset.bgPreview === 'checker'));
      $('#compareBtn').setAttribute('aria-pressed', 'false');
      refreshAllRanges();
      updateModeHint();
      if (state.bitmap) { setBgColor(sampleCornerColor(sourceCanvas(MAX_PREVIEW))); runRender(); }
      toast(t('reset_done'));
    });

    // stencil switches
    [['invertSwitch', 'invert'], ['flipSwitch', 'flip'], ['transSwitch', 'transparent']].forEach(([id, key]) => {
      $('#' + id).addEventListener('change', e => {
        state.st[key] = e.target.checked;
        scheduleRender();
      });
    });

    // drag & drop
    const overlay = $('#dropOverlay');
    let dragDepth = 0;
    window.addEventListener('dragenter', e => {
      if (!e.dataTransfer || Array.from(e.dataTransfer.types).indexOf('Files') < 0) return;
      e.preventDefault(); dragDepth++; overlay.hidden = false;
    });
    window.addEventListener('dragover', e => {
      if (e.dataTransfer) e.preventDefault();
    });
    window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.hidden = true; });
    window.addEventListener('drop', e => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      dragDepth = 0; overlay.hidden = true;
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });

    // paste
    window.addEventListener('paste', e => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === 'file' && /^image\//.test(it.type)) {
          const f = it.getAsFile();
          if (f) { loadFile(f); break; }
        }
      }
    });

    // resize
    let rz = null;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutStage, 80); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutStage, 80); });

    // keyboard: esc cancels eyedropper
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.eyedrop) setPicking(false);
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    bind();
    applyLang(lang);
    refreshAllRanges();
    $('#langBtn').textContent = lang === 'ko' ? 'EN' : 'KO';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
