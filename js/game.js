'use strict';
// ─────────────────────────────────────────────────────────────
//  Game: 규칙·경제·웨이브·룬·공명 — 렌더링과 분리된 순수 로직
// ─────────────────────────────────────────────────────────────
function defaultMods() {
  return {
    dmg: { all: 0, archer: 0, cannon: 0, frost: 0, arcane: 0, shrine: 0, barracks: 0 },
    rate: { all: 0, archer: 0, cannon: 0, frost: 0, arcane: 0, barracks: 0 },
    range: 0, physDmg: 0, magicDmg: 0, splash: 0, slowAdd: 0, slowDur: 0, chainAdd: 0,
    crit: 0, critMul: 2, goldMul: 0, costMul: 0, sellRate: 0.7,
    heroDmg: 0, heroHp: 0, heroRespawn: 1, spellCd: 1, earlyMul: 1,
    interest: false, execute: 0, frostfire: 0, unity: 0, shrineMul: 0,
    soldierHp: 0, soldierDmg: 0, lanternBlast: false,
  };
}

const ENDLESS_BOSSES = ['ogre', 'drake', 'lord'];

class Game {
  constructor(opts) {
    this.stageIdx = opts.stage;
    this.stage = STAGES[opts.stage];
    this.heroId = opts.hero || 'aren';
    this.diffId = opts.difficulty || 'normal';
    this.diff = DIFFICULTY[this.diffId];
    this.endless = !!opts.endless;
    this.headless = !!opts.headless;
    this.settings = opts.settings || { dmgNumbers: true };
    this.theme = THEMES[this.stage.theme];
    this.listeners = {};
    this.reset();
  }

  on(ev, fn) { (this.listeners[ev] || (this.listeners[ev] = [])).push(fn); }
  emit(ev, data) { const l = this.listeners[ev]; if (l) for (const fn of l) fn(data); }
  sfx(name) { if (!this.headless && typeof Sfx !== 'undefined') Sfx.play(name); }

  reset() {
    const st = this.stage;
    this.time = 0;
    this.paths = st.paths.map((p) => new Path(p, true));
    const lt = st.paths[0][st.paths[0].length - 1];
    this.lantern = { x: lt[0] * TILE + TILE / 2, y: lt[1] * TILE + TILE / 2, c: lt[0], r: lt[1], hurt: 0 };
    this.airPaths = st.paths.map((p) => new Path([p[0], lt], false));
    this.buildGrid();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.units = [];
    this.fx = [];
    this.grounds = [];
    this.scheduled = [];
    this.gold = st.startGold;
    this.lives = this.diff.lives;
    this.maxLives = this.lives;
    this.mods = defaultMods();
    this.counts = {};
    this.res = computeResonance({}, 0);
    this.wave = 0;
    this.totalWaves = this.endless ? Infinity : st.waves;
    this.spawnQueue = [];
    this.spawning = false;
    this.countdown = null;
    this.state = 'prep';
    this.paused = false;
    this.runes = [];
    this.runeChoices = null;
    this.rerolled = false;
    this.spells = { meteor: 0, reinforce: 0 };
    this.stats = { kills: 0, goldEarned: 0, built: 0, leaked: 0, bossKills: 0, spent: 0 };
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.bossRef = null;
    this.seen = new Set();
    const p0 = this.paths[0];
    const sp = p0.at(p0.length - TILE * 1.3);
    const home = p0.at(p0.length * 0.62);
    this.hero = new Hero(this, this.heroId, sp.x, sp.y, home.x, home.y);
    this.hero.x = home.x; this.hero.y = home.y;
    this.waveInfo = this.buildWave(1);
  }

