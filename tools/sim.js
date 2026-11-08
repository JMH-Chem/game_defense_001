#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  밸런스 시뮬레이터: 게임 로직을 브라우저 없이 Node에서 돌려
//  봇 플레이어가 각 스테이지를 깰 수 있는지 확인합니다.
//    node tools/sim.js            # 전체 스테이지, 보통/영웅
//    node tools/sim.js 0 normal   # 1스테이지 보통만
// ─────────────────────────────────────────────────────────────
'use strict';
const { loadGame } = require('./load');

let Game, STAGES, TILE, COLS, ROWS, towerStats;
// 테스트에서는 시드 고정 난수를 쓴 API로 다시 초기화합니다
function init(api) { ({ Game, STAGES, TILE, COLS, ROWS, towerStats } = api); }
init(loadGame());

// ── 봇 성향 ──
const PROFILES = {
  // 평균적인 플레이어: 다양한 타워, 업그레이드, 주문 사용
  balanced: {
    plan: ['archer', 'barracks', 'archer', 'cannon', 'frost', 'arcane', 'archer', 'shrine', 'cannon', 'arcane', 'frost', 'archer', 'barracks', 'arcane', 'cannon', 'shrine', 'archer', 'arcane'],
    branch: { archer: [0, 1], cannon: [0, 1], frost: [1, 0], arcane: [0, 1], shrine: [1, 0], barracks: [0, 1] },
    towerPerWave: 0.75, spells: true, early: true,
  },
  // 궁수탑만 짓고 업그레이드 안 하는 초보 — 져야 정상
  lazy: { plan: ['archer'], branch: {}, towerPerWave: 99, spells: false, early: false, noUpgrade: true },
};

function coverageScore(g, c, r, range, wantAir) {
  const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
  const R2 = (range * TILE) ** 2;
  let s = 0;
  const paths = wantAir ? g.paths.concat(g.airPaths) : g.paths;
  for (const p of paths) {
    for (let d = 0; d < p.length; d += 12) {
      const pt = p.at(d);
      if ((pt.x - x) ** 2 + (pt.y - y) ** 2 <= R2) s += 1 + d / p.length; // 출구 쪽 가중
    }
  }
  return s;
}

function bestTile(g, type) {
  let best = null, bs = -1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!g.canBuild(c, r)) continue;
      let s;
      if (type === 'shrine') {
        s = 0;
        for (const t of g.towers) if (t.type !== 'shrine' && Math.hypot(t.c - c, t.r - r) <= 1.6) s += 1 + t.level;
        s += coverageScore(g, c, r, 2, false) * 0.01;
      } else if (type === 'barracks') {
        if (g.pathDist[r][c] !== 1) continue;
        s = coverageScore(g, c, r, 2.4, false);
      } else {
        const range = towerStats(type, 0, null).range;
        s = coverageScore(g, c, r, range, type !== 'cannon');
      }
      if (s > bs) { bs = s; best = { c, r }; }
    }
  }
  return best;
}

