/* global QRCodeStyling */

(() => {
  const els = {
    // Splitter layout
    sidebar: document.querySelector('.sidebar'),
    splitter: document.getElementById('splitter'),

    // Contenu
    contentType: document.getElementById('contentType'),
    typePanels: Array.from(document.querySelectorAll('.type-panel')),
    urlValue: document.getElementById('urlValue'),
    textValue: document.getElementById('textValue'),
    emailTo: document.getElementById('emailTo'),
    emailSubject: document.getElementById('emailSubject'),
    emailBody: document.getElementById('emailBody'),
    phoneValue: document.getElementById('phoneValue'),
    wifiSsid: document.getElementById('wifiSsid'),
    wifiAuth: document.getElementById('wifiAuth'),
    wifiPass: document.getElementById('wifiPass'),
    wifiHidden: document.getElementById('wifiHidden'),
    vcFirst: document.getElementById('vcFirst'),
    vcLast: document.getElementById('vcLast'),
    vcOrg: document.getElementById('vcOrg'),
    vcPhone: document.getElementById('vcPhone'),
    vcEmail: document.getElementById('vcEmail'),
    vcUrl: document.getElementById('vcUrl'),

    // Styles
    size: document.getElementById('size'),
    sizeLabel: document.getElementById('sizeLabel'),
    resetSize: document.getElementById('resetSize'),
    ecc: document.getElementById('ecc'),
    dotsStyle: document.getElementById('dotsStyle'),
    cornersSquareStyle: document.getElementById('cornersSquareStyle'),
    cornersDotStyle: document.getElementById('cornersDotStyle'),

    // Couleurs - Points
    pointsMode: document.getElementById('pointsMode'), // solid | linear | radial
    pointsSolidPanel: document.getElementById('pointsSolidPanel'),
    pointsGradientPanel: document.getElementById('pointsGradientPanel'),
    pointsRotationField: document.getElementById('pointsRotationField'),
    pointsIntensityField: document.getElementById('pointsIntensityField'),

    pointsColor: document.getElementById('pointsColor'),
    pointsGradRotation: document.getElementById('pointsGradRotation'),
    pointsGradColor1: document.getElementById('pointsGradColor1'),
    pointsGradColor2: document.getElementById('pointsGradColor2'),
    pointsIntensity: document.getElementById('pointsIntensity'),

    // Couleurs - Angles
    cornersMode: document.getElementById('cornersMode'), // solid | linear | radial
    cornersSolidPanel: document.getElementById('cornersSolidPanel'),
    cornersGradientPanel: document.getElementById('cornersGradientPanel'),
    cornersRotationField: document.getElementById('cornersRotationField'),
    cornersIntensityField: document.getElementById('cornersIntensityField'),

    cornersColor: document.getElementById('cornersColor'),
    cornersGradRotation: document.getElementById('cornersGradRotation'),
    cornersGradColor1: document.getElementById('cornersGradColor1'),
    cornersGradColor2: document.getElementById('cornersGradColor2'),
    cornersIntensity: document.getElementById('cornersIntensity'),

    // Fond
    bgColor: document.getElementById('bgColor'),

    // Logo
    logoFile: document.getElementById('logoFile'),
    logoSize: document.getElementById('logoSize'),
    logoSizeLabel: document.getElementById('logoSizeLabel'),
    hideBgDots: document.getElementById('hideBgDots'),
    clearLogo: document.getElementById('clearLogo'),
    logoStatus: document.getElementById('logoStatus'),

    // Preview
    qrcode: document.getElementById('qrcode'),
    payloadPreview: document.getElementById('payloadPreview'),
    statusPill: document.getElementById('statusPill'),
    errorBox: document.getElementById('errorBox'),

    // Actions
    downloadPng: document.getElementById('downloadPng'),
    downloadSvg: document.getElementById('downloadSvg'),
    copyImg: document.getElementById('copyImg'),
    shareBtn: document.getElementById('shareBtn'),

    // Theme + restore
    themeToggle: document.getElementById('themeToggle'),
    restoreConfigBtn: document.getElementById('restoreConfigBtn'),
    restoreConfigInput: document.getElementById('restoreConfigInput'),

    // Panels collapsibles
    panels: Array.from(document.querySelectorAll('.panel[data-collapsible]')),
  };

  const STORAGE = {
    theme: 'qrspa.theme',
  };

  const state = {
    qr: null,
    renderQueued: false,

    themeMode: 'auto',

    logoDataUrl: '',
    logoDeclaredInConfig: false,

    splitterDragging: false,
    splitterStartX: 0,
    sidebarStartWidth: 0,
  };

  // ---------- Utils ----------
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  async function writeFileWithHandle(handle, blob) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  function setStatus(text, kind = 'ok') {
    els.statusPill.textContent = text;
    els.statusPill.dataset.state = kind === 'err' ? 'err' : 'ok';
  }

  function showError(message) {
    els.errorBox.hidden = !message;
    els.errorBox.textContent = message || '';
    if (message) setStatus('Erreur', 'err');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeWifiValue(v) {
    return String(v ?? '').replace(/([\\;,:"])/g, '\\$1');
  }

  function cleanPhone(v) {
    return String(v ?? '').trim().replace(/[^\d+]/g, '');
  }

  function looksLikeEmail(v) {
    const s = String(v ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function normalizeUrl(v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(s)) return `https://${s}`;
    return s;
  }

  function toQuery(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const sv = String(v);
      if (!sv) return;
      usp.set(k, sv);
    });
    const q = usp.toString();
    return q ? `?${q}` : '';
  }

  function degToRad(deg) {
    return (Number(deg) || 0) * Math.PI / 180;
  }

  const supportsFS = typeof window.showSaveFilePicker === 'function';

  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function clamp01(x) {
    const n = Number(x);
    if (Number.isNaN(n)) return 0.5;
    return Math.max(0, Math.min(1, n));
  }

  function baseNameFromFilename(name, ext) {
    const re = new RegExp(`\\.${ext}$`, 'i');
    return String(name || '').replace(re, '') || 'qr-code';
  }

  // ---------- Splitter ----------
  function onSplitterDown(e) {
    state.splitterDragging = true;
    state.splitterStartX = e.clientX;
    state.sidebarStartWidth = els.sidebar.getBoundingClientRect().width;
    document.addEventListener('mousemove', onSplitterMove);
    document.addEventListener('mouseup', onSplitterUp);
    document.body.style.userSelect = 'none';
  }

  function onSplitterMove(e) {
    if (!state.splitterDragging) return;
    const dx = e.clientX - state.splitterStartX;
    const newWidth = clamp(state.sidebarStartWidth + dx, 220, window.innerWidth - 260);
    els.sidebar.style.width = `${newWidth}px`;
  }

  function onSplitterUp() {
    state.splitterDragging = false;
    document.removeEventListener('mousemove', onSplitterMove);
    document.removeEventListener('mouseup', onSplitterUp);
    document.body.style.userSelect = '';
  }

  // ---------- Panels repliables ----------
  function togglePanel(panel) {
    const collapsed = panel.getAttribute('data-collapsed') === 'true';
    panel.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
  }

  function initCollapsibles() {
    els.panels.forEach((panel, index) => {
      // Contenu (0) ouvert, le reste replié
      panel.setAttribute('data-collapsed', index === 0 ? 'false' : 'true');

      const header = panel.querySelector('.panel-header');
      if (!header) return;

      header.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        togglePanel(panel);
      });

      const toggleBtn = panel.querySelector('.panel-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePanel(panel);
        });
      }
    });
  }

  // ---------- Content + validation ----------
  function getContentType() {
    return els.contentType.value;
  }

  function updateTypePanels() {
    const type = getContentType();
    els.typePanels.forEach(p => {
      p.hidden = p.dataset.type !== type;
    });
    showError('');
  }

  function validateAndBuildPayload() {
    const type = getContentType();

    if (type === 'url') {
      const raw = els.urlValue.value;
      const normalized = normalizeUrl(raw);
      if (!raw.trim()) return { ok: false, error: 'Veuillez saisir une URL.' };
      try {
        new URL(normalized);
        return { ok: true, payload: normalized };
      } catch {
        return { ok: false, error: 'URL invalide. Exemple : https://exemple.com' };
      }
    }

    if (type === 'text') {
      const t = els.textValue.value ?? '';
      if (!t.trim()) return { ok: false, error: 'Veuillez saisir un texte.' };
      return { ok: true, payload: t };
    }

    if (type === 'email') {
      const to = (els.emailTo.value ?? '').trim();
      if (!to) return { ok: false, error: 'Veuillez saisir un email.' };
      if (!looksLikeEmail(to)) return { ok: false, error: 'Format d’email invalide.' };

      const subject = els.emailSubject.value ?? '';
      const body = els.emailBody.value ?? '';
      const query = toQuery({ subject, body });
      return { ok: true, payload: `mailto:${to}${query}` };
    }

    if (type === 'phone') {
      const p = cleanPhone(els.phoneValue.value);
      if (!p) return { ok: false, error: 'Veuillez saisir un numéro.' };
      if (!/^\+?\d{6,15}$/.test(p)) return { ok: false, error: 'Numéro invalide.' };
      return { ok: true, payload: `tel:${p}` };
    }

    if (type === 'wifi') {
      const ssid = (els.wifiSsid.value ?? '').trim();
      const auth = els.wifiAuth.value;
      const pass = els.wifiPass.value ?? '';
      const hidden = !!els.wifiHidden.checked;

      if (!ssid) return { ok: false, error: 'SSID requis (nom du réseau WiFi).' };
      if (auth !== 'nopass' && !pass) return { ok: false, error: 'Mot de passe requis pour un réseau sécurisé.' };

      const payload = `WIFI:T:${escapeWifiValue(auth)};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(pass)};H:${hidden ? 'true' : 'false'};;`;
      return { ok: true, payload };
    }

    if (type === 'vcard') {
      const first = (els.vcFirst.value ?? '').trim();
      const last = (els.vcLast.value ?? '').trim();
      const org = (els.vcOrg.value ?? '').trim();
      const phone = cleanPhone(els.vcPhone.value);
      const email = (els.vcEmail.value ?? '').trim();
      const url = (els.vcUrl.value ?? '').trim();

      if (!first && !last) return { ok: false, error: 'vCard : renseigner au moins un prénom ou un nom.' };
      if (email && !looksLikeEmail(email)) return { ok: false, error: 'vCard : email invalide.' };
      if (url) {
        try { new URL(normalizeUrl(url)); } catch { return { ok: false, error: 'vCard : URL invalide.' }; }
      }

      const lines = [];
      lines.push('BEGIN:VCARD');
      lines.push('VERSION:3.0');
      lines.push(`N:${last};${first};;;`);
      lines.push(`FN:${[first, last].filter(Boolean).join(' ')}`.trim());
      if (org) lines.push(`ORG:${org}`);
      if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      if (url) lines.push(`URL:${normalizeUrl(url)}`);
      lines.push('END:VCARD');

      return { ok: true, payload: lines.join('\n') };
    }

    return { ok: false, error: 'Type de contenu inconnu.' };
  }

  // ---------- Couleurs / gradients (select unique) ----------
    function updateColorPanelsVisibility() {
    const setHidden = (el, hidden) => {
      if (!el) return;
      el.hidden = !!hidden; // reflète l'attribut global "hidden"
    };

    // -------- Points --------
    const pm = (els.pointsMode?.value || 'solid'); // solid | linear | radial
    const pointsIsSolid = pm === 'solid';
    const pointsIsLinear = pm === 'linear';
    const pointsIsRadial = pm === 'radial';

    // Uni: 1 sélecteur uni visible, panneau dégradé caché
    setHidden(els.pointsSolidPanel, !pointsIsSolid);
    setHidden(els.pointsGradientPanel, pointsIsSolid);

    // Dégradé linéaire: 2 couleurs + rotation, intensité cachée
    // Dégradé radial: 2 couleurs + intensité, rotation cachée
    setHidden(els.pointsRotationField, !pointsIsLinear);
    setHidden(els.pointsIntensityField, !pointsIsRadial);

    // -------- Angles --------
    const cm = (els.cornersMode?.value || 'solid'); // solid | linear | radial
    const cornersIsSolid = cm === 'solid';
    const cornersIsLinear = cm === 'linear';
    const cornersIsRadial = cm === 'radial';

    setHidden(els.cornersSolidPanel, !cornersIsSolid);
    setHidden(els.cornersGradientPanel, cornersIsSolid);

    setHidden(els.cornersRotationField, !cornersIsLinear);
    setHidden(els.cornersIntensityField, !cornersIsRadial);
  }


  function buildPointsPaint() {
    const mode = els.pointsMode.value; // solid | linear | radial

    if (mode === 'solid') {
      return { mode: 'solid', color: els.pointsColor.value };
    }

    const type = mode; // linear | radial
    const rotation = mode === 'linear' ? degToRad(els.pointsGradRotation.value) : 0;
    const intensity = clamp01((Number(els.pointsIntensity?.value ?? 50) / 100));

    const offset1 = 0;
    const offset2 = mode === 'radial' ? intensity : 1;

    return {
      mode: 'gradient',
      gradient: {
        type,
        rotation,
        colorStops: [
          { offset: offset1, color: els.pointsGradColor1.value },
          { offset: offset2, color: els.pointsGradColor2.value }
        ]
      }
    };
  }

  function buildCornersPaint() {
    const mode = els.cornersMode.value; // solid | linear | radial

    if (mode === 'solid') {
      return { mode: 'solid', color: els.cornersColor.value };
    }

    const type = mode; // linear | radial
    const rotation = mode === 'linear' ? degToRad(els.cornersGradRotation.value) : 0;
    const intensity = clamp01((Number(els.cornersIntensity?.value ?? 50) / 100));

    const offset1 = 0;
    const offset2 = mode === 'radial' ? intensity : 1;

    return {
      mode: 'gradient',
      gradient: {
        type,
        rotation,
        colorStops: [
          { offset: offset1, color: els.cornersGradColor1.value },
          { offset: offset2, color: els.cornersGradColor2.value }
        ]
      }
    };
  }

  // ---------- Options ----------
  function getOptions() {
    const size = clamp(parseInt(els.size.value, 10) || 320, 128, 1024);

    return {
      size,
      ecc: els.ecc.value,
      background: els.bgColor.value,

      dotsStyle: els.dotsStyle.value,
      cornersSquareStyle: els.cornersSquareStyle.value,
      cornersDotStyle: els.cornersDotStyle.value,

      pointsPaint: buildPointsPaint(),
      cornersPaint: buildCornersPaint(),

      logoSize: Number(els.logoSize.value) || 0.25,
      hideBgDots: !!els.hideBgDots.checked,
    };
  }

  // ---------- QR rendering ----------
  function renderQr(payload, opts) {
    if (!window.QRCodeStyling) {
      throw new Error('La bibliothèque qr-code-styling ne semble pas chargée.');
    }

    const pointsCommon = (opts.pointsPaint.mode === 'gradient' && opts.pointsPaint.gradient)
      ? { gradient: opts.pointsPaint.gradient }
      : { color: opts.pointsPaint.color };

    const cornersCommon = (opts.cornersPaint.mode === 'gradient' && opts.cornersPaint.gradient)
      ? { gradient: opts.cornersPaint.gradient }
      : { color: opts.cornersPaint.color };

    const config = {
      width: opts.size,
      height: opts.size,
      data: payload,

      qrOptions: { errorCorrectionLevel: opts.ecc },

      dotsOptions: {
        type: opts.dotsStyle,
        ...pointsCommon
      },

      cornersSquareOptions: {
        type: opts.cornersSquareStyle,
        ...cornersCommon
      },

      cornersDotOptions: {
        type: opts.cornersDotStyle,
        ...cornersCommon
      },

      backgroundOptions: {
        color: opts.background
      },

      image: state.logoDataUrl || undefined,
      imageOptions: {
        imageSize: opts.logoSize,
        hideBackgroundDots: opts.hideBgDots,
        margin: 4
      }
    };

    if (!state.qr) {
      els.qrcode.innerHTML = '';
      state.qr = new QRCodeStyling(config);
      state.qr.append(els.qrcode);
    } else {
      state.qr.update(config);
    }
  }

  function scheduleRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      render();
    });
  }

  function render() {
    showError('');
    setStatus('Génération…', 'ok');

    const opts = getOptions();
    const res = validateAndBuildPayload();

    if (!res.ok) {
      if (state.qr) state.qr.update({ data: ' ' });
      els.payloadPreview.textContent = '';
      showError(res.error);
      return;
    }

    const payload = res.payload;
    els.payloadPreview.textContent = payload;

    try {
      renderQr(payload, opts);
      setStatus('OK', 'ok');
    } catch (e) {
      showError(e?.message || 'Erreur de génération.');
    }
  }

  // ---------- Config JSON ----------
  function buildConfigFromUI(payload) {
    const opts = getOptions();

    const pointsMode = els.pointsMode.value;  // solid | linear | radial
    const cornersMode = els.cornersMode.value; // solid | linear | radial

    return {
      version: 2,
      type: getContentType(),
      payload,
      options: {
        size: opts.size,
        ecc: opts.ecc,
        background: opts.background,

        dotsStyle: opts.dotsStyle,
        cornersSquareStyle: opts.cornersSquareStyle,
        cornersDotStyle: opts.cornersDotStyle,

        points: {
          mode: pointsMode,
          solidColor: els.pointsColor.value,
          color1: els.pointsGradColor1.value,
          color2: els.pointsGradColor2.value,
          rotationDeg: Number(els.pointsGradRotation.value) || 0,
          intensity: Number(els.pointsIntensity?.value ?? 50) || 50,
        },

        corners: {
          mode: cornersMode,
          solidColor: els.cornersColor.value,
          color1: els.cornersGradColor1.value,
          color2: els.cornersGradColor2.value,
          rotationDeg: Number(els.cornersGradRotation.value) || 0,
          intensity: Number(els.cornersIntensity?.value ?? 50) || 50,
        },

        logo: {
          size: Number(els.logoSize.value) || 0.25,
          hideBgDots: !!els.hideBgDots.checked,
          present: !!state.logoDataUrl
        }
      }
    };
  }

  function applyConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;

    if (cfg.type) {
      els.contentType.value = cfg.type;
      updateTypePanels();
    }

    if (cfg.payload) {
      if (cfg.type === 'url') els.urlValue.value = cfg.payload;
      if (cfg.type === 'text') els.textValue.value = cfg.payload;
    }

    const o = cfg.options || {};

    if (o.size != null) els.size.value = String(o.size);
    if (o.ecc) els.ecc.value = o.ecc;
    if (o.background) els.bgColor.value = o.background;

    if (o.dotsStyle) els.dotsStyle.value = o.dotsStyle;
    if (o.cornersSquareStyle) els.cornersSquareStyle.value = o.cornersSquareStyle;
    if (o.cornersDotStyle) els.cornersDotStyle.value = o.cornersDotStyle;

    // Points
    if (o.points) {
      if (o.points.mode) els.pointsMode.value = o.points.mode;
      if (o.points.solidColor) els.pointsColor.value = o.points.solidColor;
      if (o.points.color1) els.pointsGradColor1.value = o.points.color1;
      if (o.points.color2) els.pointsGradColor2.value = o.points.color2;
      if (o.points.rotationDeg != null) els.pointsGradRotation.value = String(o.points.rotationDeg);
      if (o.points.intensity != null && els.pointsIntensity) els.pointsIntensity.value = String(o.points.intensity);
    }

    // Angles
    if (o.corners) {
      if (o.corners.mode) els.cornersMode.value = o.corners.mode;
      if (o.corners.solidColor) els.cornersColor.value = o.corners.solidColor;
      if (o.corners.color1) els.cornersGradColor1.value = o.corners.color1;
      if (o.corners.color2) els.cornersGradColor2.value = o.corners.color2;
      if (o.corners.rotationDeg != null) els.cornersGradRotation.value = String(o.corners.rotationDeg);
      if (o.corners.intensity != null && els.cornersIntensity) els.cornersIntensity.value = String(o.corners.intensity);
    }

    // Logo
    if (o.logo) {
      if (o.logo.size != null) els.logoSize.value = String(o.logo.size);
      if (o.logo.hideBgDots != null) els.hideBgDots.checked = !!o.logo.hideBgDots;

      state.logoDeclaredInConfig = !!o.logo.present;
      if (state.logoDeclaredInConfig && !state.logoDataUrl) {
        els.logoStatus.textContent = 'Logo manquant (charger le fichier dans la section Logo).';
      } else {
        els.logoStatus.textContent = '';
      }
    }

    updateSizeLabel();
    updateLogoSizeLabel();
    updateColorPanelsVisibility();
  }

  async function handleRestoreFileChange() {
    const file = els.restoreConfigInput.files && els.restoreConfigInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const cfg = safeJsonParse(text, null);
      if (!cfg) throw new Error('JSON de configuration invalide.');
      if (cfg.version !== 2) throw new Error('Version de configuration non supportée.');

      applyConfig(cfg);
      setStatus('Configuration restaurée', 'ok');
      scheduleRender();
    } catch (e) {
      showError(e?.message || 'Impossible de restaurer la configuration.');
    } finally {
      els.restoreConfigInput.value = '';
    }
  }

  function triggerRestore() {
    els.restoreConfigInput.click();
  }

  // ---------- Actions ----------
  async function onDownloadPng() {
    try {
      if (!state.qr) throw new Error('QR non prêt.');

      const res = validateAndBuildPayload();
      if (!res.ok) throw new Error(res.error || 'Contenu invalide.');

      const payload = res.payload;
      const cfg = buildConfigFromUI(payload);

      let pngBlob;
      if (state.qr.getRawData) {
        pngBlob = await state.qr.getRawData('png');
      } else {
        state.qr.download({ name: 'qr-code', extension: 'png' });
        setStatus('PNG téléchargé (sans JSON)', 'ok');
        return;
      }

      const jsonBlob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });

      if (supportsFS) {
        const handlePng = await window.showSaveFilePicker({
          suggestedName: 'qr-code.png',
          types: [{ description: 'Image PNG', accept: { 'image/png': ['.png'] } }]
        });

        await writeFileWithHandle(handlePng, pngBlob);

        const base = baseNameFromFilename(handlePng.name, 'png');
        const jsonName = `${base}.json`;

        // Note : un 2e picker peut apparaître selon navigateur (au minimum le même dossier est proposé).
        const handleJson = await window.showSaveFilePicker({
          suggestedName: jsonName,
          types: [{ description: 'Configuration JSON', accept: { 'application/json': ['.json'] } }],
          startIn: 'downloads'
        });

        await writeFileWithHandle(handleJson, jsonBlob);
        setStatus('PNG + JSON enregistrés', 'ok');
      } else {
        downloadBlob(pngBlob, 'qr-code.png');
        downloadBlob(jsonBlob, 'qr-code.json');
        setStatus('PNG + JSON téléchargés', 'ok');
      }
    } catch (e) {
      showError(e?.message || 'Téléchargement PNG/JSON impossible.');
    }
  }

  async function onDownloadSvg() {
    try {
      if (!state.qr) throw new Error('QR non prêt.');

      const res = validateAndBuildPayload();
      if (!res.ok) throw new Error(res.error || 'Contenu invalide.');

      const payload = res.payload;
      const cfg = buildConfigFromUI(payload);

      let svgBlob;
      if (state.qr.getRawData) {
        svgBlob = await state.qr.getRawData('svg');
      } else {
        state.qr.download({ name: 'qr-code', extension: 'svg' });
        setStatus('SVG téléchargé (sans JSON)', 'ok');
        return;
      }

      const jsonBlob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });

      if (supportsFS) {
        const handleSvg = await window.showSaveFilePicker({
          suggestedName: 'qr-code.svg',
          types: [{ description: 'Image SVG', accept: { 'image/svg+xml': ['.svg'] } }]
        });

        await writeFileWithHandle(handleSvg, svgBlob);

        const base = baseNameFromFilename(handleSvg.name, 'svg');
        const jsonName = `${base}.json`;

        const handleJson = await window.showSaveFilePicker({
          suggestedName: jsonName,
          types: [{ description: 'Configuration JSON', accept: { 'application/json': ['.json'] } }],
          startIn: 'downloads'
        });

        await writeFileWithHandle(handleJson, jsonBlob);
        setStatus('SVG + JSON enregistrés', 'ok');
      } else {
        downloadBlob(svgBlob, 'qr-code.svg');
        downloadBlob(jsonBlob, 'qr-code.json');
        setStatus('SVG + JSON téléchargés', 'ok');
      }
    } catch (e) {
      showError(e?.message || 'Téléchargement SVG/JSON impossible.');
    }
  }

  async function onCopyImage() {
    try {
      if (!state.qr || !state.qr.getRawData) throw new Error('Copie non supportée.');
      const blob = await state.qr.getRawData('png');
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('Presse-papiers image non supporté.');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus('Image copiée', 'ok');
    } catch (e) {
      showError(e?.message || 'Copie impossible.');
    }
  }

  async function onShare() {
    try {
      if (!state.qr || !state.qr.getRawData) throw new Error('Partage non supporté.');
      const blob = await state.qr.getRawData('png');
      const file = new File([blob], 'qr-code.png', { type: 'image/png' });
      const data = { files: [file], title: 'QR code', text: 'QR code généré' };

      if (navigator.canShare && navigator.canShare(data) && navigator.share) {
        await navigator.share(data);
        setStatus('Partagé', 'ok');
        return;
      }
      throw new Error('Web Share API indisponible.');
    } catch (e) {
      showError(e?.message || 'Partage impossible.');
    }
  }

  // ---------- Logo ----------
  async function handleLogoFileChange() {
    const file = els.logoFile.files && els.logoFile.files[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(new Error('Lecture logo impossible.'));
        fr.readAsDataURL(file);
      });

      state.logoDataUrl = dataUrl;
      state.logoDeclaredInConfig = true;
      els.logoStatus.textContent = '';
      scheduleRender();
    } catch (e) {
      showError(e?.message || 'Impossible de charger le logo.');
    }
  }

  function clearLogo() {
    state.logoDataUrl = '';
    state.logoDeclaredInConfig = false;
    els.logoFile.value = '';
    els.logoStatus.textContent = '';
    scheduleRender();
  }

  function updateLogoSizeLabel() {
    const v = Number(els.logoSize.value) || 0.25;
    els.logoSizeLabel.textContent = `${Math.round(v * 100)}%`;
  }

  // ---------- Theme ----------
  function applyTheme(mode) {
    state.themeMode = mode;
    const root = document.documentElement;

    if (mode === 'dark') root.dataset.theme = 'dark';
    else if (mode === 'light') root.dataset.theme = 'light';
    else root.removeAttribute('data-theme');

    els.themeToggle.setAttribute('aria-pressed', mode !== 'auto');
    const label = mode === 'auto' ? 'Auto' : (mode === 'dark' ? 'Sombre' : 'Clair');
    els.themeToggle.textContent = `Thème : ${label}`;

    localStorage.setItem(STORAGE.theme, mode);
  }

  function cycleTheme() {
    const cur = state.themeMode;
    const next = cur === 'auto' ? 'dark' : (cur === 'dark' ? 'light' : 'auto');
    applyTheme(next);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE.theme);
    const mode = saved === 'dark' || saved === 'light' ? saved : 'auto';
    applyTheme(mode);
  }

  // ---------- UI helpers ----------
  function updateSizeLabel() {
    els.sizeLabel.textContent = String(els.size.value);
  }

  // ---------- Init ----------
  function bindEvents() {
    // Splitter
    if (els.splitter) els.splitter.addEventListener('mousedown', onSplitterDown);
    document.addEventListener('mouseup', onSplitterUp);

    // Panels collapsibles
    initCollapsibles();

    // Content type
    els.contentType.addEventListener('change', () => {
      updateTypePanels();
      scheduleRender();
    });

    // Modes couleurs (select)
    [els.pointsMode, els.cornersMode].forEach(el => {
      if (!el) return;
      el.addEventListener('change', () => {
        updateColorPanelsVisibility();
        scheduleRender();
      });
    });

    // Inputs watchers
    const inputsToWatch = [
      // Contenu
      els.urlValue, els.textValue,
      els.emailTo, els.emailSubject, els.emailBody,
      els.phoneValue,
      els.wifiSsid, els.wifiAuth, els.wifiPass, els.wifiHidden,
      els.vcFirst, els.vcLast, els.vcOrg, els.vcPhone, els.vcEmail, els.vcUrl,

      // Styles
      els.size, els.ecc,
      els.dotsStyle, els.cornersSquareStyle, els.cornersDotStyle,

      // Couleurs points
      els.pointsColor, els.pointsGradRotation, els.pointsGradColor1, els.pointsGradColor2, els.pointsIntensity,

      // Couleurs angles
      els.cornersColor, els.cornersGradRotation, els.cornersGradColor1, els.cornersGradColor2, els.cornersIntensity,

      // Fond
      els.bgColor,

      // Logo
      els.logoSize, els.hideBgDots,
    ];

    inputsToWatch.forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        if (el === els.size) updateSizeLabel();
        if (el === els.logoSize) updateLogoSizeLabel();
        scheduleRender();
      });
      if (el.tagName === 'SELECT') el.addEventListener('change', scheduleRender);
      if (el.type === 'checkbox') el.addEventListener('change', scheduleRender);
    });

    els.resetSize.addEventListener('click', () => {
      els.size.value = '320';
      updateSizeLabel();
      scheduleRender();
    });

    // Logo
    els.logoFile.addEventListener('change', handleLogoFileChange);
    els.clearLogo.addEventListener('click', clearLogo);

    // Actions
    els.downloadPng.addEventListener('click', onDownloadPng);
    els.downloadSvg.addEventListener('click', onDownloadSvg);
    els.copyImg.addEventListener('click', onCopyImage);
    els.shareBtn.addEventListener('click', onShare);

    // Theme
    els.themeToggle.addEventListener('click', cycleTheme);

    // Restore JSON
    els.restoreConfigBtn.addEventListener('click', triggerRestore);
    els.restoreConfigInput.addEventListener('change', handleRestoreFileChange);

    // Lightbox logo (header)
    const brandLogoBtn = document.getElementById("brandLogoBtn");
    const logoLightbox = document.getElementById("logoLightbox");

    const closeLogo = () => {
      if (logoLightbox) logoLightbox.hidden = true;
    };

    brandLogoBtn?.addEventListener("click", () => {
      if (logoLightbox) logoLightbox.hidden = false;
    });

    logoLightbox?.addEventListener("click", closeLogo);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLogo();
    });

  }

  function initDefaults() {
    updateSizeLabel();
    updateLogoSizeLabel();
    updateTypePanels();

    // Valeurs par défaut des selects (au cas où)
    if (els.pointsMode && !els.pointsMode.value) els.pointsMode.value = 'solid';
    if (els.cornersMode && !els.cornersMode.value) els.cornersMode.value = 'solid';

    updateColorPanelsVisibility();

    if (!els.urlValue.value) els.urlValue.value = 'https://exemple.com';
    if (els.logoStatus) els.logoStatus.textContent = '';
  }

  function init() {
    initTheme();
    bindEvents();
    initDefaults();
    scheduleRender();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
