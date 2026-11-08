'use strict';
// ─────────────────────────────────────────────────────────────
//  UI: 화면 전환, HUD, 하단 독, 정보 패널, 모달, 입력, 튜토리얼
// ─────────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 저장 ──
const Save = {
  key: 'lantern-keeper.v1',
  data: {
    unlocked: 1, stars: {}, hardStars: {}, endlessBest: {},
    settings: { sfx: true, music: true, dmgNumbers: true, shake: true, lighting: true },
    tutorialDone: false, hero: 'aren', diff: 'normal', stage: 0, seen: {}, resCollapsed: true, upgrades: {}, achievements: {}, life: {},
  },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const d = JSON.parse(raw);
        Object.assign(this.data, d);
        this.data.settings = Object.assign({ sfx: true, music: true, dmgNumbers: true, shake: true, lighting: true }, d.settings || {});
      }
    } catch (e) { /* 저장소 사용 불가: 기본값으로 진행 */ }
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 무시 */ } },
  reset() {
    try { localStorage.removeItem(this.key); } catch (e) { /* 무시 */ }
    location.reload();
  },
};

// ── 업적 ──
const ACHIEVEMENTS = [
  { id: 'first', icon: '★', name: '첫 등불', desc: '속삭이는 숲을 클리어', test: (c) => (c.S.stars[0] || 0) > 0 },
  { id: 'allclear', icon: '✦', name: '원정 완주', desc: '모든 원정지를 클리어', test: (c) => STAGES.every((_, i) => (c.S.stars[i] || 0) > 0) },
  { id: 'threestar', icon: '✶', name: '완벽한 밤', desc: '한 원정지에서 별 3개', test: (c) => Object.values(c.S.stars).some((v) => v >= 3) },
  { id: 'stars12', icon: '✧', name: '별 수집가', desc: '별 12개 모으기', test: (c) => c.T.earned >= 12 },
  { id: 'allstars', icon: '❂', name: '은하수', desc: '보통 난이도 별을 모두 모으기', test: (c) => STAGES.every((_, i) => (c.S.stars[i] || 0) >= 3) },
  { id: 'hardwin', icon: '♛', name: '영웅의 길', desc: '영웅 난이도로 원정지 클리어', test: (c) => Object.values(c.S.hardStars).some((v) => v > 0) },
  { id: 'hardall', icon: '♜', name: '전설이 되다', desc: '모든 원정지를 영웅 난이도로 클리어', test: (c) => STAGES.every((_, i) => (c.S.hardStars[i] || 0) > 0) },
  { id: 'flawless', icon: '◇', name: '무결점', desc: '적을 하나도 놓치지 않고 클리어', test: (c) => c.end && c.end.won && !c.g.endless && c.g.stats.leaked === 0 },
  { id: 'kills1k', icon: '⚑', name: '백전노장', desc: '누적 1,000마리 처치', test: (c) => c.kills >= 1000 },
  { id: 'kills10k', icon: '☾', name: '어둠 사냥꾼', desc: '누적 10,000마리 처치', test: (c) => c.kills >= 10000 },
  { id: 'boss10', icon: '✸', name: '보스 사냥꾼', desc: '누적 보스 10마리 처치', test: (c) => c.bosses >= 10 },
  { id: 'evolve6', icon: '❖', name: '진화의 끝', desc: '한 전투에서 최종 진화 타워 6개', test: (c) => c.g && c.g.towers.filter((t) => t.branch != null).length >= 6 },
  { id: 'resonance', icon: '◆', name: '완전한 공명', desc: '공명 3단계 달성', test: (c) => c.g && Object.values(c.g.res.tier).some((v) => v >= 3) },
  { id: 'harmony', icon: '✹', name: '조화', desc: '6종 타워를 모두 보유', test: (c) => c.g && c.g.res.harmonyOn },
  { id: 'rich', icon: '●', name: '금고지기', desc: '골드 2,000 보유', test: (c) => c.g && c.g.gold >= 2000 },
  { id: 'hero10', icon: '♔', name: '전설의 영웅', desc: '영웅 Lv.10 달성', test: (c) => c.g && c.g.hero.level >= 10 },
  { id: 'runes7', icon: '✺', name: '룬 수집가', desc: '한 전투에서 룬 7개 획득', test: (c) => c.g && c.g.runes.length >= 7 },
  { id: 'endless30', icon: '∞', name: '끝없는 밤', desc: '무한 모드 30웨이브 도달', test: (c) => c.g && c.g.endless && c.g.wave >= 30 },
  { id: 'early50', icon: '»', name: '성급한 지휘관', desc: '조기 호출 누적 50회', test: (c) => c.early >= 50 },
  { id: 'upall', icon: '✪', name: '대가', desc: '별 강화를 모두 습득', test: (c) => UPGRADES.every((u) => (c.S.upgrades[u.id] || 0) >= u.levels.length) },
  { id: 'heroes', icon: '☘', name: '모두의 영웅', desc: '네 영웅으로 각각 한 번씩 승리', test: (c) => HERO_ORDER.every((h) => (c.S.life.heroWins || {})[h]) },
];

