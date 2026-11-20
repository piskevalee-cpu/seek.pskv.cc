/* SEEK landing page · real glyphs and pixels from the ratatui interface, running in the browser. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  /* ---------- The real logo bitmap (crates/seek-tui/src/logo_bitmap.rs) ---------- */
  const LOGO = [
    '    .                    ',
    '  .                      ',
    ' .  # .   ### ### ### # #',
    '   ### .  #   #   #   # #',
    '  #####.  ### ### ### ## ',
    '   ###      # #   #   # #',
    '.   #     ### ### ### # #',
    '  ...                    ',
    '      ..                 '
  ];
  const COLS = 25, ROWS = 9;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function buildLogo(el, half) {
    let html = '';
    if (!half) {
      // Every logo pixel is two columns wide: 50 x 9 cells of `██`.
      for (let r = 0; r < ROWS; r++) {
        let row = '';
        for (let c = 0; c < COLS; c++) {
          const ch = LOGO[r][c];
          const diag = ((c + (ROWS - 1 - r)) / (COLS + ROWS)).toFixed(3);
          const cls = ch === '#' ? 'lit' : ch === '.' ? 'dim' : 'dark';
          const index = r * COLS + c;
          row += `<span class="px ${cls}" style="--d:${diag};--i:${index}">${cls === 'dark' ? '  ' : '██'}</span>`;
        }
        html += `<div class="pixel-row">${row}</div>`;
      }
    } else {
      // Short terminals: two logo pixels share one row, using ▀ ▄ █.
      for (let r = 0; r < ROWS; r += 2) {
        let row = '';
        for (let c = 0; c < COLS; c++) {
          const u = LOGO[r][c] !== ' ';
          const l = (LOGO[r + 1] || '')[c] !== ' ' && (LOGO[r + 1] || '')[c] !== undefined;
          const glyph = u && l ? '█' : u ? '▀' : l ? '▄' : ' ';
          const diag = ((c + (ROWS - 1 - r)) / (COLS + ROWS)).toFixed(3);
          const cls = glyph === ' ' ? 'dark' : 'lit';
          const index = r * COLS + c;
          row += `<span class="px ${cls}" style="--d:${diag};--i:${index}">${glyph}</span>`;
        }
        html += `<div class="pixel-row">${row}</div>`;
      }
    }
    el.innerHTML = html;
  }
  /* The bitmap as solid CSS pixels: no glyph gaps, so it stays crisp at phone sizes. */
  function solid(el, cols, rows, clsFn) {
    el.classList.add('solid-pixels');
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let html = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) html += `<i class="${clsFn ? clsFn(r, c) : ''}"></i>`;
    }
    el.innerHTML = html;
    return Array.from(el.querySelectorAll('i'));
  }
  solid($('#pixelLogoHalf'), COLS, ROWS, (r, c) => {
    const ch = LOGO[r][c];
    return ch === '#' ? 'lit' : ch === '.' ? 'dim' : 'dark';
  });


  const ICON_COLS = 9;
  function buildGrid(el, cols) {
    el.classList.add('pixel-grid');
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let html = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = LOGO[r][c];
        const diag = ((c + (ROWS - 1 - r)) / (COLS + ROWS)).toFixed(3);
        const cls = ch === '#' ? 'lit' : ch === '.' ? 'dim' : 'dark';
        html += `<i class="pel ${cls}" style="--d:${diag};--i:${r * cols + c}"></i>`;
      }
    }
    el.innerHTML = html;
  }
  buildGrid($('#pixelLogo'), COLS);
  document.querySelectorAll('[data-mark]').forEach((el) => buildGrid(el, ICON_COLS));

  /* ---------- Per-character sheen on the impactful words of a heading ---------- */
  document.querySelectorAll('.impact').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const chars = Array.from(text).map((ch, i) => {
      const span = document.createElement('span');
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
      return span;
    });

    let target = 0, current = 0, direction = 1, frameId = null;

    function paint(pos) {
      chars.forEach((c, i) => {
        const d = i - pos;
        const behind = direction > 0 ? d <= 0 : d >= 0;
        const radius = behind ? 7 : 3.5;
        const glow = Math.max(0, 1 - Math.abs(d) / radius);
        const t = Math.pow(glow, 1.4);
        if (t <= 0.01) {
          c.style.color = '';
          c.style.textShadow = '';
          return;
        }
        const mix = (a, b) => Math.round(a + (b - a) * t);
        c.style.color = `rgb(${mix(143, 255)}, ${mix(137, 255)}, ${mix(159, 255)})`;
        c.style.textShadow = `0 0 ${Math.round(6 + 18 * t)}px rgba(226, 205, 255, ${(0.85 * t).toFixed(2)})`;
      });
    }
    function tick() {
      const delta = target - current;
      current += delta * 0.16;
      if (Math.abs(delta) < 0.02) { current = target; frameId = null; paint(current); return; }
      paint(current);
      frameId = requestAnimationFrame(tick);
    }
    function setTarget(x) {
      const rect = el.getBoundingClientRect();
      let nearest = 0, best = Infinity;
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const center = r.left - rect.left + r.width / 2;
        const d = Math.abs(center - x);
        if (d < best) { best = d; nearest = i; }
      });
      if (nearest !== target) direction = nearest > target ? 1 : -1;
      target = nearest;
      if (!frameId) frameId = requestAnimationFrame(tick);
    }
    el.addEventListener('mousemove', (e) => setTarget(e.clientX - el.getBoundingClientRect().left));
    el.addEventListener('mouseleave', () => {
      if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
      target = 0; current = 0;
      chars.forEach((c) => { c.style.color = ''; c.style.textShadow = ''; });
    });
  });

  /* ---------- Real install command for the detected platform ---------- */
  const RAW_INSTALL = 'https://raw.githubusercontent.com/piskevalee-cpu/Seek/main/install.sh';
  function detectOS() {
    const hay = ((navigator.userAgent || '') + ' ' + (navigator.platform || '') + ' ' + (navigator.userAgentData?.platform || '')).toLowerCase();
    if (hay.includes('win')) return 'WINDOWS';
    if (hay.includes('mac') || hay.includes('iphone') || hay.includes('ipad')) return 'MACOS';
    return 'LINUX';
  }
  const os = detectOS();
  $('#installCmd').textContent = os === 'WINDOWS'
    ? `curl -fsSL ${RAW_INSTALL} -o install.sh && sh install.sh`
    : `curl -fsSL ${RAW_INSTALL} | sh`;
  $('#osTag').textContent = os;
  $('#installNote').textContent = os === 'WINDOWS'
    ? 'Detected Windows · run this in Git Bash or WSL'
    : `Detected ${os.charAt(0)}${os.slice(1).toLowerCase()} · pipe the installer to sh`;

  /* ---------- The eight-cell streak (port of shimmer::wave_brightness) ---------- */
  const shimmerLine = $('#shimmerLine');
  const shimmerStatic = $('#shimmerStatic');
  const CELLS = 8, SPEED = 0.12;
  const cells = solid(shimmerLine, CELLS, 1);
  function waveBrightness(tick, index, width, speed) {
    const head = ((tick * speed) % 1) * width;
    let distance = (((index - head) % width) + width) % width;
    distance = Math.min(distance, width - distance);
    const HALF = 1.5;
    if (distance >= HALF) return 0;
    return Math.pow(1 - distance / HALF, 2);
  }
  function paintShimmer(tick) {
    const base = [0x24, 0x28, 0x3b], lit = [0xc0, 0xca, 0xf5];
    cells.forEach((cell, i) => {
      const b = waveBrightness(tick, i, CELLS, SPEED);
      const rgb = base.map((v, k) => Math.round(v + (lit[k] - v) * b));
      cell.style.background = `rgb(${rgb.join(',')})`;
    });
  }
  let tick = 0, shimmerTimer = null;
  function startShimmer() {
    if (reduceMotion) {
      shimmerLine.hidden = true;
      shimmerStatic.hidden = false;
      return;
    }
    paintShimmer(tick);
    shimmerTimer = setInterval(() => { tick++; paintShimmer(tick); }, 110);
  }
  startShimmer();
  $('#shimmerToggle').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (reduceMotion) return;
    if (shimmerTimer) {
      clearInterval(shimmerTimer); shimmerTimer = null;
      btn.textContent = 'Resume the streak';
      btn.setAttribute('aria-pressed', 'true');
    } else {
      tick = 0; startShimmer();
      btn.textContent = 'Freeze the streak';
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  /* ---------- Copy install command ---------- */
  const copyBtn = $('#copyInstall');
  copyBtn.addEventListener('click', async () => {
    const text = $('#installCmd').textContent.trim();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    copyBtn.classList.add('copied');
    $('.copy-label', copyBtn).textContent = 'Copied!';
    showToast('Install command copied');
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      $('.copy-label', copyBtn).textContent = 'Copy';
    }, 1800);
  });

  /* ---------- Topic browser: mark the section in view ---------- */
  const topicItems = Array.from(document.querySelectorAll('.tb-item'));
  const sections = topicItems.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const progress = $('#scrollProgress');
  let scrollQueued = false;
  function onScroll() {
    const marker = window.scrollY + (window.innerWidth <= 640 ? 100 : 130);
    let current = sections[0];
    sections.forEach((s) => { if (s.offsetTop <= marker) current = s; });
    topicItems.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Reveal content as it scrolls into view ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealItems = document.querySelectorAll('.section-head, .specimen, .feature-card, .model-card, .pulse-panel, .roadmap-table, .fs-tree');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('shown');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealItems.forEach((el) => { el.classList.add('reveal'); revealObserver.observe(el); });
  }

  /* ---------- Model picker (LOCAL tag only here, as in the TUI) ---------- */
  const modal = $('#modelModal');
  const pfModel = $('#pfModel'), fsModel = $('#fsModel');
  let lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.model-option')?.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  modal.querySelectorAll('.model-option').forEach((o) => o.addEventListener('click', () => {
    const name = o.dataset.model;
    pfModel.textContent = name;
    fsModel.textContent = name;
    modal.querySelectorAll('.model-option').forEach((x) => x.classList.remove('selected'));
    o.classList.add('selected');
    closeModal();
    showToast('Model selected: ' + name);
  }));
  $('#modelClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  $('#modelBtn').addEventListener('click', openModal);

  /* ---------- Permission chip: READ → ASK → YOLO ---------- */
  const modes = ['READ', 'ASK', 'YOLO'];
  const modeColors = { READ: 'var(--dim)', ASK: 'var(--warn)', YOLO: 'var(--error)' };
  const modeHints = {
    READ: 'Read mode · writes and commands are denied',
    ASK: 'Ask mode · writes, commands and network calls ask first',
    YOLO: 'Yolo mode · everything is allowed without asking'
  };
  const modeChip = $('#modeChip');
  let modeIndex = 1;
  modeChip.addEventListener('click', () => {
    modeIndex = (modeIndex + 1) % modes.length;
    const mode = modes[modeIndex];
    modeChip.textContent = mode;
    modeChip.style.background = modeColors[mode];
    showToast(modeHints[mode]);
  });

  /* ---------- Real completion behaviour for the prompt specimen ---------- */
  const input = $('#specInput'), completions = $('#completions');
  const commands = [
    { label: '/model', detail: 'switch model' },
    { label: '/tools', detail: 'toggle tools' },
    { label: '/skills', detail: 'toggle skills' },
    { label: '/settings', detail: 'open settings' },
    { label: '/compact', detail: 'compact the context' },
    { label: 'init', detail: 'skill · set up a project' }
  ];
  const files = ['src/main.rs', 'src/parser.rs', 'tests/parser_test.rs', 'docs/SPEC.md', 'README.md'];
  let items = [], active = 0;

  function render(list) {
    items = list; active = 0;
    completions.innerHTML = '';
    list.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'completion-item' + (i === 0 ? ' active' : '');
      b.setAttribute('role', 'option');
      b.innerHTML = `<span class="c-marker">${i === 0 ? '❯' : ' '}</span><span>${esc(it.label)}</span><span class="c-detail">${esc(it.detail)}</span>`;
      b.addEventListener('mousedown', (e) => { e.preventDefault(); accept(i); });
      completions.appendChild(b);
    });
    completions.hidden = list.length === 0;
  }
  function compute(value) {
    const token = value.split(/\s+/).pop();
    if (token.includes('@')) {
      const q = token.split('@').pop().toLowerCase();
      return files.filter((f) => f.toLowerCase().includes(q)).map((f) => ({ label: '@' + f, detail: 'file', insert: '@' + f + ' ' })).slice(0, 6);
    }
    if (token.startsWith('/') || (token && !token.includes('/') && !token.includes('@'))) {
      const q = token.replace(/^\//, '').toLowerCase();
      return commands.filter((c) => c.label.replace(/^\//, '').startsWith(q))
        .map((c) => ({ label: c.label, detail: c.detail, insert: c.label + ' ' })).slice(0, 6);
    }
    return [];
  }
  function accept(i) {
    const it = items[i];
    if (!it) return;
    const parts = input.value.split(/(\s+)/);
    parts[parts.length - 1] = it.insert;
    input.value = parts.join('');
    completions.hidden = true;
    input.focus();
  }
  function move(delta) {
    if (completions.hidden || !items.length) return;
    const nodes = completions.querySelectorAll('.completion-item');
    nodes[active]?.classList.remove('active');
    active = (active + delta + items.length) % items.length;
    nodes[active]?.classList.add('active');
    nodes.forEach((n, i) => { n.querySelector('.c-marker').textContent = i === active ? '❯' : ' '; });
  }
  input.addEventListener('input', () => render(compute(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Tab' && !completions.hidden && items.length) { e.preventDefault(); accept(active); }
    else if (e.key === 'Escape') completions.hidden = true;
    else if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      if (input.value.trim() === '/model') { openModal(); input.value = ''; completions.hidden = true; }
      else if (input.value.trim()) showToast('Command received: ' + input.value.trim());
    }
  });

  /* ---------- More real glyphs: widgets, permissions, context, toggles, wordmark ---------- */
  function drawPanel(el, title, lines, width = 38) {
    const cap = `─ ${title} `;
    const top = `╭${cap}${'─'.repeat(Math.max(0, width - cap.length))}╮`;
    const body = lines.map((l) => `│ ${l.padEnd(width - 2).slice(0, width - 2)} │`);
    const bottom = `╰${'─'.repeat(width)}╯`;
    el.innerHTML = `<pre>${esc([top, ...body, bottom].join('\n'))}</pre>`;
  }
  drawPanel($('#widgetGit'), 'recent commits', [
    'on develop',
    'a1b2c3 fix the parser',
    'd4e5f6 shorten the prompt',
    '7e8f90 add the shimmer'
  ]);
  drawPanel($('#widgetUsage'), 'tokens used', [
    'input  1240000',
    'output  183000'
  ]);

  const permChoices = $('#permChoices');
  permChoices.addEventListener('click', (e) => {
    const btn = e.target.closest('.perm-choice');
    if (!btn) return;
    permChoices.querySelectorAll('.perm-choice').forEach((b) => {
      b.classList.remove('selected');
      b.querySelector('.pm').textContent = ' ';
    });
    btn.classList.add('selected');
    btn.querySelector('.pm').textContent = '❯';
  });

  solid($('#ctxBar'), 20, 1, (r, i) => i < 8 ? 'filled' : 'dark').forEach((el, i) => el.style.setProperty('--i', i));

  $('#toggleGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle');
    if (!btn) return;
    const on = btn.classList.toggle('on');
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.tbox').textContent = on ? '[x]' : '[ ]';
  });

  const FONT = {
    S: ['.###.', '#....', '.###.', '...#.', '###..'],
    E: ['#####', '#....', '####.', '#....', '#####'],
    K: ['#...#', '#..#.', '###..', '#..#.', '#...#']
  };
  solid($('#pixelWord'), 20, 5, (row, col) =>
    FONT['SEEK'[Math.floor(col / 5)]][row][col % 5] === '#' ? 'on' : 'dark')
    .forEach((el, i) => el.style.setProperty('--i', i));

  const shades = { '░': '#2f2b3c', '▒': '#565f89', '▓': '#8f899f', '█': '#c0caf5' };
  const tickerText = $('#pixelTicker').textContent;
  solid($('#pixelTicker'), tickerText.length, 1).forEach((el, i) => {
    el.style.background = shades[tickerText[i]] || 'transparent';
    el.style.setProperty('--i', i);
  });
  const rule = $('.pixel-rule');
  const ruleText = rule.dataset.pattern;
  solid(rule, ruleText.length, 1).forEach((el, i) => {
    el.style.background = shades[ruleText[i]] || 'transparent';
    el.style.setProperty('--i', i);
  });

  /* ---------- Repo pulse: live GitHub activity in pixel style ---------- */
  const GH_API = 'https://api.github.com/repos/piskevalee-cpu/Seek';
  function timeAgo(iso) {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24); if (d < 30) return d + 'd ago';
    return Math.floor(d / 30) + 'mo ago';
  }
  async function loadPulse() {
    const status = $('#pulseStatus');
    status.textContent = 'fetching from github…';
    try {
      const headers = { Accept: 'application/vnd.github+json' };
      const [prRes, commitRes] = await Promise.all([
        fetch(GH_API + '/pulls?state=open&per_page=100', { headers }),
        fetch(GH_API + '/commits?per_page=1', { headers })
      ]);
      if (!prRes.ok || !commitRes.ok) throw new Error('HTTP ' + prRes.status);
      const prs = await prRes.json();
      const commits = await commitRes.json();
      const count = Array.isArray(prs) ? prs.length : 0;
      $('#pulsePrValue').textContent = String(count).padStart(2, '0') + ' OPEN';
      $('#pulsePrBar').textContent = '▓'.repeat(Math.min(count, 8)).padEnd(8, '░');
      const pr = Array.isArray(prs) ? prs[0] : null;
      $('#pulsePrTitle').textContent = pr ? pr.title : 'none open';
      $('#pulsePrBy').textContent = pr ? 'by ' + pr.user.login + ' · #' + pr.number : 'quiet repo';
      const commit = Array.isArray(commits) ? commits[0] : null;
      if (commit) {
        $('#pulseCommitTime').textContent = timeAgo(commit.commit.author.date);
        $('#pulseCommit').textContent = commit.sha.slice(0, 7) + ' ' + commit.commit.message.split('\n')[0];
      }
      status.textContent = 'live from github · checked ' + new Date().toLocaleTimeString();
    } catch {
      $('#pulseStatus').textContent = 'github unreachable · showing empty view';
      $('#pulsePrValue').textContent = 'n/a';
      $('#pulsePrBar').textContent = '░░░░░░░░';
      $('#pulsePrTitle').textContent = 'n/a';
      $('#pulsePrBy').textContent = 'api.github.com did not answer';
      $('#pulseCommitTime').textContent = 'n/a';
      $('#pulseCommit').textContent = 'could not reach github';
    }
  }
  $('#pulseRefresh').addEventListener('click', loadPulse);
  loadPulse();

  /* ---------- Dismiss the dropdown when clicking away ---------- */
  document.addEventListener('click', (e) => {
    if (!completions.hidden && !e.target.closest('.prompt-frame')) completions.hidden = true;
  });

  /* ---------- Escape closes overlays ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else if (!completions.hidden) completions.hidden = true;
  });
})();