function runBot(stageIdx, diff, profileName, heroId = 'aren', verbose = false) {
  const prof = PROFILES[profileName];
  const g = new Game({ stage: stageIdx, difficulty: diff, hero: heroId, headless: true, settings: { dmgNumbers: false } });
  let planIdx = 0;
  const branchCount = {};
  const dt = 1 / 60;
  let decide = 0;
  let guard = 0;
  const log = [];
  g.on('runes', () => { g.chooseRune(0); });
  g.on('wave', ({ n }) => {
    if (verbose) log.push(`W${n} gold=${g.gold} lives=${g.lives} towers=${g.towers.length}`);
  });
  g.startWave();
  while (g.state !== 'won' && g.state !== 'lost' && guard++ < 60 * 60 * 60) {
    g.update(dt);
    decide -= dt;
    if (decide > 0) continue;
    decide = 0.5;
    // 건설 / 업그레이드
    for (let k = 0; k < 4; k++) {
      const want = Math.min(26, 3 + Math.floor(g.wave * prof.towerPerWave));
      const type = prof.plan[planIdx % prof.plan.length];
      const cost = g.buildCost(type);
      const upg = prof.noUpgrade ? null : g.towers
        .filter((t) => t.branch == null)
        .map((t) => ({ t, opt: g.upgradeOptions(t)[0] }))
        .sort((a, b) => a.opt.cost - b.opt.cost)[0];
      if ((g.towers.length < want || !upg) && g.gold >= cost) {
        const tile = bestTile(g, type);
        if (tile && g.build(type, tile.c, tile.r).ok) { planIdx++; continue; }
      }
      if (upg) {
        const t = upg.t;
        let bi = 0;
        if (t.level === 2) {
          const opts = prof.branch[t.type] || [0];
          branchCount[t.type] = (branchCount[t.type] || 0);
          bi = opts[branchCount[t.type] % opts.length];
        }
        const cost2 = t.level < 2 ? upg.opt.cost : g.upgradeOptions(t)[bi].cost;
        if (g.gold >= cost2 && (g.towers.length >= want || g.gold >= cost2 + cost)) {
          g.upgrade(t, bi);
          if (t.level === 3) branchCount[t.type]++;
          continue;
        }
      }
      break;
    }
    // 주문
    if (prof.spells && g.enemies.length) {
      const front = g.enemies.reduce((a, b) => (a.remaining() < b.remaining() ? a : b));
      if (g.spells.meteor <= 0) {
        const near = g.enemies.filter((e) => !e.flying && Math.hypot(e.x - front.x, e.y - front.y) < TILE * 1.4).length;
        if (near >= 4 || front.boss) g.castSpell('meteor', front.x, front.y);
      }
      if (g.spells.reinforce <= 0 && !front.flying) g.castSpell('reinforce', front.x, front.y);
      if (g.heroSkillReady()) {
        const h = g.hero;
        if (h.def.skill.target === 'self') { if (h.blocking) g.castHeroSkill(h.x, h.y); }
        else g.castHeroSkill(front.x, front.y);
      }
    }
    if (prof.early && g.countdown != null && g.enemies.length === 0) g.callWave();
  }
  return {
    stage: stageIdx + 1, diff, profile: profileName, hero: heroId,
    result: g.state, lives: g.lives, wave: g.wave, towers: g.towers.length,
    maxed: g.towers.filter((t) => t.branch != null).length, gold: g.gold,
    earned: Math.round(g.stats.goldEarned), kills: g.stats.kills, time: Math.round(g.time),
    runes: g.runes.map((r) => r.id).join(','), log,
  };
}

module.exports = { init, runBot, PROFILES };
if (require.main === module) main();

function main() {
  const argv = process.argv.slice(2);
  const flags = { v: argv.includes('-v'), n: 1 };
  const ni = argv.indexOf('-n');
  if (ni >= 0) flags.n = Number(argv[ni + 1]);
  const args = argv.filter((a, i) => !a.startsWith('-') && !(ni >= 0 && i === ni + 1));
  const pickArg = (i, all) => (args[i] != null && args[i] !== 'all' ? [args[i]] : all);
  const stages = pickArg(0, STAGES.map((_, i) => String(i))).map(Number);
  const diffs = pickArg(1, ['normal', 'hard']);
  const heroes = pickArg(2, ['aren', 'lyra', 'serin']);
  const profiles = pickArg(3, ['balanced', 'lazy']);

  const t0 = Date.now();
  for (const s of stages) {
    for (const d of diffs) {
      for (const p of profiles) {
        for (const h of (p === 'lazy' ? ['aren'] : heroes)) {
          const runs = [];
          for (let i = 0; i < flags.n; i++) runs.push(runBot(s, d, p, h, flags.v));
          const wins = runs.filter((r) => r.result === 'won');
          const avg = (k, arr = runs) => (arr.length ? Math.round(arr.reduce((a, r) => a + r[k], 0) / arr.length) : 0);
          const minWave = Math.min(...runs.map((r) => r.wave));
          console.log(`[S${s + 1} ${d.padEnd(6)} ${p.padEnd(8)} ${h.padEnd(5)}] win ${wins.length}/${runs.length}  lives(avg win) ${String(avg('lives', wins)).padStart(2)}  minWave ${String(minWave).padStart(2)}  towers ${avg('towers')} (${avg('maxed')} max)  leftover ${avg('gold')}  earned ${avg('earned')}`);
          if (flags.v) for (const r of runs) console.log('   ' + r.log.join('\n   '));
        }
      }
    }
  }
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