const UI = {
  screen: 'title',
  pick: { stage: 0, hero: 'aren', diff: 'normal', endless: false },
  infoKey: '',
  resKey: '',
  previewKey: '',
  hud: {},
  coachStep: -1,
  lastTouchTile: null,

  init() {
    Save.load();
    this.pick.hero = HEROES[Save.data.hero] ? Save.data.hero : 'aren';
    this.pick.diff = DIFFICULTY[Save.data.diff] ? Save.data.diff : 'normal';
    this.pick.stage = clamp(Save.data.stage || 0, 0, Math.min(STAGES.length, Save.data.unlocked) - 1);
    Sfx.sfxOn = Save.data.settings.sfx;
    Sfx.musicOn = Save.data.settings.music;

    // 첫 상호작용 시 오디오 활성화
    const unlock = () => { Sfx.unlock(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    $('#btn-play').onclick = () => { this.click(); this.showStages(); };
    $('#btn-continue').onclick = () => { this.click(); if (!App.resume()) this.toast('저장된 전투를 불러오지 못했습니다'); };
    $('#btn-codex').onclick = () => { this.click(); this.openCodex('tower'); };
    $('#btn-help').onclick = () => { this.click(); this.openHelp(); };
    $('#btn-settings').onclick = () => { this.click(); this.openSettings(); };
    $('#btn-back').onclick = () => { this.click(); this.show('title'); };
    $('#btn-start').onclick = () => this.startSelected();

    this.buildDock();
    this.bindHud();
    this.bindCanvas();
    this.bindKeys();
    window.addEventListener('resize', () => this.layout());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'game' && App.game && !App.paused && !this.modalOpen()) this.openPause();
    });
    TitleBG.start($('#title-bg'));
    this.show('title');
  },

  click() { Sfx.play('click'); },

  refreshContinue() {
    const b = $('#btn-continue');
    const run = RunSave.load();
    b.hidden = !run || !STAGES[run.opts.stage];
    if (!b.hidden) $('#continue-sub').textContent = `${STAGES[run.opts.stage].name} · 웨이브 ${run.wave} · ${HEROES[run.opts.hero].name}`;
  },

  show(name) {
    this.screen = name;
    $('#scr-title').hidden = name !== 'title';
    $('#scr-stages').hidden = name !== 'stages';
    $('#scr-game').hidden = name !== 'game';
    if (name === 'title') { TitleBG.start($('#title-bg')); this.refreshContinue(); } else TitleBG.stop();
    if (name === 'game') requestAnimationFrame(() => this.layout());
  },

  // ═══════════════════ 원정지 선택 ═══════════════════
  showStages() {
    this.show('stages');
    const ub = $('#btn-upgrades');
    ub.onclick = () => { this.click(); this.openUpgrades(); };
    $('#btn-achievements').onclick = () => { this.click(); this.openAchievements(); };
    this.refreshStarCount();
    const list = $('#stage-list');
    list.innerHTML = '';
    STAGES.forEach((st, i) => {
      const locked = i + 1 > Save.data.unlocked;
      const stars = Save.data.stars[i] || 0;
      const hard = Save.data.hardStars[i] || 0;
      const best = Save.data.endlessBest[i];
      const card = document.createElement('button');
      card.className = 'stage-card' + (locked ? ' locked' : '') + (i === this.pick.stage ? ' selected' : '');
      card.disabled = false;
      card.innerHTML = `
        <canvas></canvas>
        ${locked ? '<span class="lock-note">이전 원정지를 클리어하면 열립니다</span>' : ''}
        <div class="stage-meta">
          <p class="en">${esc(st.en)}</p>
          <h3>${i + 1}. ${esc(st.name)}</h3>
          <p>${esc(st.desc)}</p>
          <div class="stage-tags">
            <span class="tag">웨이브 ${st.waves}</span>
            <span class="tag">경로 ${st.paths.length}</span>
            <span class="tag">보스 ${Object.values(st.bosses).map((b) => esc(ENEMIES[b].name)).join(', ')}</span>
          </div>
          <div class="stage-best">
            <span class="stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</span>
            ${hard ? `<span class="crown">영웅 난이도 ${'★'.repeat(hard)}</span>` : ''}
            ${best ? `<span>무한 최고 ${best}웨이브</span>` : ''}
          </div>
        </div>`;
      card.onclick = () => {
        if (locked) { Sfx.play('deny'); return; }
        this.click();
        this.pick.stage = i;
        $$('.stage-card', list).forEach((c, k) => c.classList.toggle('selected', k === i));
        this.updateLoadout();
      };
      list.appendChild(card);
      requestAnimationFrame(() => Icons.stageThumb($('canvas', card), i, 360, 216));
    });

    const ho = $('#hero-options');
    ho.innerHTML = '';
    for (const id of HERO_ORDER) {
      const h = HEROES[id];
      const b = document.createElement('button');
      b.className = 'hero-opt' + (id === this.pick.hero ? ' selected' : '');
      b.style.setProperty('--hc', h.color);
      b.innerHTML = `<canvas></canvas><div><b>${esc(h.name)}</b><span class="role">${esc(h.role)}</span></div>
        <p>${esc(h.title)} — ${esc(h.desc)}</p>
        <div class="skill-line"><b style="font-size:12px">${esc(h.skill.name)}</b> · ${esc(h.skill.desc)}</div>`;
      Icons.hero($('canvas', b), id, 56);
      b.onclick = () => {
        this.click();
        this.pick.hero = id;
        $$('.hero-opt', ho).forEach((x) => x.classList.toggle('selected', x === b));
      };
      ho.appendChild(b);
    }

    const seg = $('#diff-seg');
    seg.innerHTML = '';
    for (const id of Object.keys(DIFFICULTY)) {
      const b = document.createElement('button');
      b.textContent = DIFFICULTY[id].name;
      b.className = id === this.pick.diff ? 'on' : '';
      b.onclick = () => { this.click(); this.pick.diff = id; this.updateLoadout(); };
      b.dataset.diff = id;
      seg.appendChild(b);
    }
    $('#endless-check').onchange = (e) => { this.pick.endless = e.target.checked; this.updateLoadout(); };
    this.updateLoadout();
  },

  updateLoadout() {
    $$('#diff-seg button').forEach((b) => b.classList.toggle('on', b.dataset.diff === this.pick.diff));
    $('#diff-note').textContent = DIFFICULTY[this.pick.diff].desc;
    const cleared = (Save.data.stars[this.pick.stage] || 0) > 0;
    const chk = $('#endless-check');
    chk.disabled = !cleared;
    if (!cleared) { chk.checked = false; this.pick.endless = false; }
    $('#endless-wrap').classList.toggle('disabled', !cleared);
    const best = Save.data.endlessBest[this.pick.stage];
    $('#endless-note').textContent = cleared ? (best ? `최고 ${best}웨이브` : '끝없이 이어지는 웨이브') : '이 원정지를 클리어하면 열립니다';
  },

  startSelected() {
    this.click();
    Save.data.hero = this.pick.hero;
    Save.data.diff = this.pick.diff;
    Save.data.stage = this.pick.stage;
    Save.save();
    RunSave.clear();
    App.start({ stage: this.pick.stage, hero: this.pick.hero, difficulty: this.pick.diff, endless: this.pick.endless, meta: { ...Save.data.upgrades } });
  },

  // ═══════════════════ 게임 화면 바인딩 ═══════════════════
  buildDock() {
    const dt = $('#dock-towers');
    dt.innerHTML = '';
    for (const type of TOWER_ORDER) {
      const def = TOWERS[type];
      const b = document.createElement('button');
      b.className = 'tower-btn';
      b.dataset.type = type;
      b.setAttribute('aria-label', `${def.name} 건설 (${def.hotkey})`);
      b.innerHTML = `<kbd>${def.hotkey}</kbd><canvas></canvas><span class="t-name">${esc(def.name)}</span><span class="t-cost"><i class="coin"></i><span>${def.levels[0].cost}</span></span>`;
      Icons.tower($('canvas', b), type, 0, null, 40);
      b.onclick = () => this.toggleBuild(type);
      b.onmouseenter = () => this.showTowerTip(b, type);
      b.onmouseleave = () => this.hideTip();
      dt.appendChild(b);
    }
    const ds = $('#dock-spells');
    ds.innerHTML = '';
    for (const id of Object.keys(SPELLS)) {
      const sp = SPELLS[id];
      const b = document.createElement('button');
      b.className = 'ability';
      b.dataset.spell = id;
      b.setAttribute('aria-label', `${sp.name} (${sp.key})`);
      b.innerHTML = `<kbd>${sp.key}</kbd><canvas></canvas><span class="ab-name">${esc(sp.name)}</span><span class="ab-cd"></span>`;
      Icons.spell($('canvas', b), id, 36);
      b.onclick = () => this.armSpell(id);
      b.onmouseenter = () => this.showTip(b, `<b>${esc(sp.name)}</b> <kbd>${sp.key}</kbd><br>${esc(sp.desc)}<br>재사용 대기 ${sp.cd}초`);
      b.onmouseleave = () => this.hideTip();
      ds.appendChild(b);
    }
    const sk = $('#skill-btn');
    sk.onclick = () => this.armSkill();
    sk.onmouseenter = () => {
      if (!App.game) return;
      const s = App.game.hero.def.skill;
      this.showTip(sk, `<b>${esc(s.name)}</b> <kbd>E</kbd><br>${esc(s.desc)}<br>재사용 대기 ${s.cd}초`);
    };
    sk.onmouseleave = () => this.hideTip();
    $('#hero-card').onclick = () => this.selectHero();
  },

  bindHud() {
    $('#btn-next').onclick = () => this.callWave();
    $('#btn-pause').onclick = () => { this.click(); this.openPause(); };
    $$('.speed-group button').forEach((b) => {
      b.onclick = () => {
        this.click();
        // 좁은 화면에선 현재 속도 버튼만 보이므로 누르면 순환
        if (b.classList.contains('on') && window.matchMedia('(max-width: 640px)').matches) this.setSpeed(App.speed >= 3 ? 1 : App.speed + 1);
        else this.setSpeed(Number(b.dataset.speed));
      };
    });
    $('#coach-skip').onclick = () => this.endCoach();
    $('#intro-card').onclick = () => { $('#intro-card').hidden = true; };
  },

  setSpeed(s) {
    App.speed = s;
    $$('.speed-group button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s));
  },

  attachGame(g) {
    this.infoKey = ''; this.resKey = ''; this.previewKey = ''; this.savedWave = g.wave;
    this.hud = { gold: -1, lives: -1, wave: '' };
    $('#hero-name').textContent = g.hero.def.name;
    $('#hero-card').style.setProperty('--hc', g.hero.def.color);
    Icons.hero($('#hero-portrait'), g.heroId, 48);
    this.drawSkillIcon(g);
    $('#info').hidden = true;
    $('#boss-bar').hidden = true;
    $('#intro-card').hidden = true;
    $('#toasts').innerHTML = '';
    $('#res-panel').classList.toggle('collapsed', !!Save.data.resCollapsed);
    this.setSpeed(1);
    g.on('toast', (o) => this.toast(o.text, o.kind));
    g.on('wave', ({ n, info }) => this.onWave(n, info));
    g.on('boss', (e) => this.banner(e.def.name, '보스가 나타났습니다', true));
    g.on('newEnemy', (type) => this.introEnemy(type));
    g.on('runes', (picks) => this.openRunes(picks));
    g.on('end', (r) => { RunSave.clear(); setTimeout(() => this.openResult(r), 1300); });
    g.on('recalc', () => { this.resKey = ''; this.infoKey = ''; });
    this.startCoach(g);
  },

  drawSkillIcon(g) {
    const c = $('#skill-btn canvas');
    const ctx = Icons.prep(c, 36, 36);
    const id = g.hero.def.skill.id;
    const col = g.hero.def.color;
    Glow.draw(ctx, 18, 18, 18, col, 0.7);
    if (id === 'bash') {
      ctx.fillStyle = linGrad(ctx, 8, 6, 26, 30, ['#6fb7ff', '#24497f']);
      circle(ctx, 18, 18, 10); ctx.fill();
      ctx.strokeStyle = '#f2c46d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f2c46d'; star(ctx, 18, 18, 5, 2, 4); ctx.fill();
    } else if (id === 'volley') {
      ctx.strokeStyle = '#e8ffd0'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 5, 6); ctx.lineTo(6 + i * 5, 26); ctx.stroke(); }
      ctx.fillStyle = '#8ef08a'; ellipse(ctx, 16, 28, 11, 3); ctx.fill();
    } else if (id === 'grove') {
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(16, 18, 4, 12);
      ctx.fillStyle = '#5a8a40'; circle(ctx, 18, 14, 8); ctx.fill();
      ctx.fillStyle = '#9be37b'; circle(ctx, 14, 12, 4); ctx.fill();
    } else {
      ctx.strokeStyle = '#ffd6ff'; ctx.lineWidth = 1.8;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(18, 18, 4 + i * 4, i, i + 4); ctx.stroke(); }
    }
    $('#skill-btn .ab-name') || $('#skill-btn').insertAdjacentHTML('beforeend', '<span class="ab-name"></span>');
    $('#skill-btn .ab-name').textContent = g.hero.def.skill.name;
  },

  layout() {
    if (this.screen !== 'game' || !App.game) return;
    const area = $('#stage-area');
    const r = area.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const { cssW, cssH } = Renderer.fit(r.width - 8, r.height - 8);
    const holder = $('#canvas-holder');
    holder.style.width = cssW + 'px';
    holder.style.height = cssH + 'px';
    const freeH = r.width - cssW, freeV = r.height - cssH;
    const stacked = freeV >= 200 && freeV > freeH;
    const side = !stacked && freeH / 2 >= 190;
    area.classList.toggle('stacked', stacked);
    area.classList.toggle('side', side);
    const hr = holder.getBoundingClientRect();
    area.style.setProperty('--cx', `${Math.max(0, hr.left - r.left)}px`);
    area.style.setProperty('--cy', `${Math.max(0, hr.top - r.top)}px`);
    area.style.setProperty('--ch', `${cssH}px`);
    const infoW = side ? Math.min(300, hr.left - r.left - 16) : stacked ? r.width - 16 : 262;
    $('#info').classList.toggle('narrow', infoW < 236);
    if (!this.warnedPortrait && window.innerWidth < 640 && window.innerHeight > window.innerWidth) {
      this.warnedPortrait = true;
      this.toast('화면을 가로로 돌리면 더 크게 볼 수 있습니다');
    }
  },

  // ═══════════════════ 모드 & 선택 ═══════════════════
  toggleBuild(type) {
    const g = App.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    const v = App.view;
    this.hideTip();
    if (v.mode === 'build' && v.buildType === type) { this.cancelMode(); return; }
    this.click();
    v.selected = null;
    v.mode = 'build';
    v.buildType = type;
    this.infoKey = '';
    if (g.gold < g.buildCost(type)) this.toast('골드가 부족합니다', 'warn');
  },

  armSpell(id) {
    const g = App.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    const v = App.view;
    if (g.spells[id] > 0) { Sfx.play('deny'); this.toast(`${SPELLS[id].name} 재사용 대기 중 (${Math.ceil(g.spells[id])}초)`); return; }
    if (v.mode === 'spell' && v.spellId === id) { this.cancelMode(); return; }
    this.click();
    v.mode = 'spell'; v.spellId = id; v.selected = null; this.infoKey = '';
    this.coachEvent('ability');
  },

  armSkill() {
    const g = App.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    const h = g.hero;
    if (!h.alive) { Sfx.play('deny'); this.toast('영웅이 부활을 기다리는 중입니다'); return; }
    if (h.skillT > 0) { Sfx.play('deny'); this.toast(`${h.def.skill.name} 재사용 대기 중 (${Math.ceil(h.skillT)}초)`); return; }
    this.coachEvent('ability');
    if (h.def.skill.target === 'self') { g.castHeroSkill(h.x, h.y); return; }
    const v = App.view;
    if (v.mode === 'skill') { this.cancelMode(); return; }
    this.click();
    v.mode = 'skill'; v.selected = null; this.infoKey = '';
  },

  selectHero() {
    const g = App.game;
    if (!g) return;
    this.click();
    const v = App.view;
    v.mode = 'none';
    v.selected = v.selected && v.selected.kind === 'hero' ? null : { kind: 'hero', ref: g.hero };
    this.infoKey = '';
  },

  cancelMode() {
    const v = App.view;
    v.mode = 'none'; v.buildType = null; v.spellId = null;
    this.infoKey = '';
  },

  select(sel) {
    App.view.selected = sel;
    App.view.mode = 'none';
    this.infoKey = '';
  },

  callWave() {
    const g = App.game;
    if (!g) return;
    if (g.callWave()) { this.coachEvent('call'); }
    else Sfx.play('deny');
  },

  // ═══════════════════ 캔버스 입력 ═══════════════════
  toWorld(ev) {
    const c = $('#game-canvas');
    const r = c.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * WORLD_W, y: ((ev.clientY - r.top) / r.height) * WORLD_H };
  },

  bindCanvas() {
    const c = $('#game-canvas');
    Renderer.init(c);
    c.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      const p = this.toWorld(ev);
      App.view.hoverX = p.x; App.view.hoverY = p.y;
      c.classList.toggle('can-select', App.view.mode === 'none' && !!this.hitTest(p.x, p.y));
    });
    c.addEventListener('pointerleave', (ev) => { if (ev.pointerType !== 'touch') { App.view.hoverX = null; } });
    c.addEventListener('contextmenu', (ev) => { ev.preventDefault(); this.cancelMode(); App.view.selected = null; });
    c.addEventListener('pointerdown', (ev) => {
      if (ev.button === 2) return;
      ev.preventDefault();
      const p = this.toWorld(ev);
      this.onCanvasTap(p.x, p.y, ev);
    });
  },

  hitTest(x, y) {
    const g = App.game;
    if (!g) return null;
    for (const b of Renderer.badges || []) if (dist(x, y, b.x, b.y) <= b.r) return { kind: 'portal' };
    const h = g.hero;
    if (h.alive && dist(x, y, h.x, h.y - 12) < 18) return { kind: 'hero', ref: h };
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (r >= 0 && c >= 0 && r < ROWS && c < COLS && g.occ[r][c]) return { kind: 'tower', ref: g.occ[r][c] };
    let best = null, bd = Infinity;
    for (const e of g.enemies) {
      const lift = e.flying ? (e.boss ? 26 : 18) : 0;
      const d = dist(x, y, e.x, e.y - lift - e.size * 0.2);
      if (d < e.size + 8 && d < bd) { bd = d; best = e; }
    }
    if (best) return { kind: 'enemy', ref: best };
    return null;
  },

  onCanvasTap(x, y, ev) {
    const g = App.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    const v = App.view;
    const touch = ev.pointerType === 'touch';
    // 터치: 첫 탭은 미리보기, 같은 곳을 한 번 더 탭하면 확정
    if (touch && (v.mode === 'build' || v.mode === 'spell' || v.mode === 'skill' || v.mode === 'rally')) {
      const key = v.mode === 'build' ? `${Math.floor(x / TILE)},${Math.floor(y / TILE)}` : null;
      const same = v.hoverX != null && (key ? key === this.lastTouchTile : dist(x, y, v.hoverX, v.hoverY) < TILE * 0.7);
      if (!same) {
        v.hoverX = x; v.hoverY = y; this.lastTouchTile = key;
        if (v.mode === 'build' && g.occ[Math.floor(y / TILE)] && g.occ[Math.floor(y / TILE)][Math.floor(x / TILE)]) {
          // 타워를 눌렀다면 선택으로 전환
        } else return;
      }
    }
    if (touch) { v.hoverX = x; v.hoverY = y; }

    if (v.mode === 'build') {
      const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
      if (r >= 0 && c >= 0 && r < ROWS && c < COLS && g.occ[r][c]) { this.cancelMode(); this.select({ kind: 'tower', ref: g.occ[r][c] }); return; }
      const res = g.build(v.buildType, c, r);
      if (!res.ok) { if (res.reason) this.toast(res.reason, 'warn'); Sfx.play('deny'); return; }
      this.coachEvent('build');
      const keep = ev.shiftKey && g.gold >= g.buildCost(v.buildType);
      if (!keep) { this.cancelMode(); this.select({ kind: 'tower', ref: res.tower }); }
      if (touch) { v.hoverX = null; this.lastTouchTile = null; }
      return;
    }
    if (v.mode === 'spell') {
      if (g.castSpell(v.spellId, x, y)) { this.cancelMode(); if (touch) v.hoverX = null; } else Sfx.play('deny');
      return;
    }
    if (v.mode === 'skill') {
      if (g.castHeroSkill(x, y)) { this.cancelMode(); if (touch) v.hoverX = null; } else Sfx.play('deny');
      return;
    }
    if (v.mode === 'rally') {
      const t = v.selected && v.selected.ref;
      const np = g.nearestPathPoint(x, y);
      if (t && np && np.d < TILE * 0.9 && dist(np.x, np.y, t.x, t.y) <= t.e.range * TILE) {
        t.setRally(np.x, np.y);
        this.click();
        v.mode = 'none';
        this.infoKey = '';
      } else { Sfx.play('deny'); this.toast('병영 사거리 안의 길 위를 선택하세요', 'warn'); }
      return;
    }
    const hit = this.hitTest(x, y);
    if (hit && hit.kind === 'portal') { this.callWave(); return; }
    if (v.selected && v.selected.kind === 'hero') {
      if (hit && hit.kind === 'hero') { this.select(null); return; }
      if (!hit || hit.kind !== 'tower') {
        if (g.hero.alive) {
          g.hero.command(x, y);
          v.moveMarker = { x, y, t: 1 };
          this.click();
          this.coachEvent('hero');
        }
        this.select(null);
        return;
      }
    }
    if (hit) {
      if (v.selected && v.selected.ref === hit.ref) { this.select(null); return; }
      this.click();
      this.select(hit);
      return;
    }
    this.select(null);
  },

  bindKeys() {
    window.addEventListener('keydown', (ev) => {
      if (ev.repeat && ev.key !== ' ') return;
      const k = ev.key.toLowerCase();
      if (this.modalOpen()) {
        if (k === 'escape' && this.modalEsc) { ev.preventDefault(); this.modalEsc(); }
        if (this.modalKeys && this.modalKeys[k]) { ev.preventDefault(); this.modalKeys[k](); }
        return;
      }
      if (this.screen !== 'game' || !App.game) return;
      const g = App.game;
      const v = App.view;
      const code = ev.code;
      const tower = TOWER_ORDER.find((t) => TOWERS[t].hotkey === k || code === `Digit${TOWERS[t].hotkey}` || code === `Numpad${TOWERS[t].hotkey}`);
      if (tower) { this.toggleBuild(tower); return; }
      switch (code) {
        case 'KeyQ': this.armSpell('meteor'); break;
        case 'KeyW': this.armSpell('reinforce'); break;
        case 'KeyE': this.armSkill(); break;
        case 'KeyH': this.selectHero(); break;
        case 'Space': ev.preventDefault(); this.openPause(); break;
        case 'KeyF': this.setSpeed(App.speed >= 3 ? 1 : App.speed + 1); break;
        case 'KeyN': case 'Enter': this.callWave(); break;
        case 'KeyU': {
          if (v.selected && v.selected.kind === 'tower') {
            const t = v.selected.ref;
            if (t.level < 2 && t.branch == null) this.doUpgrade(t, 0);
          }
          break;
        }
        case 'KeyT': {
          if (v.selected && v.selected.kind === 'tower' && v.selected.ref.isAttacker) {
            const t = v.selected.ref;
            const i = TARGET_MODES.findIndex((m) => m.id === t.mode);
            t.mode = TARGET_MODES[(i + 1) % TARGET_MODES.length].id;
            this.toast(`조준: ${TARGET_MODES.find((m) => m.id === t.mode).name}`);
            this.infoKey = '';
          }
          break;
        }
        case 'KeyR': {
          if (v.selected && v.selected.kind === 'tower' && v.selected.ref.type === 'barracks') { v.mode = v.mode === 'rally' ? 'none' : 'rally'; this.infoKey = ''; }
          break;
        }
        case 'Escape': {
          if (v.mode !== 'none') this.cancelMode();
          else if (v.selected) this.select(null);
          else this.openPause();
          break;
        }
      }
    });
  },

  // ═══════════════════ 매 프레임 HUD 갱신 ═══════════════════
  frame(dt) {
    const g = App.game;
    if (!g || this.screen !== 'game') return;
    const h = this.hud;
    if (h.gold !== g.gold) {
      const up = g.gold > h.gold && h.gold >= 0;
      h.gold = g.gold;
      $('#hud-gold').textContent = fmt(g.gold);
      if (up) { const s = $('.stat-gold'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
    }
    if (h.lives !== g.lives) {
      const down = g.lives < h.lives && h.lives >= 0;
      h.lives = g.lives;
      $('#hud-lives').textContent = g.lives;
      if (down) { const s = $('.stat-lives'); s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
    }
    const waveTxt = g.endless ? `${g.wave}` : `${g.wave}/${g.totalWaves}`;
    if (h.wave !== waveTxt) { h.wave = waveTxt; $('#hud-wave').textContent = waveTxt; }

    // 다음 웨이브 버튼
    const nb = $('#btn-next');
    let label, sub = '', disabled = false, pulse = false;
    if (g.state === 'prep') { label = '전투 시작'; sub = `웨이브 1`; pulse = true; }
    else if (g.state === 'won' || g.state === 'lost') { label = g.state === 'won' ? '승리' : '패배'; disabled = true; }
    else if (g.spawning) { label = '진군 중'; sub = `웨이브 ${g.wave}`; disabled = true; }
    else if (g.wave >= g.totalWaves) { label = '최종 웨이브'; sub = '모두 처치하세요'; disabled = true; }
    else { label = '다음 웨이브'; sub = `${Math.ceil(g.countdown || 0)}초 · +${g.earlyBonus}G`; }
    if (nb.dataset.label !== label) { nb.dataset.label = label; $('#nx-label').textContent = label; }
    if (nb.dataset.sub !== sub) { nb.dataset.sub = sub; $('#nx-sub').textContent = sub; }
    nb.disabled = disabled;
    nb.classList.toggle('pulse', pulse);

    // 다음 웨이브 미리보기
    const info = g.waveInfo;
    const pk = info && !g.spawning ? `${info.n}` : (g.spawning ? 'spawning' : 'none');
    if (pk !== this.previewKey) { this.previewKey = pk; this.renderPreview(g.spawning ? null : info); }

    // 독: 타워 버튼
    $$('#dock-towers .tower-btn').forEach((b) => {
      const type = b.dataset.type;
      const cost = g.buildCost(type);
      const costEl = $('.t-cost span', b);
      if (costEl.textContent !== String(cost)) costEl.textContent = cost;
      b.classList.toggle('poor', g.gold < cost);
      b.classList.toggle('armed', App.view.mode === 'build' && App.view.buildType === type);
    });
    $$('#dock-spells .ability').forEach((b) => {
      const id = b.dataset.spell;
      const left = g.spells[id];
      const max = SPELLS[id].cd * g.mods.spellCd;
      this.setCd(b, left, max);
      b.classList.toggle('armed', App.view.mode === 'spell' && App.view.spellId === id);
    });
    const hero = g.hero;
    const sk = $('#skill-btn');
    this.setCd(sk, hero.alive ? hero.skillT : 1, hero.def.skill.cd * g.mods.spellCd, !hero.alive);
    sk.classList.toggle('armed', App.view.mode === 'skill');
    $('#hero-lv').textContent = `Lv.${hero.level}${hero.level >= 10 ? ' (최대)' : ''}`;
    $('#hero-hp').style.width = `${(hero.alive ? hero.hp / hero.maxHp : 0) * 100}%`;
    $('#hero-xp').style.width = `${hero.level >= 10 ? 100 : (hero.xp / hero.xpNeed) * 100}%`;
    const rs = $('#hero-respawn');
    rs.hidden = hero.alive;
    if (!hero.alive) rs.textContent = `부활 ${Math.ceil(hero.respawnT)}초`;
    $('#hero-card').classList.toggle('selected', !!(App.view.selected && App.view.selected.kind === 'hero'));

    // 보스 바
    const boss = g.bossRef;
    const bb = $('#boss-bar');
    if (boss && boss.alive) {
      bb.hidden = false;
      $('#boss-name').textContent = boss.def.name;
      $('#boss-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      $('#boss-shield').style.width = `${boss.maxShield ? (boss.shield / boss.maxHp) * 100 : 0}%`;
    } else bb.hidden = true;

    // 공명 패널
    const rk = JSON.stringify(g.counts) + g.mods.unity + Save.data.resCollapsed;
    if (rk !== this.resKey) { this.resKey = rk; this.renderResonance(g); }

    // 선택 대상이 사라졌으면 해제
    const sel = App.view.selected;
    if (sel) {
      if (sel.kind === 'enemy' && !sel.ref.alive) this.select(null);
      else if (sel.kind === 'tower' && !g.towers.includes(sel.ref)) this.select(null);
    }
    this.updateInfo(g);
    if (App.view.moveMarker) { App.view.moveMarker.t -= dt * 1.8; if (App.view.moveMarker.t <= 0) App.view.moveMarker = null; }
    this.coachTick(g);
    if (g.state === 'running' && !g.spawning && g.countdown != null && !g.paused && g.enemies.length === 0 && this.savedWave !== g.wave) {
      this.savedWave = g.wave;
      RunSave.save(g);
    }
    this.achT = (this.achT || 0) + dt;
    if (this.achT > 1) { this.achT = 0; this.checkAchievements(g); }
  },

  setCd(btn, left, max, blocked) {
    const cd = $('.ab-cd', btn);
    if (left > 0 || blocked) {
      const p = blocked ? 100 : clamp(left / max, 0, 1) * 100;
      cd.style.setProperty('--p', `${p}%`);
      const txt = blocked ? '' : String(Math.ceil(left));
      if (cd.textContent !== txt) cd.textContent = txt;
      btn.classList.remove('ready');
    } else {
      if (cd.textContent) cd.textContent = '';
      cd.style.setProperty('--p', '0%');
      btn.classList.add('ready');
    }
  },

  renderPreview(info) {
    const el = $('#wave-preview');
    el.innerHTML = '';
    if (!info) return;
    const lbl = document.createElement('span');
    lbl.className = 'wp-label';
    lbl.textContent = `W${info.n}`;
    el.appendChild(lbl);
    const types = Object.keys(info.preview).sort((a, b) => (ENEMIES[b].boss ? 1 : 0) - (ENEMIES[a].boss ? 1 : 0));
    for (const t of types) {
      const chip = document.createElement('span');
      const isNew = info.fresh.includes(t) || !App.game.seen.has(t);
      chip.className = 'wp-chip' + (ENEMIES[t].boss ? ' boss' : '') + (isNew ? ' new' : '');
      chip.innerHTML = `<canvas></canvas><b>${info.preview[t]}</b>`;
      chip.title = `${ENEMIES[t].name} ×${info.preview[t]}${isNew ? ' (새로운 적)' : ''}`;
      Icons.enemy($('canvas', chip), t, 30);
      el.appendChild(chip);
    }
  },

  renderResonance(g) {
    const el = $('#res-panel');
    const counts = g.counts;
    const types = TOWER_ORDER.filter((t) => counts[t]);
    if (!types.length) { el.innerHTML = ''; return; }
    const R = g.res;
    const active = types.filter((t) => R.tier[t]);
    const summary = active.map((t) => `<span style="color:${TOWERS[t].color}">◆${R.tier[t]}</span>`).join(' ') + (R.harmonyOn ? ' <span style="color:#fff">✦</span>' : '');
    let html = `<h5><span>공명 ${Save.data.resCollapsed ? `<span class="res-sum">${summary || '<span style="color:var(--dim)">없음</span>'}</span>` : ''}</span><span>${Save.data.resCollapsed ? '▸' : '▾'}</span></h5>`;
    for (const t of types) {
      const def = RESONANCE[t];
      const n = counts[t];
      const tier = R.tier[t];
      const tiers = def.tiers.map((x) => Math.max(1, x - g.mods.unity));
      const next = tiers.find((x) => x > n);
      html += `<div class="res-row ${tier ? 'active' : ''}" style="--c:${TOWERS[t].color}" title="${esc(def.tiers.map((x, i) => `${Math.max(1, x - g.mods.unity)}개: ${def.text[i]}`).join('\n'))}">
        <i></i><span>${esc(def.name)} <span style="color:var(--dim)">${esc(TOWERS[t].name)}</span></span>
        <span class="pips">${n}${next ? '/' + next : ''} ${'◆'.repeat(tier)}${'◇'.repeat(3 - tier)}</span>
        ${tier ? `<span class="eff">${esc(def.text[tier - 1])}</span>` : ''}
      </div>`;
    }
    html += `<div class="res-row ${R.harmonyOn ? 'active' : ''}" style="--c:#ffffff" title="${esc(HARMONY.text)}"><i></i><span>${esc(HARMONY.name)}</span><span class="pips">${types.length}/6</span>${R.harmonyOn ? '<span class="eff">모든 타워 피해 +12%</span>' : ''}</div>`;
    el.innerHTML = html;
    $('h5', el).onclick = () => {
      Save.data.resCollapsed = !Save.data.resCollapsed;
      Save.save();
      el.classList.toggle('collapsed', Save.data.resCollapsed);
      this.resKey = '';
    };
  },

  // ═══════════════════ 정보 패널 ═══════════════════
  updateInfo(g) {
    const v = App.view;
    const el = $('#info');
    let key = 'none';
    if (v.mode === 'build') key = `build:${v.buildType}`;
    else if (v.mode === 'spell') key = `spell:${v.spellId}`;
    else if (v.mode === 'skill') key = 'skill';
    else if (v.selected) {
      const s = v.selected;
      if (s.kind === 'tower') key = `tower:${s.ref.c},${s.ref.r}:${s.ref.level}:${s.ref.branch}:${s.ref.mode}:${v.mode}:${g.wave}`;
      else if (s.kind === 'hero') key = `hero:${s.ref.level}:${s.ref.alive}`;
      else key = `enemy:${s.ref.id}`;
    }
    if (key !== this.infoKey) {
      this.infoKey = key;
      if (key === 'none') { el.hidden = true; el.innerHTML = ''; }
      else {
        el.hidden = false;
        if (v.mode === 'build') this.renderBuildInfo(g, v.buildType);
        else if (v.mode === 'spell') this.renderAbilityInfo(SPELLS[v.spellId].name, SPELLS[v.spellId].desc, '지도에서 대상 지점을 누르세요.');
        else if (v.mode === 'skill') this.renderAbilityInfo(g.hero.def.skill.name, g.hero.def.skill.desc, '지도에서 대상 지점을 누르세요.');
        else if (v.selected.kind === 'tower') this.renderTowerInfo(g, v.selected.ref);
        else if (v.selected.kind === 'hero') this.renderHeroInfo(g, v.selected.ref);
        else this.renderEnemyInfo(g, v.selected.ref);
      }
    }
    if (el.hidden) return;
    // 동적 값
    const s = v.selected;
    if (s && s.kind === 'tower' && v.mode !== 'build') {
      const t = s.ref;
      const sub = $('#ip-sub', el);
      if (sub) sub.textContent = `${t.branch != null ? '최종 진화' : `Lv.${t.level + 1}`} · 처치 ${fmt(t.kills)} · 누적 피해 ${fmt(t.dmgDealt)}`;
      $$('.up-btn', el).forEach((b) => b.classList.toggle('poor', g.gold < Number(b.dataset.cost)));
    } else if (s && s.kind === 'enemy') {
      const e = s.ref;
      const hpEl = $('#ip-hp', el);
      if (hpEl) hpEl.textContent = `${fmt(Math.max(0, e.hp))} / ${fmt(e.maxHp)}${e.shield > 0 ? ` (+보호막 ${fmt(e.shield)})` : ''}`;
      const bar = $('#ip-hpbar', el);
      if (bar) bar.style.width = `${(e.hp / e.maxHp) * 100}%`;
    } else if (s && s.kind === 'hero') {
      const h = s.ref;
      const hpEl = $('#ip-hp', el);
      if (hpEl) hpEl.textContent = h.alive ? `${fmt(h.hp)} / ${fmt(h.maxHp)}` : `부활까지 ${Math.ceil(h.respawnT)}초`;
      const sub = $('#ip-sub', el);
      if (sub) sub.textContent = `Lv.${h.level} · 처치 ${fmt(h.kills)} · 경험치 ${h.level >= 10 ? '최대' : `${Math.floor(h.xp)}/${h.xpNeed}`}`;
    } else if (v.mode === 'build') {
      const b = $('.build-cost', el);
      if (b) b.classList.toggle('poor', g.gold < g.buildCost(v.buildType));
    }
  },

  statRows(g, t, e, prev) {
    const rows = [];
    const d = (cur, old, digits = 0, invert = false) => {
      if (old == null || Math.abs(cur - old) < 1e-6) return '';
      const better = invert ? cur < old : cur > old;
      return `<span class="delta" style="${better ? '' : 'color:var(--bad)'}">→ ${digits ? cur.toFixed(digits) : fmt(cur)}</span>`;
    };
    const p = prev || {};
    const kind = e.kind;
    if (kind !== 'support' && kind !== 'barracks') {
      const dmgLabel = kind === 'beam' ? '초당 피해' : '피해';
      rows.push([dmgLabel, `${fmt(e.dmg)} <small style="color:var(--muted)">${DMG_NAMES[e.dmgType] || ''}</small>${d(p.dmg, prev ? e.dmg : null)}`]);
      if (e.cd) rows.push(['공격속도', `${(1 / e.cd).toFixed(2)}/초${prev && p.cd ? d(1 / p.cd, 1 / e.cd, 2) : ''}`]);
      rows.push(['사거리', `${e.range.toFixed(1)}칸${d(p.range, prev ? e.range : null, 1)}`]);
      if (e.splash) rows.push(['폭발 범위', `${e.splash.toFixed(1)}칸${d(p.splash, prev ? e.splash : null, 1)}`]);
      if (e.slow) rows.push(['둔화', `${pct(e.slow)} · ${e.slowDur.toFixed(1)}초${prev && p.slow ? d(p.slow * 100, e.slow * 100) : ''}`]);
      if (e.chain != null) rows.push(['연쇄', `${e.chain}회${d(p.chain, prev ? e.chain : null)}`]);
      if (e.multishot) rows.push(['동시 사격', `${e.multishot}발`]);
      if (e.crit) rows.push(['치명타', `${pct(e.crit)} ×${e.critMul}`]);
      if (e.armorPen) rows.push(['방어 관통', pct(e.armorPen)]);
      if (e.freezeChance) rows.push(['빙결', `${pct(e.freezeChance)} · ${e.freezeDur}초`]);
      if (e.stun) rows.push(['기절', `${e.stun}초`]);
      if (e.burn) rows.push(['화상', `${fmt(e.burn.dps)}/초`]);
      if (e.fireGround) rows.push(['불바다', `${fmt(e.fireGround.dps)}/초 · ${e.fireGround.dur}초`]);
      if (e.ramp) rows.push(['가속', `최대 ×${e.rampMax}`]);
      rows.push(['공중 공격', e.air ? '가능' : '불가']);
    } else if (kind === 'support') {
      rows.push(['피해 버프', `+${pct(e.buffDmg)}${prev ? d(p.buffDmg * 100, e.buffDmg * 100) : ''}`]);
      rows.push(['공속 버프', `+${pct(e.buffRate)}${prev ? d(p.buffRate * 100, e.buffRate * 100) : ''}`]);
      if (e.buffRange) rows.push(['사거리 버프', `+${e.buffRange}칸`]);
      rows.push(['버프 범위', `${e.range.toFixed(1)}칸${d(p.range, prev ? e.range : null, 1)}`]);
      rows.push(['웨이브 수입', `+${e.income}G${d(p.income, prev ? e.income : null)}`]);
      if (e.killBonus) rows.push(['처치 보너스', `+${e.killBonus}G`]);
    } else {
      rows.push(['병사', `${e.soldiers}명${d(p.soldiers, prev ? e.soldiers : null)}`]);
      rows.push(['병사 체력', `${fmt(e.sHp)}${d(p.sHp, prev ? e.sHp : null)}`]);
      rows.push(['병사 피해', `${fmt(e.sDmg)}${d(p.sDmg, prev ? e.sDmg : null)}`]);
      rows.push(['방어력', `${pct(e.sArmor)}${prev ? d(p.sArmor * 100, e.sArmor * 100) : ''}`]);
      rows.push(['재소집', `${e.respawn}초`]);
      rows.push(['집결 범위', `${e.range.toFixed(1)}칸`]);
      if (e.regen) rows.push(['재생', `${e.regen}/초`]);
      if (e.lifesteal) rows.push(['흡혈', pct(e.lifesteal)]);
    }
    return `<dl class="ip-stats">${rows.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>`;
  },

  renderTowerInfo(g, t) {
    const el = $('#info');
    const e = t.e;
    let preview = null;
    if (t.level < 2 && t.branch == null) {
      const tmp = Object.assign(Object.create(Tower.prototype), t, { level: t.level + 1 });
      g.computeEffective(tmp);
      preview = tmp.e;
    }
    let up = '';
    const opts = g.upgradeOptions(t);
    if (t.branch != null) up = `<div class="maxed">최종 진화 완료</div>`;
    else if (t.level < 2) {
      up = `<button class="up-btn" data-up="0" data-cost="${opts[0].cost}"><b>업그레이드 → Lv.${t.level + 2}</b><span class="cost"><i class="coin"></i>${opts[0].cost}</span><span class="up-desc">초록색 수치가 업그레이드 후 값입니다. <kbd>U</kbd></span></button>`;
    } else {
      up = `<p class="ip-label">최종 진화 — 하나를 선택하세요</p><div class="branches">${opts.map((o, i) => `
        <button class="up-btn branch-btn" data-up="${i}" data-cost="${o.cost}"><canvas data-branch="${i}"></canvas><b>${esc(o.def.name)}</b><span class="cost"><i class="coin"></i>${o.cost}</span><span class="up-desc">${esc(o.def.desc)}</span></button>`).join('')}</div>`;
    }
    const buff = t.buff && t.buff.src ? `<div class="ip-note">성소 축복: 피해 +${pct(t.buff.dmg)}${t.buff.rate ? `, 공속 +${pct(t.buff.rate)}` : ''}${t.buff.range ? `, 사거리 +${t.buff.range}칸` : ''}</div>` : '';
    const target = t.isAttacker ? `<div><p class="ip-label">조준 우선순위 <kbd>T</kbd></p><div class="target-seg">${TARGET_MODES.map((m) => `<button data-mode="${m.id}" class="${t.mode === m.id ? 'on' : ''}">${m.name}</button>`).join('')}</div></div>` : '';
    const rally = t.type === 'barracks' ? `<button class="btn" id="ip-rally">${App.view.mode === 'rally' ? '취소' : '집결지 지정'} <kbd>R</kbd></button>` : '';
    el.innerHTML = `
      <div class="ip-head"><canvas></canvas><div><h3>${esc(t.name)}</h3><p class="ip-sub" id="ip-sub"></p></div><button class="ip-close" aria-label="닫기">×</button></div>
      <p class="ip-desc">${esc(t.branch != null ? t.def.branches[t.branch].desc : t.def.desc)}</p>
      ${this.statRows(g, t, e, preview)}
      ${buff}
      ${target}
      ${up}
      ${App.view.mode === 'rally' ? '<p class="ip-hint">사거리 안의 길 위를 눌러 병사들의 집결지를 지정하세요.</p>' : ''}
      <div class="ip-actions">${rally}<button class="btn btn-danger" id="ip-sell">${t.refund ? '전액 환불' : '판매'} +${g.sellValue(t)}</button></div>
      ${t.refund ? '<p class="ip-hint">다음 웨이브가 시작되기 전까지는 전액 환불됩니다.</p>' : ''}`;
    Icons.tower($('.ip-head canvas', el), t.type, t.level, t.branch, 48);
    $$('canvas[data-branch]', el).forEach((c) => Icons.tower(c, t.type, 2, Number(c.dataset.branch), 40));
    $('.ip-close', el).onclick = () => this.select(null);
    $$('.up-btn', el).forEach((b) => { b.onclick = () => this.doUpgrade(t, Number(b.dataset.up)); });
    $$('.target-seg button', el).forEach((b) => { b.onclick = () => { this.click(); t.mode = b.dataset.mode; this.infoKey = ''; }; });
    const rb = $('#ip-rally', el);
    if (rb) rb.onclick = () => { this.click(); App.view.mode = App.view.mode === 'rally' ? 'none' : 'rally'; this.infoKey = ''; };
    const sb = $('#ip-sell', el);
    sb.onclick = () => {
      if (sb.dataset.confirm) {
        g.sell(t);
        this.select(null);
      } else {
        sb.dataset.confirm = '1';
        sb.textContent = `한 번 더 눌러 판매 (+${g.sellValue(t)})`;
        setTimeout(() => { if (sb.isConnected) { delete sb.dataset.confirm; sb.textContent = `${t.refund ? '전액 환불' : '판매'} +${g.sellValue(t)}`; } }, 2500);
      }
    };
    this.updateInfoSubOnly(t);
  },

  updateInfoSubOnly(t) {
    const sub = $('#ip-sub');
    if (sub) sub.textContent = `${t.branch != null ? '최종 진화' : `Lv.${t.level + 1}`} · 처치 ${fmt(t.kills)} · 누적 피해 ${fmt(t.dmgDealt)}`;
  },

  doUpgrade(t, idx) {
    const g = App.game;
    const r = g.upgrade(t, idx);
    if (!r.ok) { Sfx.play('deny'); this.toast(r.reason, 'warn'); return; }
    this.coachEvent('upgrade');
    this.infoKey = '';
  },

  renderBuildInfo(g, type) {
    const el = $('#info');
    const def = TOWERS[type];
    const tmp = Object.assign(Object.create(Tower.prototype), { type, def, level: 0, branch: null, buff: { dmg: 0, rate: 0, range: 0 }, c: 0, r: 0 });
    g.computeEffective(tmp);
    el.innerHTML = `
      <div class="ip-head"><canvas></canvas><div><h3>${esc(def.name)} 건설</h3><p class="ip-sub">단축키 ${def.hotkey}</p></div><button class="ip-close" aria-label="취소">×</button></div>
      <p class="ip-desc">${esc(def.desc)}</p>
      ${this.statRows(g, tmp, tmp.e, null)}
      <div><p class="ip-label">최종 진화 갈래</p><div class="branch-list" style="display:grid;gap:6px">${def.branches.map((b) => `<div style="font-size:12px;color:var(--muted);padding:6px 8px;border-radius:8px;background:rgba(255,255,255,0.03)"><b style="color:var(--text)">${esc(b.name)}</b> — ${esc(b.desc)}</div>`).join('')}</div></div>
      <div class="up-btn build-cost" style="cursor:default"><b>건설 비용</b><span class="cost"><i class="coin"></i>${g.buildCost(type)}</span><span class="up-desc">빈 땅을 눌러 건설합니다. 우클릭 또는 ESC로 취소. Shift를 누른 채 클릭하면 연속 건설.</span></div>`;
    Icons.tower($('.ip-head canvas', el), type, 0, null, 48);
    $('.ip-close', el).onclick = () => this.cancelMode();
  },

  renderAbilityInfo(name, desc, hint) {
    const el = $('#info');
    el.innerHTML = `<div class="ip-head" style="grid-template-columns:minmax(0,1fr) auto"><div><h3>${esc(name)}</h3><p class="ip-sub">대상 지정</p></div><button class="ip-close" aria-label="취소">×</button></div>
      <p class="ip-desc">${esc(desc)}</p><p class="ip-hint">${esc(hint)} 우클릭 또는 ESC로 취소.</p>`;
    $('.ip-close', el).onclick = () => this.cancelMode();
  },

  renderHeroInfo(g, h) {
    const el = $('#info');
    const d = h.def;
    el.innerHTML = `
      <div class="ip-head"><canvas></canvas><div><h3>${esc(d.name)} <small style="color:var(--muted);font-weight:500">${esc(d.title)}</small></h3><p class="ip-sub" id="ip-sub"></p></div><button class="ip-close" aria-label="닫기">×</button></div>
      <dl class="ip-stats">
        <div class="wide"><dt>체력</dt><dd id="ip-hp"></dd></div>
        <div><dt>피해</dt><dd>${fmt(h.dmg)} <small style="color:var(--muted)">${DMG_NAMES[d.dmgType]}</small></dd></div>
        <div><dt>공격속도</dt><dd>${(1 / d.cd).toFixed(2)}/초</dd></div>
        <div><dt>사거리</dt><dd>${d.range ? d.range + '칸' : '근접'}</dd></div>
        <div><dt>방어력</dt><dd>${pct(d.armor)}</dd></div>
      </dl>
      <div class="ip-note">${esc(d.skill.name)} <kbd>E</kbd> — ${esc(d.skill.desc)}</div>
      <p class="ip-hint">지도를 눌러 영웅을 이동시키세요. 영웅은 지상 적을 막아서며, 레벨이 오를수록 강해집니다(최대 10).</p>`;
    Icons.hero($('.ip-head canvas', el), h.id, 48);
    $('.ip-close', el).onclick = () => this.select(null);
  },

  renderEnemyInfo(g, e) {
    const el = $('#info');
    const d = e.def;
    const traits = [];
    if (d.flying) traits.push('비행');
    if (d.ethereal) traits.push('저지 불가');
    if (d.boss) traits.push('보스');
    if (d.shield) traits.push('보호막');
    el.innerHTML = `
      <div class="ip-head"><canvas></canvas><div><h3>${esc(d.name)}</h3><p class="ip-sub">${traits.map(esc).join(' · ') || '일반'}</p></div><button class="ip-close" aria-label="닫기">×</button></div>
      <div class="hpline"><i id="ip-hpbar"></i></div>
      <dl class="ip-stats">
        <div class="wide"><dt>체력</dt><dd id="ip-hp"></dd></div>
        <div><dt>방어력</dt><dd>${pct(d.armor || 0)}</dd></div>
        <div><dt>마법 저항</dt><dd>${pct(d.mres || 0)}</dd></div>
        <div><dt>이동 속도</dt><dd>${d.speed.toFixed(2)}칸/초</dd></div>
        <div><dt>생명 피해</dt><dd>${d.lives >= 99 ? '즉사' : d.lives}</dd></div>
      </dl>
      <p class="ip-desc">${esc(d.trait)}</p>`;
    Icons.enemy($('.ip-head canvas', el), e.type, 48);
    $('.ip-close', el).onclick = () => this.select(null);
  },

  // ═══════════════════ 알림 ═══════════════════
  toast(text, kind = '') {
    const box = $('#toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.remove(), 2900);
  },

  banner(title, sub, boss) {
    const b = $('#banner');
    $('#banner-title').textContent = title;
    $('#banner-sub').textContent = sub || '';
    $('#banner-sub').hidden = !sub;
    b.classList.remove('show', 'boss');
    void b.offsetWidth;
    b.classList.add('show');
    b.classList.toggle('boss', !!boss);
  },

  onWave(n, info) {
    const g = App.game;
    const parts = Object.keys(info.preview).filter((t) => !ENEMIES[t].boss).map((t) => `${ENEMIES[t].name} ×${info.preview[t]}`);
    this.banner(g.endless ? `무한 웨이브 ${n}` : `웨이브 ${n}`, info.boss ? `보스 출현: ${ENEMIES[info.boss].name}` : parts.slice(0, 3).join(' · '), !!info.boss);
    this.coachEvent('wave', n);
  },

  introEnemy(type) {
    const d = ENEMIES[type];
    Save.data.seen[type] = true;
    Save.save();
    const card = $('#intro-card');
    card.innerHTML = `<canvas></canvas><small>새로운 적</small><b>${esc(d.name)}</b><p>${esc(d.trait)}</p>`;
    Icons.enemy($('canvas', card), type, 48);
    card.hidden = false;
    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(() => { card.hidden = true; }, 7000);
  },

  showTip(anchor, html) {
    const tip = $('#tooltip');
    tip.innerHTML = html;
    tip.hidden = false;
    const r = anchor.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - tr.width / 2;
    x = clamp(x, 8, window.innerWidth - tr.width - 8);
    tip.style.left = x + 'px';
    tip.style.top = Math.max(8, r.top - tr.height - 8) + 'px';
  },
  hideTip() { $('#tooltip').hidden = true; },
  showTowerTip(b, type) {
    const g = App.game;
    const def = TOWERS[type];
    const s = def.levels[0];
    const cost = g ? g.buildCost(type) : s.cost;
    const bits = [];
    if (s.dmg) bits.push(`피해 ${s.dmg}`);
    if (s.range) bits.push(`사거리 ${s.range}칸`);
    if (s.splash) bits.push('범위 공격');
    if (s.slow) bits.push(`둔화 ${pct(s.slow)}`);
    if (s.chain) bits.push(`연쇄 ${s.chain}`);
    if (s.buffDmg) bits.push(`피해 버프 ${pct(s.buffDmg)}`);
    if (s.soldiers) bits.push(`병사 ${s.soldiers}명`);
    this.showTip(b, `<b>${esc(def.name)}</b> <kbd>${def.hotkey}</kbd> · <span class="tt-cost">${cost}G</span><br>${esc(def.desc)}<br><span style="color:var(--dim)">${bits.join(' · ')}</span>`);
  },

  // ═══════════════════ 모달 ═══════════════════
  modalOpen() { return !$('#modal').hidden; },

  openModal(html, { cls = '', esc: escFn = null, keys = null, pause = true } = {}) {
    const layer = $('#modal');
    layer.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    layer.hidden = false;
    this.modalEsc = escFn;
    this.modalKeys = keys;
    if (pause) App.modalPause = true;
    this.hideTip();
    return $('.modal', layer);
  },

  closeModal() {
    const layer = $('#modal');
    layer.hidden = true;
    layer.innerHTML = '';
    this.modalEsc = null;
    this.modalKeys = null;
    App.modalPause = false;
  },

  checkAchievements(g, end) {
    const S = Save.data;
    S.achievements = S.achievements || {};
    S.life = S.life || {};
    const live = g && !end;
    const c = {
      S, g, end, T: this.starTotals(),
      kills: (S.life.kills || 0) + (live ? g.stats.kills : 0),
      bosses: (S.life.bosses || 0) + (live ? g.stats.bossKills : 0),
      early: (S.life.early || 0) + (live ? g.stats.earlyCalls : 0),
    };
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (S.achievements[a.id]) continue;
      let ok = false;
      try { ok = !!a.test(c); } catch (e) { ok = false; }
      if (ok) {
        S.achievements[a.id] = Date.now();
        changed = true;
        this.toast(`업적 달성 — ${a.name}`, 'ach');
        Sfx.play('rune');
      }
    }
    if (changed) Save.save();
  },

  openAchievements() {
    const S = Save.data;
    const done = ACHIEVEMENTS.filter((a) => (S.achievements || {})[a.id]).length;
    const life = S.life || {};
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">ACHIEVEMENTS</p><h2>업적 ${done}/${ACHIEVEMENTS.length}</h2>
        <p class="modal-sub">누적 처치 ${fmt(life.kills || 0)} · 보스 ${fmt(life.bosses || 0)} · 조기 호출 ${fmt(life.early || 0)} · 승리 ${fmt(life.wins || 0)}</p></div>
      <div class="ach-grid">${ACHIEVEMENTS.map((a) => `<div class="ach ${(S.achievements || {})[a.id] ? 'done' : ''}"><i>${a.icon}</i><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
      <div class="modal-actions"><button class="btn btn-primary" data-a="close">닫기</button></div>`, { cls: 'modal-wide', esc: () => this.closeModal(), pause: false });
    $('[data-a=close]', m).onclick = () => { this.click(); this.closeModal(); };
  },

  starTotals() {
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
    const earned = sum(Save.data.stars) + sum(Save.data.hardStars);
    let spent = 0;
    for (const up of UPGRADES) {
      const lv = Save.data.upgrades[up.id] || 0;
      for (let i = 0; i < lv; i++) spent += up.levels[i].cost;
    }
    return { earned, spent, left: earned - spent };
  },

  refreshStarCount() {
    const el = $('#star-count');
    if (el) el.textContent = String(this.starTotals().left);
  },

  openUpgrades() {
    const render = () => {
      const st = this.starTotals();
      const m = this.openModal(`
        <div class="modal-head"><p class="eyebrow">STAR UPGRADES</p><h2>별 강화</h2>
          <p class="modal-sub">원정지에서 얻은 별로 영구 강화를 익힙니다. 영웅 난이도 별도 따로 모입니다. 남은 별 <b style="color:var(--gold)">★ ${st.left}</b> / 모은 별 ${st.earned}</p></div>
        <div class="up-grid">${UPGRADES.map((up) => {
          const lv = Save.data.upgrades[up.id] || 0;
          return `<div class="up-track" style="--c:${up.color}"><div class="up-track-head"><canvas data-sigil="${up.sigil}"></canvas><b>${esc(up.name)}</b><span>${lv}/3</span></div>
            ${up.levels.map((L, i) => {
              const owned = i < lv, next = i === lv, can = next && st.left >= L.cost;
              return `<button class="up-node ${owned ? 'owned' : ''} ${next ? 'next' : ''}" data-up="${up.id}" ${can ? '' : 'disabled'}><span>${esc(L.desc)}</span><span class="up-cost">${owned ? '습득' : `★ ${L.cost}`}</span></button>`;
            }).join('')}</div>`;
        }).join('')}</div>
        <div class="modal-actions"><button class="btn" data-a="reset">초기화 (별 전부 돌려받기)</button><button class="btn btn-primary" data-a="close">닫기</button></div>`,
      { cls: 'modal-wide', esc: () => { this.closeModal(); this.refreshStarCount(); }, pause: false });
      $$('canvas[data-sigil]', m).forEach((c) => Icons.sigil(c, c.dataset.sigil, '#ffffff', 32));
      $$('.up-node', m).forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.up;
          Save.data.upgrades[id] = (Save.data.upgrades[id] || 0) + 1;
          Save.save();
          Sfx.play('upgrade');
          this.checkAchievements();
          render();
        };
      });
      $('[data-a=reset]', m).onclick = () => { Save.data.upgrades = {}; Save.save(); this.click(); render(); };
      $('[data-a=close]', m).onclick = () => { this.click(); this.closeModal(); this.refreshStarCount(); };
    };
    render();
  },

  openPause() {
    if (!App.game || this.modalOpen()) return;
    const g = App.game;
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">PAUSED</p><h2>일시정지</h2>
        <p class="modal-sub">${esc(g.stage.name)} · ${esc(DIFFICULTY[g.diffId].name)}${g.endless ? ' · 무한' : ''} · 웨이브 ${g.wave}${g.endless ? '' : '/' + g.totalWaves}</p></div>
      ${g.runes.length ? `<div class="owned" style="justify-content:center">보유 룬 ${g.runes.map((r) => `<span class="chip r${r.rarity}" title="${esc(r.desc)}">${esc(r.name)}</span>`).join('')}</div>` : ''}
      <div class="modal-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-primary" data-a="resume" style="grid-column:1/-1">계속하기</button>
        <button class="btn" data-a="settings">설정</button>
        <button class="btn" data-a="codex">도감</button>
        <button class="btn" data-a="help">조작법</button>
        <button class="btn" data-a="restart">다시 시작</button>
        <button class="btn btn-danger" data-a="quit" style="grid-column:1/-1">원정지 선택으로</button>
      </div>`, { esc: () => this.closeModal(), keys: { ' ': () => this.closeModal() } });
    m.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-a]');
      if (!a) return;
      this.click();
      switch (a.dataset.a) {
        case 'resume': this.closeModal(); break;
        case 'settings': this.openSettings(() => { this.closeModal(); this.openPause(); }); break;
        case 'codex': this.openCodex('tower', () => { this.closeModal(); this.openPause(); }); break;
        case 'help': this.openHelp(() => { this.closeModal(); this.openPause(); }); break;
        case 'restart': this.confirm('처음부터 다시 시작할까요?', () => { this.closeModal(); App.restart(); }, () => { this.closeModal(); this.openPause(); }); break;
        case 'quit': this.confirm('진행 중인 전투를 포기하고 나갈까요?', () => { this.closeModal(); App.quit(); }, () => { this.closeModal(); this.openPause(); }); break;
      }
    });
  },

  confirm(text, yes, no) {
    const m = this.openModal(`<div class="modal-head"><h2 style="font-size:24px">${esc(text)}</h2></div>
      <div class="modal-actions"><button class="btn" data-a="no">취소</button><button class="btn btn-primary" data-a="yes">확인</button></div>`,
    { cls: '', esc: no });
    $('[data-a=yes]', m).onclick = () => { this.click(); yes(); };
    $('[data-a=no]', m).onclick = () => { this.click(); no(); };
  },

  openRunes(picks) {
    const g = App.game;
    this.cancelMode();
    const card = (r, i) => `<button class="rune-card r${r.rarity}" data-i="${i}"><kbd>${i + 1}</kbd><span class="rarity">${RARITY[r.rarity].name}</span><canvas></canvas><h3>${esc(r.name)}</h3><p>${esc(r.desc)}</p></button>`;
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">WAVE ${g.wave} · RUNE REWARD</p><h2>룬을 하나 선택하세요</h2>
        <p class="modal-sub">고른 룬의 효과는 이번 전투가 끝날 때까지 유지됩니다.</p></div>
      <div class="rune-cards">${picks.map(card).join('')}</div>
      <div class="rune-foot">
        <div class="owned">${g.runes.length ? '보유: ' + g.runes.map((r) => `<span class="chip r${r.rarity}" title="${esc(r.desc)}">${esc(r.name)}</span>`).join('') : '아직 보유한 룬이 없습니다'}</div>
        <button class="btn" id="rune-reroll" ${g.rerolled || g.gold < REROLL_COST ? 'disabled' : ''}>다시 뽑기 (${REROLL_COST}골드)</button>
      </div>`, { cls: 'modal-wide', pause: false, keys: { 1: () => choose(0), 2: () => choose(1), 3: () => choose(2) } });
    $$('.rune-card', m).forEach((b) => {
      const r = picks[Number(b.dataset.i)];
      Icons.sigil($('canvas', b), r.sigil, RARITY[r.rarity].color, 56);
      b.onclick = () => choose(Number(b.dataset.i));
    });
    const choose = (i) => {
      if (!g.runeChoices || !g.runeChoices[i]) return;
      const r = g.runeChoices[i];
      g.chooseRune(i);
      this.closeModal();
      this.toast(`룬 획득: ${r.name}`, r.rarity === 3 ? 'gold' : '');
    };
    $('#rune-reroll', m).onclick = () => {
      if (g.rerollRunes()) { this.closeModal(); this.openRunes(g.runeChoices); }
      else Sfx.play('deny');
    };
  },

  openResult(r) {
    const g = App.game;
    if (!g) return;
    const st = g.stage;
    const idx = g.stageIdx;
    let newBest = false;
    if (g.endless) {
      const best = Save.data.endlessBest[idx] || 0;
      if (g.wave > best) { Save.data.endlessBest[idx] = g.wave; newBest = true; }
    } else if (r.won) {
      const key = g.diffId === 'hard' ? 'hardStars' : 'stars';
      Save.data[key][idx] = Math.max(Save.data[key][idx] || 0, r.stars);
      if (g.diffId === 'hard') Save.data.stars[idx] = Math.max(Save.data.stars[idx] || 0, 1);
      Save.data.unlocked = Math.max(Save.data.unlocked, Math.min(STAGES.length, idx + 2));
    }
    const life = Save.data.life = Save.data.life || {};
    life.kills = (life.kills || 0) + g.stats.kills;
    life.bosses = (life.bosses || 0) + g.stats.bossKills;
    life.early = (life.early || 0) + g.stats.earlyCalls;
    if (r.won) {
      life.wins = (life.wins || 0) + 1;
      life.heroWins = Object.assign({}, life.heroWins, { [g.heroId]: true });
    }
    Save.save();
    this.checkAchievements(g, r);
    const mins = Math.floor(g.time / 60), secs = Math.floor(g.time % 60);
    const stats = `<div class="result-grid">
      <div><b>${fmt(g.stats.kills)}</b><span>처치</span></div>
      <div><b>${fmt(g.stats.goldEarned)}</b><span>획득 골드</span></div>
      <div><b>${g.stats.built}</b><span>건설한 타워</span></div>
      <div><b>${g.stats.leaked}</b><span>놓친 적</span></div>
      <div><b>Lv.${g.hero.level}</b><span>${esc(g.hero.def.name)}</span></div>
      <div><b>${mins}:${String(secs).padStart(2, '0')}</b><span>전투 시간</span></div></div>`;
    const runes = g.runes.length ? `<div class="owned" style="justify-content:center">${g.runes.map((x) => `<span class="chip r${x.rarity}">${esc(x.name)}</span>`).join('')}</div>` : '';
    const hasNext = r.won && !g.endless && idx + 1 < STAGES.length;
    let head;
    if (g.endless) {
      head = `<div class="modal-head"><p class="eyebrow">ENDLESS</p><h2>${g.wave}웨이브까지 버텼습니다</h2><p class="modal-sub">${newBest ? '새로운 최고 기록!' : `최고 기록 ${Save.data.endlessBest[idx]}웨이브`}</p></div>`;
    } else if (r.won) {
      head = `<div class="modal-head"><p class="eyebrow">VICTORY</p><h2>등불을 지켜냈습니다</h2>
        <div class="result-stars">${[1, 2, 3].map((k) => `<span class="${k <= r.stars ? 'on' : ''}">★</span>`).join('')}</div>
        <p class="modal-sub">${esc(st.name)} · ${esc(DIFFICULTY[g.diffId].name)} · 남은 생명 ${g.lives}</p></div>`;
    } else {
      head = `<div class="modal-head defeat"><p class="eyebrow" style="color:var(--life)">DEFEAT</p><h2>등불이 꺼졌습니다</h2><p class="modal-sub">웨이브 ${g.wave}에서 쓰러졌습니다. 공명 조합과 영웅 배치를 바꿔 다시 도전해 보세요.</p></div>`;
    }
    const m = this.openModal(`${head}${stats}${runes}
      <div class="modal-actions">
        <button class="btn" data-a="stages">원정지 선택</button>
        <button class="btn ${hasNext ? '' : 'btn-primary'}" data-a="retry">다시 하기</button>
        ${hasNext ? '<button class="btn btn-primary" data-a="next">다음 원정지 →</button>' : ''}
      </div>`, { cls: r.won ? '' : 'defeat' });
    m.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-a]');
      if (!a) return;
      this.click();
      this.closeModal();
      if (a.dataset.a === 'retry') App.restart();
      else if (a.dataset.a === 'next') { this.pick.stage = idx + 1; this.pick.endless = false; Save.data.stage = idx + 1; Save.save(); App.start({ stage: idx + 1, hero: g.heroId, difficulty: g.diffId, endless: false, meta: { ...Save.data.upgrades } }); }
      else App.quit();
    });
  },

  openSettings(back) {
    const s = Save.data.settings;
    const row = (id, label, note) => `<div class="toggle-row"><div>${label}<small>${note}</small></div><button class="switch" role="switch" aria-checked="${s[id]}" data-k="${id}" aria-label="${label}"></button></div>`;
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">SETTINGS</p><h2>설정</h2></div>
      <div class="settings-list">
        ${row('sfx', '효과음', '전투 효과음')}
        ${row('music', '배경음', '잔잔한 합성 음악')}
        ${row('dmgNumbers', '치명타 숫자', '치명타 피해량 표시')}
        ${row('shake', '화면 흔들림', '폭발·보스 등장 시')}
        ${row('lighting', '밤 조명 효과', '끄면 화면이 밝아지고 저사양 기기에서 더 부드럽습니다')}
      </div>
      <div class="confirm-row" id="reset-row"><button class="btn btn-danger" id="btn-reset" style="min-height:34px">진행 상황 초기화</button></div>
      <div class="modal-actions"><button class="btn btn-primary" data-a="close">닫기</button></div>`, { esc: () => (back ? back() : this.closeModal()), pause: !!App.game });
    $$('.switch', m).forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.k;
        s[k] = !s[k];
        b.setAttribute('aria-checked', String(s[k]));
        if (k === 'sfx') Sfx.setSfx(s[k]);
        if (k === 'music') Sfx.setMusic(s[k]);
        Save.save();
        this.click();
      };
    });
    $('#btn-reset', m).onclick = () => {
      $('#reset-row', m).innerHTML = '모든 별과 기록이 지워집니다. <button class="btn btn-danger" id="btn-reset2" style="min-height:34px">초기화 확정</button>';
      $('#btn-reset2', m).onclick = () => Save.reset();
    };
    $('[data-a=close]', m).onclick = () => { this.click(); back ? back() : this.closeModal(); };
  },

  openHelp(back) {
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">HOW TO PLAY</p><h2>조작법</h2></div>
      <ul class="help-list">
        <li><span>타워 건설</span><span>하단 타워 버튼(1~6) → 빈 땅 클릭. Shift+클릭으로 연속 건설</span></li>
        <li><span>타워 관리</span><span>타워 클릭 → 업그레이드(U), 조준 변경(T), 판매. Lv.3에서 두 갈래 중 하나로 최종 진화</span></li>
        <li><span>영웅</span><span>영웅 또는 초상화(H) 클릭 → 지도 클릭으로 이동. E: 영웅 기술</span></li>
        <li><span>주문</span><span>Q: 유성 낙하, W: 증원군 → 지도에서 지점 선택</span></li>
        <li><span>웨이브</span><span>N/Enter: 다음 웨이브 호출 (일찍 부를수록 보너스 골드)</span></li>
        <li><span>속도·정지</span><span>F: 속도 1×/2×/3× 전환, Space/ESC: 일시정지</span></li>
        <li><span>취소</span><span>우클릭 또는 ESC</span></li>
        <li><span>터치</span><span>건설·주문은 한 번 눌러 미리 보고, 같은 곳을 다시 눌러 확정</span></li>
      </ul>
      <ol class="help-tips">
        <li><b>공명</b> — 같은 종류 타워를 2·4·6개 모으면 보너스. 6종을 모두 지으면 ‘조화’ 보너스.</li>
        <li><b>룬</b> — 3웨이브마다 3장 중 1장을 고릅니다. 30골드로 한 번 다시 뽑을 수 있습니다.</li>
        <li><b>상성</b> — 골렘은 물리에 강하고(방어력) 망령·주술사는 마법에 강합니다(마법 저항).</li>
        <li><b>비행</b> — 박쥐와 비룡은 점선 하늘길을 따라 등불로 곧장 날아옵니다. 대포·병영은 공중을 못 칩니다.</li>
        <li><b>별</b> — 생명을 90% 이상 지키면 별 3개. 클리어한 원정지는 무한 모드가 열립니다.</li>
      </ol>
      <div class="modal-actions"><button class="btn btn-primary" data-a="close">확인</button></div>`, { esc: () => (back ? back() : this.closeModal()), pause: !!App.game });
    $('[data-a=close]', m).onclick = () => { this.click(); back ? back() : this.closeModal(); };
  },

  openCodex(tab, back) {
    const m = this.openModal(`
      <div class="modal-head"><p class="eyebrow">CODEX</p><h2>도감</h2></div>
      <div class="tabs"><button data-t="tower">타워</button><button data-t="enemy">적</button><button data-t="hero">영웅</button><button data-t="rune">룬</button></div>
      <div class="codex-grid" id="codex-body"></div>
      <div class="modal-actions"><button class="btn btn-primary" data-a="close">닫기</button></div>`, { cls: 'modal-wide', esc: () => (back ? back() : this.closeModal()), pause: !!App.game });
    const body = $('#codex-body', m);
    const render = (t) => {
      $$('.tabs button', m).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      body.innerHTML = '';
      if (t === 'tower') {
        for (const type of TOWER_ORDER) {
          const d = TOWERS[type];
          const res = RESONANCE[type];
          const it = document.createElement('div');
          it.className = 'codex-item';
          it.innerHTML = `<canvas></canvas><b>${esc(d.name)} <small style="color:var(--gold)">${d.levels[0].cost}G</small></b><p>${esc(d.desc)}</p>
            <p class="kv">공명 ‘${esc(res.name)}’ ${res.tiers.join('/')}: ${esc(res.text[res.text.length - 1])}</p>
            <div class="branch-list">${d.branches.map((b) => `<div><b>${esc(b.name)}</b> — ${esc(b.desc)}</div>`).join('')}</div>`;
          Icons.tower($('canvas', it), type, 2, null, 52);
          body.appendChild(it);
        }
      } else if (t === 'enemy') {
        for (const type of ENEMY_CODEX_ORDER) {
          const d = ENEMIES[type];
          const seen = Save.data.seen[type];
          const it = document.createElement('div');
          it.className = 'codex-item' + (seen ? '' : ' unseen');
          it.innerHTML = seen
            ? `<canvas></canvas><b>${esc(d.name)}${d.boss ? ' <small style="color:var(--life)">보스</small>' : ''}</b><p>${esc(d.trait)}</p>
               <p class="kv">체력 ${fmt(d.hp)} · 방어 ${pct(d.armor || 0)} · 마저 ${pct(d.mres || 0)} · 속도 ${d.speed}</p>`
            : `<canvas></canvas><b>???</b><p>아직 마주치지 않은 적입니다.</p>`;
          Icons.enemy($('canvas', it), type, 52);
          body.appendChild(it);
        }
      } else if (t === 'hero') {
        for (const id of HERO_ORDER) {
          const d = HEROES[id];
          const it = document.createElement('div');
          it.className = 'codex-item';
          it.innerHTML = `<canvas></canvas><b>${esc(d.name)} <small style="color:${d.color}">${esc(d.role)}</small></b><p>${esc(d.title)} — ${esc(d.desc)}</p>
            <p class="kv">체력 ${d.hp} · 피해 ${d.dmg} ${DMG_NAMES[d.dmgType]} · ${d.range ? '사거리 ' + d.range + '칸' : '근접'}</p>
            <div class="branch-list"><div><b>${esc(d.skill.name)}</b> — ${esc(d.skill.desc)} (재사용 ${d.skill.cd}초)</div></div>`;
          Icons.hero($('canvas', it), id, 52);
          body.appendChild(it);
        }
      } else {
        for (const r of RUNES.slice().sort((a, b) => b.rarity - a.rarity)) {
          const it = document.createElement('div');
          it.className = 'codex-item';
          it.innerHTML = `<canvas></canvas><b>${esc(r.name)} <small style="color:${RARITY[r.rarity].color}">${RARITY[r.rarity].name}</small></b><p>${esc(r.desc)}</p>`;
          Icons.sigil($('canvas', it), r.sigil, RARITY[r.rarity].color, 52);
          body.appendChild(it);
        }
      }
    };
    $$('.tabs button', m).forEach((b) => { b.onclick = () => { this.click(); render(b.dataset.t); }; });
    $('[data-a=close]', m).onclick = () => { this.click(); back ? back() : this.closeModal(); };
    render(tab);
  },

  // ═══════════════════ 튜토리얼 코치 ═══════════════════
  COACH: [
    { text: '하단에서 타워를 고른 뒤, 길 옆 빈 땅을 눌러 건설하세요. 처음엔 궁수탑을 추천합니다.', until: 'build' },
    { text: '좋습니다! 몇 개 더 지은 뒤, 준비되면 상단의 [전투 시작]을 누르세요.', until: 'wave' },
    { text: '영웅 초상화(H)를 누른 뒤 지도를 누르면 영웅이 그곳으로 이동해 적을 막습니다.', until: 'hero', timeout: 25 },
    { text: '[Q] 유성 낙하·[W] 증원군 주문과 [E] 영웅 기술로 위기를 넘기세요.', until: 'ability', timeout: 25 },
    { text: '타워를 누르면 업그레이드·판매·조준 변경을 할 수 있습니다. Lv.3에서 두 갈래로 최종 진화!', until: 'upgrade', timeout: 40 },
    { text: '웨이브 사이에 [다음 웨이브]를 일찍 누르면 남은 시간만큼 보너스 골드를 받습니다.', until: 'call', timeout: 40 },
  ],

  startCoach(g) {
    this.coachStep = Save.data.tutorialDone || g.stageIdx !== 0 ? -1 : 0;
    this.coachT = 0;
    this.showCoach();
  },
  showCoach() {
    const el = $('#coach');
    const on = this.coachStep >= 0 && this.coachStep < this.COACH.length;
    $('#stage-area').classList.toggle('coaching', on);
    if (!on) { el.hidden = true; return; }
    $('#coach-text').textContent = this.COACH[this.coachStep].text;
    el.hidden = false;
  },
  coachEvent(ev) {
    if (this.coachStep < 0) return;
    const step = this.COACH[this.coachStep];
    if (step && step.until === ev) this.advanceCoach();
  },
  coachTick(g) {
    if (this.coachStep < 0) return;
    const step = this.COACH[this.coachStep];
    if (!step || !step.timeout || App.modalPause || g.paused) return;
    this.coachT += 1 / 60;
    if (g.state === 'running' && this.coachT > step.timeout) this.advanceCoach();
  },
  advanceCoach() {
    this.coachStep++;
    this.coachT = 0;
    if (this.coachStep >= this.COACH.length) this.endCoach();
    else this.showCoach();
  },
  endCoach() {
    this.coachStep = -1;
    Save.data.tutorialDone = true;
    Save.save();
    $('#coach').hidden = true;
    $('#stage-area').classList.remove('coaching');
  },
};