  // ── 맵 그리드: 0=건설 가능, 1=길, 2=장식(불가), 3=등불 ──
  buildGrid() {
    const st = this.stage;
    this.grid = [];
    this.occ = [];
    for (let r = 0; r < ROWS; r++) { this.grid.push(new Array(COLS).fill(0)); this.occ.push(new Array(COLS).fill(null)); }
    const mark = (c, r) => { if (c >= 0 && r >= 0 && c < COLS && r < ROWS) this.grid[r][c] = 1; };
    for (const p of st.paths) {
      for (let i = 0; i < p.length - 1; i++) {
        const [c0, r0] = p[i], [c1, r1] = p[i + 1];
        const sc = Math.sign(c1 - c0), sr = Math.sign(r1 - r0);
        let c = c0, r = r0;
        mark(c, r);
        while (c !== c1 || r !== r1) { c += sc; r += sr; mark(c, r); }
      }
    }
    this.grid[this.lantern.r][this.lantern.c] = 3;
    // 길까지의 거리장 (BFS)
    const D = [];
    const q = [];
    for (let r = 0; r < ROWS; r++) {
      D.push(new Array(COLS).fill(99));
      for (let c = 0; c < COLS; c++) if (this.grid[r][c] === 1) { D[r][c] = 0; q.push([c, r]); }
    }
    for (let qi = 0; qi < q.length; qi++) {
      const [c, r] = q[qi];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || D[nr][nc] <= D[r][c] + 1) continue;
        D[nr][nc] = D[r][c] + 1;
        q.push([nc, nr]);
      }
    }
    this.pathDist = D;
    const rng = mulberry32(st.seed * 9973);
    this.decos = [];
    const lc = this.lantern.c, lr = this.lantern.r;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== 0) { rng(); continue; }
        if (Math.abs(c - lc) <= 1 && Math.abs(r - lr) <= 1) { rng(); continue; }
        const d = D[r][c];
        const p = d <= 1 ? 0.05 : d === 2 ? 0.14 : 0.3;
        if (rng() < p) {
          this.grid[r][c] = 2;
          const th = THEMES[st.theme];
          this.decos.push({ c, r, kind: th.decos[Math.floor(rng() * th.decos.length)], seed: rng() });
        }
      }
    }
  }

  // ── 웨이브 생성 (시드 고정 → 매번 동일한 구성, 미리보기 가능) ──
  diffHpMul(n) { return this.diff.hpBase + this.diff.hpRamp * n; }
  waveHpMul(n) { return (1 + 0.1 * (n - 1) + 0.015 * (n - 1) ** 2) * this.stage.hpMul * this.diffHpMul(n); }
  bossHpMul(n) { return (1 + 0.045 * (n - 1) + (n > 20 ? 0.004 * (n - 20) ** 2 : 0)) * this.stage.hpMul * this.diffHpMul(n); }

  bossFor(n) {
    const st = this.stage;
    if (n <= st.waves) return st.bosses[n] || null;
    if (n % 5 === 0) return ENDLESS_BOSSES[(n / 5) % 3];
    return null;
  }

  buildWave(n) {
    const st = this.stage;
    const rng = mulberry32(st.seed * 1000 + n * 7919);
    const hpMul = this.waveHpMul(n);
    const pool = n > st.waves
      ? Object.keys(ENEMIES).filter((k) => ENEMIES[k].weight > 0)
      : Object.keys(st.unlocks).filter((t) => st.unlocks[t] <= n);
    const fresh = n > 1 && n <= st.waves ? pool.filter((t) => st.unlocks[t] === n) : [];
    let budget = (7 + n * 3.0 + n * n * 0.13 * (st.lateMul || 1)) * st.budgetMul;
    const bossType = this.bossFor(n);
    if (bossType) budget *= 0.5;
    const nGroups = Math.min(4, 1 + Math.floor(n / 4));
    const types = [...fresh];
    let guard = 0;
    while (types.length < nGroups && guard++ < 30) {
      const t = weightedPick(pool, (k) => {
        let w = ENEMIES[k].weight || 0;
        if (k === 'imp') w *= Math.max(0.35, 1.15 - n * 0.05);
        if (types.includes(k)) w *= 0.2;
        return w;
      }, rng);
      types.push(t);
    }
    const shares = types.map((t) => (fresh.includes(t) ? 1.1 : 1) * (0.8 + rng() * 0.4));
    const total = shares.reduce((a, b) => a + b, 0);
    const np = this.paths.length;
    const spawns = [];
    let t0 = 0;
    types.forEach((type, i) => {
      const def = ENEMIES[type];
      const count = Math.max(2, Math.round((budget * shares[i]) / total / def.cost));
      const iv = def.interval * (0.85 + rng() * 0.3) * (count > 14 ? 0.8 : 1);
      for (let k = 0; k < count; k++) {
        const path = np > 1 ? (count >= 8 ? (i + k) % np : i % np) : 0;
        spawns.push({ t: t0 + k * iv, type, path });
      }
      t0 += count * iv * 0.6 + 1.5;
    });
    if (bossType) spawns.push({ t: Math.max(3, t0 * 0.45), type: bossType, path: 0, boss: true });
    spawns.sort((a, b) => a.t - b.t);
    const preview = {};
    for (const s of spawns) preview[s.type] = (preview[s.type] || 0) + 1;
    return { n, hpMul, spawns, preview, fresh, boss: bossType };
  }

  // ── 웨이브 진행 ──
  startWave() {
    if (this.wave >= this.totalWaves) return;
    const n = ++this.wave;
    for (const t of this.towers) t.refund = 0;
    const info = this.waveInfo && this.waveInfo.n === n ? this.waveInfo : this.buildWave(n);
    for (const s of info.spawns) {
      this.spawnQueue.push({ at: this.time + s.t, type: s.type, path: s.path, boss: !!s.boss, hpMul: s.boss ? this.bossHpMul(n) : info.hpMul });
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.spawning = true;
    this.countdown = null;
    this.state = 'running';
    let inc = 0;
    for (const t of this.towers) if (t.type === 'shrine') inc += t.e.income || 0;
    let interest = 0;
    if (this.mods.interest) interest = Math.min(20, Math.floor(this.gold / 10));
    if (inc + interest > 0) {
      this.addGold(inc + interest, true);
      const parts = [];
      if (inc) parts.push(`성소 +${inc}`);
      if (interest) parts.push(`이자 +${interest}`);
      this.emit('toast', { text: `골드 수입: ${parts.join(', ')}`, kind: 'gold' });
      for (const t of this.towers) if (t.type === 'shrine' && t.e.income) this.fxText(t.x, t.y - 40, `+${Math.round(t.e.income)}`, '#ffd36b', 12);
    }
    this.waveInfo = n < this.totalWaves ? this.buildWave(n + 1) : null;
    this.emit('wave', { n, info });
    this.sfx('wave');
  }

  callWave() {
    if (this.state === 'won' || this.state === 'lost' || this.paused) return false;
    if (this.spawning || this.wave >= this.totalWaves) return false;
    if (this.countdown != null) {
      const bonus = Math.round(this.countdown * 1.4 * this.mods.earlyMul);
      if (bonus > 0) {
        this.addGold(bonus, true);
        this.emit('toast', { text: `조기 호출 보너스 +${bonus} 골드`, kind: 'gold' });
      }
    }
    this.startWave();
    return true;
  }

  get earlyBonus() {
    return this.countdown != null ? Math.round(this.countdown * 1.4 * this.mods.earlyMul) : 0;
  }

  onWaveSpawned(n) {
    if (n < this.totalWaves) this.countdown = WAVE_GAP;
    if (n % RUNE_EVERY === 0 && n < this.totalWaves) this.offerRunes(false);
  }

  spawnEnemy(type, pathIdx, hpMul, startDist = 0, boss = false) {
    const e = new Enemy(this, type, pathIdx, hpMul, startDist);
    this.enemies.push(e);
    if (e.boss && boss) {
      this.bossRef = e;
      this.emit('boss', e);
      this.sfx('boss');
      this.shake(4);
    }
    if (!this.seen.has(type)) {
      this.seen.add(type);
      if (!ENEMIES[type].hidden) this.emit('newEnemy', type);
    }
    return e;
  }

  // ── 경제 ──
  addGold(v, earned = false) {
    this.gold += v;
    if (earned) this.stats.goldEarned += v;
  }
  costOf(base) { return Math.max(1, Math.round(base * (1 - this.mods.costMul))); }
  buildCost(type) { return this.costOf(TOWERS[type].levels[0].cost); }
  sellValue(t) { return t.refund + Math.floor((t.invested - t.refund) * this.mods.sellRate); }

  canBuild(c, r) {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS && this.grid[r][c] === 0 && !this.occ[r][c];
  }

  build(type, c, r) {
    if (this.state === 'won' || this.state === 'lost') return { ok: false };
    if (!this.canBuild(c, r)) return { ok: false, reason: '이곳에는 건설할 수 없습니다' };
    const cost = this.buildCost(type);
    if (this.gold < cost) return { ok: false, reason: '골드가 부족합니다' };
    this.gold -= cost;
    this.stats.spent += cost;
    const t = new Tower(this, type, c, r);
    t.invested = cost;
    t.refund = cost;
    const dm = towerStats(type, 0, null).defaultMode;
    if (dm) t.mode = dm;
    if (type === 'barracks') {
      const np = this.nearestPathPoint(t.x, t.y);
      t.rally = np ? { x: np.x, y: np.y } : { x: t.x, y: t.y + TILE };
    }
    this.towers.push(t);
    this.occ[r][c] = t;
    this.stats.built++;
    this.recalcAll();
    this.fxSpark(t.x, t.y + 6, '#c9b99a', 12, 70, 0.5, 2.5);
    this.fxRing(t.x, t.y + 4, 6, 26, 0.35, '#ffffff', 2);
    this.sfx('build');
    return { ok: true, tower: t };
  }

  upgradeOptions(t) {
    if (t.branch != null) return [];
    if (t.level < 2) return [{ kind: 'level', cost: this.costOf(t.def.levels[t.level + 1].cost) }];
    return t.def.branches.map((b, i) => ({ kind: 'branch', index: i, cost: this.costOf(b.cost), def: b }));
  }

  upgrade(t, branchIdx = 0) {
    const opts = this.upgradeOptions(t);
    const opt = t.level < 2 ? opts[0] : opts[branchIdx];
    if (!opt) return { ok: false, reason: '최대 단계입니다' };
    if (this.gold < opt.cost) return { ok: false, reason: '골드가 부족합니다' };
    this.gold -= opt.cost;
    this.stats.spent += opt.cost;
    t.invested += opt.cost;
    t.refund += opt.cost;
    if (opt.kind === 'level') t.level++;
    else {
      t.level = 3;
      t.branch = branchIdx;
      const dm = t.def.branches[branchIdx].defaultMode;
      if (dm) t.mode = dm;
    }
    t.buildT = 0.4;
    this.recalcAll();
    if (t.type === 'barracks') t.refreshSoldiers(true);
    this.fxRing(t.x, t.y - 10, 8, 36, 0.5, t.def.color, 3);
    this.fxSpark(t.x, t.y - 16, t.def.color, 14, 90, 0.6, 2.5);
    this.sfx('upgrade');
    return { ok: true };
  }

  sell(t) {
    const val = this.sellValue(t);
    this.addGold(val);
    this.towers.splice(this.towers.indexOf(t), 1);
    this.occ[t.r][t.c] = null;
    if (t.type === 'barracks') t.removeSoldiers();
    this.recalcAll();
    this.fxSpark(t.x, t.y, '#ffd36b', 14, 90, 0.6, 2.5);
    this.fxText(t.x, t.y - 20, `+${val}`, '#ffd36b', 13);
    this.sfx('sell');
    return val;
  }

  nearestPathPoint(x, y) {
    let best = null;
    for (const p of this.paths) {
      const n = p.nearest(x, y);
      if (n && (!best || n.d < best.d)) best = n;
    }
    return best;
  }

  // ── 스탯 재계산 (건설·판매·업그레이드·룬 획득 시) ──
  computeEffective(t) {
    const s = towerStats(t.type, t.level, t.branch);
    const m = this.mods, R = this.res, buff = t.buff;
    const e = Object.assign({}, s);
    const typeBonus = s.dmgType === 'phys' ? m.physDmg : s.dmgType === 'magic' ? m.magicDmg : 0;
    const dmgMul = 1 + m.dmg.all + (m.dmg[t.type] || 0) + typeBonus + R.harmony + buff.dmg;
    const rateMul = 1 + m.rate.all + (m.rate[t.type] || 0) + (R.rate[t.type] || 0) + buff.rate;
    e.dmgMul = dmgMul;
    e.rateMul = rateMul;
    e.dmg = (s.dmg || 0) * dmgMul;
    e.cd = s.cd ? s.cd / rateMul : 0;
    e.range = ((s.range || 0) + buff.range) * (1 + m.range);
    if (s.splash) e.splash = s.splash * (1 + m.splash + R.splash);
    if (s.slow) {
      e.slow = Math.min(0.8, s.slow + m.slowAdd + R.slowAdd);
      e.slowDur = (s.slowDur || 1.5) * (1 + m.slowDur);
    }
    if (s.chain != null) e.chain = s.chain + m.chainAdd + R.chainAdd;
    if (s.ramp) e.ramp = s.ramp * (1 + R.beamRamp);
    if (s.burn) e.burn = { dps: s.burn.dps * dmgMul, dur: s.burn.dur };
    if (s.fireGround) e.fireGround = { dps: s.fireGround.dps * dmgMul, dur: s.fireGround.dur, radius: s.fireGround.radius };
    e.crit = (s.crit || 0) + (t.isAttacker ? m.crit : 0);
    e.critMul = s.critMul || m.critMul;
    if (t.type === 'barracks') {
      e.sHp = s.sHp * (1 + m.soldierHp + R.soldierHp);
      e.sDmg = s.sDmg * (1 + m.soldierDmg) * dmgMul;
      e.sCd = s.sCd / rateMul;
      e.soldiers = s.soldiers + R.soldierExtra;
    }
    if (t.type === 'shrine') {
      const sm = 1 + m.shrineMul + R.shrineMul;
      e.buffDmg = (s.buffDmg || 0) * sm;
      e.buffRate = (s.buffRate || 0) * sm;
      e.buffRange = s.buffRange || 0;
      e.income = Math.round((s.income || 0) * (1 + R.shrineMul * 0.5));
    }
    t.e = e;
  }

  recalcAll() {
    const counts = {};
    for (const t of this.towers) counts[t.type] = (counts[t.type] || 0) + 1;
    this.counts = counts;
    this.res = computeResonance(counts, this.mods.unity);
    const shrines = this.towers.filter((t) => t.type === 'shrine');
    for (const s of shrines) { s.buff = { dmg: 0, rate: 0, range: 0, src: null }; this.computeEffective(s); }
    for (const t of this.towers) {
      if (t.type === 'shrine') continue;
      let best = null;
      for (const s of shrines) {
        if (dist(t.x, t.y, s.x, s.y) > s.e.range * TILE + 1) continue;
        if (!best || s.e.buffDmg + s.e.buffRate > best.e.buffDmg + best.e.buffRate) best = s;
      }
      t.buff = best ? { dmg: best.e.buffDmg, rate: best.e.buffRate, range: best.e.buffRange, src: best } : { dmg: 0, rate: 0, range: 0, src: null };
      this.computeEffective(t);
      if (t.type === 'barracks') t.refreshSoldiers(false);
    }
    if (this.hero) this.hero.recalc();
    this.emit('recalc');
  }

  // ── 피해 처리 ──
  dealDamage(e, dmg, type, src, o = {}) {
    let crit = !!o.crit;
    if (o.canCrit !== false && src && src.e && src.e.crit > 0 && Math.random() < src.e.crit) {
      dmg *= src.e.critMul || 2;
      crit = true;
    }
    const dealt = e.takeDamage(dmg, type, src, o.dot);
    if (crit && this.settings.dmgNumbers) this.fxText(e.x + rand(-6, 6), e.y - e.size - 10, fmt(dealt) + '!', '#ffd166', 13);
    if (e.alive) {
      if (o.slow) e.applySlow(o.slow, o.slowDur || 1.5);
      if (o.freezeChance && Math.random() < o.freezeChance) {
        e.applyFreeze(o.freezeDur);
        this.fxSpark(e.x, e.y, '#dff6ff', 6, 50, 0.4, 2);
      }
      if (o.stun) e.applyStun(o.stun);
      if (o.burn) e.applyBurn(o.burn.dps, o.burn.dur, src);
      if (o.shred) e.applyShred(o.shred, 4);
    }
    return dealt;
  }

  explode(x, y, r, dmg, type, src, o = {}) {
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive || e.burrowed || (e.flying && !o.air)) continue;
      const rr = r + e.size * 0.5;
      if (dist2(e.x, e.y, x, y) > rr * rr) continue;
      this.dealDamage(e, dmg, type, src, o);
      hits++;
    }
    return hits;
  }

  projectileHit(p) {
    const opts = {
      canCrit: false, crit: p.crit, slow: p.slow, slowDur: p.slowDur,
      freezeChance: p.freezeChance, freezeDur: p.freezeDur, shred: p.shred, air: p.air,
    };
    if (p.splash) {
      const r = p.splash * TILE;
      if (p.kind === 'shell' || p.kind === 'ball') {
        this.explode(p.tx, p.ty, r, p.dmg, p.dmgType, p.src, opts);
        this.fxExplosion(p.tx, p.ty, r, p.kind === 'shell' ? '#ff9a4c' : '#ffb36b', p.kind === 'shell');
        if (p.fireGround && !p.fixedNoFire) {
          this.grounds.push({ x: p.tx, y: p.ty, r: p.fireGround.radius * TILE, dps: p.fireGround.dps, t: p.fireGround.dur, max: p.fireGround.dur, tick: 0, src: p.src });
        }
        if (p.kind === 'shell') this.shake(3);
        this.sfx(p.kind === 'shell' ? 'boom' : 'thud');
      } else if (p.kind === 'shard') {
        this.explode(p.tx, p.ty, r, p.dmg, p.dmgType, p.src, opts);
        this.fxRing(p.tx, p.ty, 4, r, 0.35, '#a8e6ff', 2);
        this.fxSpark(p.tx, p.ty, '#cfefff', 8, 70, 0.4, 2);
      } else {
        this.explode(p.tx, p.ty, r, p.dmg, p.dmgType, p.src, opts);
        this.fxExplosion(p.tx, p.ty, r, p.src && p.src.def ? p.src.def.color : '#e08bff', false);
        this.sfx('pop');
      }
      return;
    }
    const t = p.target;
    if (!t.alive || t.burrowed) return;
    this.dealDamage(t, p.dmg, p.dmgType, p.src, opts);
    const col = p.kind === 'shard' ? '#bfeaff' : p.kind === 'bolt' ? '#ffe9a8' : '#f5e3b5';
    this.fxSpark(p.tx, p.ty, col, p.kind === 'bolt' ? 6 : 3, 60, 0.25, 1.6);
  }

  onEnemyKilled(e, src) {
    this.stats.kills++;
    let gold = e.def.gold * (1 + 0.03 * (this.wave - 1)) * this.diff.goldMul * (1 + this.mods.goldMul);
    for (const t of this.towers) {
      if (t.type === 'shrine' && t.e.killBonus && dist2(t.x, t.y, e.x, e.y) <= (t.e.range * TILE) ** 2) { gold += t.e.killBonus; break; }
    }
    gold = Math.max(1, Math.round(gold));
    this.addGold(gold, true);
    if (src) src.kills = (src.kills || 0) + 1;
    if (this.hero) this.hero.gainXp(e.boss ? 160 : e.def.cost * 6);
    if (!this.headless) {
      this.fxDeath(e);
      this.fxText(e.x, e.y - e.size - 4, `+${gold}`, '#ffd36b', e.boss ? 16 : 11);
    }
    if (e.def.split) {
      for (let i = 0; i < e.def.split.count; i++) {
        const c = this.spawnEnemy(e.def.split.type, e.pathIdx, e.hpMul, e.dist + (i - 0.5) * 16);
        c.offset = clamp(e.offset + (i ? 6 : -6), -12, 12);
      }
    }
    if (e.boss) {
      this.stats.bossKills++;
      if (this.bossRef === e) this.bossRef = null;
      this.shake(10);
      this.fxRing(e.x, e.y, 10, 120, 0.9, '#ffe08a', 5);
      this.emit('toast', { text: `${e.def.name} 처치! +${gold} 골드`, kind: 'gold' });
      this.sfx('bossdie');
    } else this.sfx('die');
  }

  enemyReached(e) {
    e.done = true;
    e.alive = false;
    const bs = e.blockers.slice();
    e.blockers.length = 0;
    for (const b of bs) b.release();
    this.lives -= e.def.lives;
    this.stats.leaked++;
    this.lantern.hurt = 0.7;
    this.shake(e.boss ? 12 : 5);
    this.sfx('leak');
    if (this.bossRef === e) this.bossRef = null;
    this.fxRing(this.lantern.x, this.lantern.y - 16, 8, 50, 0.5, '#ff4d6d', 3);
    if (this.mods.lanternBlast) {
      const dmg = 250 + 20 * this.wave;
      this.explode(this.lantern.x, this.lantern.y, TILE * 2.2, dmg, 'true', null, { air: true, canCrit: false });
      this.fxExplosion(this.lantern.x, this.lantern.y, TILE * 2.2, '#ffd36b', true);
    }
    if (this.lives <= 0) { this.lives = 0; this.lose(); }
  }

  // ── 주문 & 영웅 기술 ──
  castSpell(id, x, y) {
    if (this.spells[id] > 0 || this.state === 'won' || this.state === 'lost') return false;
    const def = SPELLS[id];
    this.spells[id] = def.cd * this.mods.spellCd;
    if (id === 'meteor') {
      const dmg = 110 + 12 * this.wave;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + rand(0, 1);
        const ox = x + Math.cos(a) * TILE * 0.45, oy = y + Math.sin(a) * TILE * 0.45;
        const delay = 0.55 + i * 0.2;
        this.fxPush({ type: 'meteor', x: ox, y: oy, life: delay, max: delay });
        this.after(delay, () => {
          this.explode(ox, oy, def.radius * TILE, dmg, 'phys', null, { burn: { dps: 18 + this.wave * 2, dur: 3 }, canCrit: false });
          this.fxExplosion(ox, oy, def.radius * TILE, '#ff8a4c', true);
          this.fxPush({ type: 'scorch', x: ox, y: oy, r: def.radius * TILE * 0.8, life: 6, max: 6 });
          this.shake(7);
          this.sfx('boom');
        });
      }
      this.sfx('meteor');
    } else if (id === 'reinforce') {
      const np = this.nearestPathPoint(x, y);
      if (np && np.d < TILE * 2) { x = np.x; y = np.y; }
      for (let i = 0; i < def.count; i++) {
        const sx = x + (i ? 10 : -10);
        const s = new Soldier(this, {
          x: sx, y: y - 4, rx: sx, ry: y,
          hp: (90 + 12 * this.wave) * (1 + this.mods.soldierHp), dmg: (7 + 0.8 * this.wave) * (1 + this.mods.soldierDmg),
          cd: 1, armor: 0.2, ttl: def.dur, engage: 1.4, style: 'militia', side: i ? 1 : -1,
        });
        this.units.push(s);
        this.fxRing(sx, y, 4, 24, 0.5, '#9be37b', 2);
      }
      this.sfx('summon2');
    }
    this.emit('spell', id);
    return true;
  }

  heroSkillReady() { return this.hero.alive && this.hero.skillT <= 0; }

  castHeroSkill(x, y) {
    const h = this.hero;
    if (!h.alive || h.skillT > 0 || this.state === 'won' || this.state === 'lost') return false;
    const sk = h.def.skill;
    const dm = (1 + this.mods.heroDmg) * (1 + 0.1 * (h.level - 1));
    h.skillT = sk.cd * this.mods.spellCd;
    if (sk.id === 'bash') {
      const r = sk.radius * TILE;
      this.explode(h.x, h.y, r, sk.dmg * dm, 'phys', h, { stun: sk.stun, canCrit: false });
      this.fxRing(h.x, h.y, 6, r, 0.5, '#8fc8ff', 5);
      this.fxSpark(h.x, h.y, '#cfe6ff', 16, 140, 0.5, 3);
      this.shake(6);
      h.swing = 0.3;
      this.sfx('bash');
    } else if (sk.id === 'volley') {
      const r = sk.radius * TILE;
      for (let i = 0; i < sk.hits; i++) {
        this.after(0.25 + i * 0.16, () => {
          const a = rand(0, TAU), d = Math.sqrt(Math.random()) * r * 0.75;
          const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
          this.explode(px, py, TILE * 0.8, sk.dmg * dm, 'phys', h, { air: true, canCrit: false });
          this.fxPush({ type: 'rain', x: px, y: py, life: 0.25, max: 0.25 });
          this.fxSpark(px, py, '#e8ffd0', 4, 50, 0.3, 1.6);
          this.sfx('arrow');
        });
      }
      this.fxRing(x, y, r * 0.9, r, 1.6, '#8ef08a', 2);
      this.sfx('volley');
    } else if (sk.id === 'rift') {
      const r = sk.radius * TILE;
      this.explode(x, y, r, sk.dmg * dm, 'magic', h, { slow: sk.slow, slowDur: sk.dur, air: true, canCrit: false });
      this.fxPush({ type: 'rift', x, y, r, life: sk.dur, max: sk.dur });
      this.fxRing(x, y, 6, r, 0.6, '#e08bff', 4);
      this.sfx('rift');
    }
    return true;
  }

  after(delay, fn) { this.scheduled.push({ at: this.time + delay, fn }); }

  // ── 룬 ──
  offerRunes(isReroll) {
    const owned = new Set(this.runes.map((r) => r.id));
    const exclude = new Set(isReroll && this.runeChoices ? this.runeChoices.map((r) => r.id) : []);
    const avail = RUNES.filter((r) => (r.repeat || !owned.has(r.id)) && !exclude.has(r.id));
    const picks = [];
    const rng = Math.random;
    while (picks.length < 3 && avail.length) {
      const r = weightedPick(avail, (x) => RARITY[x.rarity].weight + (x.rarity === 3 ? this.wave * 0.5 : 0), rng);
      picks.push(r);
      avail.splice(avail.indexOf(r), 1);
    }
    if (!isReroll) this.rerolled = false;
    this.runeChoices = picks;
    this.paused = true;
    this.emit('runes', picks);
  }

  rerollRunes() {
    if (this.rerolled || this.gold < REROLL_COST || !this.runeChoices) return false;
    this.gold -= REROLL_COST;
    this.rerolled = true;
    this.offerRunes(true);
    return true;
  }

  chooseRune(i) {
    const r = this.runeChoices && this.runeChoices[i];
    if (!r) return false;
    r.apply(this);
    this.runes.push(r);
    this.runeChoices = null;
    this.paused = false;
    this.maxLives = Math.max(this.maxLives, this.lives);
    this.recalcAll();
    this.sfx('rune');
    return true;
  }

  // ── 결과 ──
  win() {
    this.state = 'won';
    const ratio = this.lives / this.diff.lives;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
    this.result = { won: true, stars };
    this.emit('end', this.result);
    this.sfx('victory');
  }
  lose() {
    this.state = 'lost';
    this.result = { won: false, stars: 0, wave: this.wave };
    this.emit('end', this.result);
    this.sfx('defeat');
  }

  // ── 메인 업데이트 ──
  update(dt) {
    if (this.state === 'won' || this.state === 'lost') { this.updateFx(dt); return; }
    if (this.paused) return;
    this.time += dt;

    if (this.scheduled.length) {
      const due = this.scheduled.filter((s) => s.at <= this.time);
      if (due.length) {
        this.scheduled = this.scheduled.filter((s) => s.at > this.time);
        for (const s of due) s.fn();
      }
    }

    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.time) {
      const s = this.spawnQueue.shift();
      this.spawnEnemy(s.type, s.path, s.hpMul, 0, s.boss);
    }
    if (this.spawning && !this.spawnQueue.length) {
      this.spawning = false;
      this.onWaveSpawned(this.wave);
    }
    if (this.countdown != null && !this.paused) {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.countdown = null; this.startWave(); }
    }

    for (const k in this.spells) if (this.spells[k] > 0) this.spells[k] -= dt;

    for (let i = 0; i < this.enemies.length; i++) { const e = this.enemies[i]; if (e.alive) e.update(dt); }
    if (this.state === 'lost') return;
    for (const t of this.towers) t.update(dt);
    for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (u.alive) u.update(dt); }
    this.hero.update(dt);
    for (let i = 0; i < this.projectiles.length; i++) { const p = this.projectiles[i]; if (p.alive) p.update(dt); }

    for (const gr of this.grounds) {
      gr.t -= dt;
      gr.tick -= dt;
      if (gr.tick <= 0) {
        gr.tick = 0.25;
        for (const e of this.enemies) {
          if (!e.alive || e.flying) continue;
          if (dist2(e.x, e.y, gr.x, gr.y) > gr.r * gr.r) continue;
          e.takeDamage(gr.dps * 0.25, 'magic', gr.src, true);
        }
      }
    }

    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.units = this.units.filter((u) => u.alive);
    this.grounds = this.grounds.filter((g) => g.t > 0);
    if (this.lantern.hurt > 0) this.lantern.hurt -= dt;
    if (this.bossRef && !this.bossRef.alive) this.bossRef = null;
    this.updateFx(dt);

    if (this.state === 'running' && this.wave >= this.totalWaves && !this.spawning &&
        !this.spawnQueue.length && this.enemies.length === 0) this.win();
  }

  // ── 시각 효과 (headless 모드에선 생성하지 않음) ──
  fxPush(o) { if (!this.headless) this.fx.push(o); }
  fxSpark(x, y, color, n = 6, speed = 80, life = 0.45, size = 2) {
    if (this.headless) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * speed;
      this.fx.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, life: life * rand(0.6, 1), max: life, color, size: size * rand(0.7, 1.2) });
    }
  }
  fxRing(x, y, r0, r1, life, color, w = 2) { this.fxPush({ type: 'ring', x, y, r0, r1, life, max: life, color, w }); }
  fxText(x, y, text, color, size = 12) { this.fxPush({ type: 'text', x, y, text, color, size, life: 0.9, max: 0.9 }); }
  fxBolt(pts, color) { this.fxPush({ type: 'bolt', pts, color, life: 0.2, max: 0.2, seed: Math.random() }); }
  fxExplosion(x, y, r, color, big) {
    if (this.headless) return;
    this.fx.push({ type: 'flash', x, y, r: r * 1.4, color, life: 0.25, max: 0.25 });
    this.fxRing(x, y, r * 0.3, r, 0.35, color, big ? 4 : 3);
    this.fxSpark(x, y, color, big ? 18 : 10, big ? 160 : 110, 0.5, big ? 3 : 2.4);
    for (let i = 0; i < (big ? 6 : 3); i++) {
      this.fx.push({ type: 'smoke', x: x + rand(-r, r) * 0.4, y: y + rand(-r, r) * 0.3, vx: rand(-14, 14), vy: rand(-30, -10), life: rand(0.6, 1), max: 1, size: rand(8, 14) * (big ? 1.4 : 1) });
    }
  }
  fxDeath(e) {
    const col = { imp: '#8f73ff', runner: '#9aa0b5', bat: '#b06bff', brute: '#c9a46b', shaman: '#7dff9a', slime: '#8be36b', slimelet: '#8be36b',
      wraith: '#9ff3ff', knight: '#9c8bff', ogre: '#b8c46b', drake: '#d07bff', lord: '#e08bff' }[e.type] || '#ffffff';
    this.fxSpark(e.x, e.y - 4, col, e.boss ? 40 : 10, e.boss ? 200 : 90, 0.6, e.boss ? 4 : 2.5);
    this.fx.push({ type: 'soul', x: e.x, y: e.y - 6, life: 0.8, max: 0.8, size: e.size, color: col });
  }
  shake(a) { if (a > this.shakeAmp) this.shakeAmp = a; this.shakeT = 0.35; }

  updateFx(dt) {
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmp = 0; }
    if (!this.fx.length) return;
    for (const f of this.fx) {
      f.life -= dt;
      if (f.type === 'spark' || f.type === 'flame' || f.type === 'smoke') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        const drag = f.type === 'flame' ? 0.9 : 0.94;
        f.vx *= Math.pow(drag, dt * 60); f.vy *= Math.pow(drag, dt * 60);
        if (f.type === 'spark') f.vy += 120 * dt;
      } else if (f.type === 'text') f.y -= 26 * dt;
      else if (f.type === 'soul') f.y -= 30 * dt;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
    if (this.fx.length > 1400) this.fx.splice(0, this.fx.length - 1400);
  }
}