// ── 타이틀 배경 애니메이션 ──
const TitleBG = {
  canvas: null, ctx: null, raf: 0, t: 0, stars: [], flies: [], eyes: [],
  start(canvas) {
    if (this.raf) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.stars.length) {
      for (let i = 0; i < 140; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.6, s: Math.random() * 1.4 + 0.3, p: Math.random() * TAU });
      for (let i = 0; i < 26; i++) this.flies.push({ x: Math.random(), y: 0.55 + Math.random() * 0.4, p: Math.random() * TAU, s: 0.6 + Math.random() });
      for (let i = 0; i < 7; i++) this.eyes.push({ x: Math.random() < 0.5 ? Math.random() * 0.25 : 0.75 + Math.random() * 0.25, y: 0.72 + Math.random() * 0.2, p: Math.random() * 20 });
    }
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.t += dt;
      this.draw(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; },
  draw(dt) {
    const c = this.canvas, ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = this.t;
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, ['#070814', '#0e1028', '#1d1638']);
    ctx.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(230,235,255,${0.35 + Math.sin(t * 1.5 + s.p) * 0.3})`;
      circle(ctx, s.x * W, s.y * H, s.s); ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,235,220,0.85)';
    circle(ctx, W * 0.82, H * 0.18, Math.min(W, H) * 0.045); ctx.fill();
    ctx.fillStyle = '#0e1028';
    circle(ctx, W * 0.82 + Math.min(W, H) * 0.018, H * 0.18 - Math.min(W, H) * 0.01, Math.min(W, H) * 0.042); ctx.fill();
    const hill = (base, amp, freq, col, off) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H * base + Math.sin(x * freq + off) * amp + Math.sin(x * freq * 2.3 + off * 2) * amp * 0.4);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    hill(0.66, 26, 0.004, '#151634', 1);
    hill(0.74, 20, 0.006, '#10112a', 3);
    // 등불 언덕
    const lx = W * 0.5, ly = H * 0.86;
    ctx.fillStyle = '#0b0c1f';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.9);
    ctx.quadraticCurveTo(lx, H * 0.76, W, H * 0.9); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    Glow.draw(ctx, lx, ly - 70, Math.min(W, H) * 0.55 * pulse, '#ffb347', 0.25);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(2.2, 2.2);
    Renderer.drawLantern(ctx, { x: -9, y: 0, hurt: 0 }, t);
    ctx.restore();
    // 안개
    for (let i = 0; i < 3; i++) {
      const y = H * (0.72 + i * 0.08);
      const x = ((t * (12 + i * 6)) % (W + 600)) - 300;
      ctx.fillStyle = radGrad(ctx, x, y, 0, 300, ['rgba(140,150,200,0.07)', 'rgba(140,150,200,0)']);
      ctx.fillRect(x - 300, y - 300, 600, 600);
    }
    // 어둠 속의 눈
    for (const e of this.eyes) {
      const blink = Math.sin(t * 0.6 + e.p);
      if (blink < 0.2) continue;
      const a = Math.min(1, (blink - 0.2) * 2) * 0.8;
      ctx.fillStyle = `rgba(255,90,120,${a})`;
      ellipse(ctx, e.x * W - 5, e.y * H, 2.2, 1.4); ctx.fill();
      ellipse(ctx, e.x * W + 5, e.y * H, 2.2, 1.4); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      f.p += dt;
      const x = (f.x + Math.sin(f.p * 0.3) * 0.03) * W, y = (f.y + Math.cos(f.p * 0.4) * 0.03) * H;
      Glow.draw(ctx, x, y, 10 * f.s, '#d8ff8a', Math.max(0, Math.sin(f.p * 1.4 * f.s)) * 0.8);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
};
