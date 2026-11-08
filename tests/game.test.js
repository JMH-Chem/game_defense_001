// ─────────────────────────────────────────────────────────────
//  게임 로직 테스트 — 실행: node --test tests/
// ─────────────────────────────────────────────────────────────
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('../tools/load');
const sim = require('../tools/sim');

const api = loadGame({ seed: 1234 });
const { Game, STAGES, TOWERS, ENEMIES, RUNES, TILE, COLS, ROWS, TOWER_ORDER, towerStats, computeResonance } = api;

const newGame = (stage = 0, opts = {}) => new Game({ stage, hero: 'aren', difficulty: 'normal', headless: true, ...opts });

test('스테이지 데이터: 경로는 축 정렬이고 모두 같은 등불에서 끝난다', () => {
  for (const st of STAGES) {
    const end = st.paths[0][st.paths[0].length - 1];
    for (const p of st.paths) {
      const [c0, r0] = p[0];
      assert.ok(c0 < 0 || r0 < 0 || c0 >= COLS || r0 >= ROWS, `${st.name}: 출현 지점은 화면 밖이어야 함`);
      assert.deepEqual(p[p.length - 1], end, `${st.name}: 모든 경로는 같은 등불에서 끝나야 함`);
      for (let i = 0; i < p.length - 1; i++) {
        assert.ok(p[i][0] === p[i + 1][0] || p[i][1] === p[i + 1][1], `${st.name}: 경로 구간 ${i}가 축 정렬이 아님`);
      }
    }
    for (const t of Object.keys(st.unlocks)) assert.ok(ENEMIES[t], `${st.name}: 알 수 없는 적 ${t}`);
    for (const b of Object.values(st.bosses)) assert.ok(ENEMIES[b] && ENEMIES[b].boss, `${st.name}: ${b}는 보스가 아님`);
  }
});

test('맵 그리드: 길과 등불 칸에는 건설할 수 없고 건설 가능한 칸이 충분하다', () => {
  STAGES.forEach((st, i) => {
    const g = newGame(i);
    assert.equal(g.grid[g.lantern.r][g.lantern.c], 3);
    let open = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (g.grid[r][c] === 1) assert.equal(g.canBuild(c, r), false);
      if (g.canBuild(c, r) && g.pathDist[r][c] <= 2) open++;
    }
    assert.ok(open >= 40, `${st.name}: 길 근처 건설 가능 칸이 ${open}개뿐`);
  });
});

test('타워 데이터: 3레벨 + 2갈래, 갈래는 필요 없는 상속 스탯을 끈다', () => {
  for (const type of TOWER_ORDER) {
    assert.equal(TOWERS[type].levels.length, 3);
    assert.equal(TOWERS[type].branches.length, 2);
    for (let b = 0; b < 2; b++) assert.ok(towerStats(type, 3, b).kind, `${type}/${b} kind 없음`);
  }
  assert.equal(towerStats('archer', 3, 0).armorPen, 0.6);
  assert.equal(towerStats('arcane', 3, 1).chain, null);
  assert.equal(towerStats('cannon', 3, 1).splash, 0);
});

test('웨이브 생성은 시드 고정이라 항상 같다', () => {
  const a = newGame(2), b = newGame(2);
  for (const n of [1, 7, 15, 20]) assert.deepEqual(a.buildWave(n).spawns, b.buildWave(n).spawns);
  assert.ok(a.buildWave(20).spawns.some((s) => s.type === 'lord' && s.boss));
});

test('피해 공식: 방어력은 물리, 마법 저항은 마법만 줄이고 고정 피해는 그대로', () => {
  const g = newGame();
  const brute = g.spawnEnemy('brute', 0, 10);
  assert.equal(Math.round(brute.takeDamage(100, 'phys', null)), 45);
  assert.equal(Math.round(brute.takeDamage(100, 'magic', null)), 100);
  const shaman = g.spawnEnemy('shaman', 0, 10);
  assert.equal(Math.round(shaman.takeDamage(100, 'magic', null)), 50);
  assert.equal(Math.round(shaman.takeDamage(100, 'true', null)), 100);
});

test('경제: 다음 웨이브 전까지는 전액 환불, 이후엔 70%', () => {
  const g = newGame();
  const start = g.gold;
  const { tower } = g.build('archer', 3, 3);
  assert.equal(g.gold, start - 70);
  assert.equal(g.sellValue(tower), 70);
  g.upgrade(tower);
  assert.equal(g.sellValue(tower), 150);
  g.startWave();
  assert.equal(g.sellValue(tower), Math.floor(150 * 0.7));
  assert.equal(g.build('archer', 3, 3).ok, false, '같은 칸에 두 번 건설 불가');
});

test('업그레이드: Lv.3 이후 두 갈래 중 하나로 최종 진화하고 더는 못 올린다', () => {
  const g = newGame();
  g.gold = 10000;
  const { tower } = g.build('arcane', 3, 3);
  g.upgrade(tower); g.upgrade(tower);
  assert.equal(g.upgradeOptions(tower).length, 2);
  assert.ok(g.upgrade(tower, 1).ok);
  assert.equal(tower.branch, 1);
  assert.equal(tower.e.kind, 'beam');
  assert.equal(g.upgradeOptions(tower).length, 0);
  assert.equal(g.upgrade(tower, 0).ok, false);
});

test('공명: 개수에 따라 단계가 오르고 만물 공명은 조건을 1 낮춘다', () => {
  assert.equal(computeResonance({ archer: 1 }, 0).tier.archer, 0);
  assert.equal(computeResonance({ archer: 2 }, 0).tier.archer, 1);
  assert.equal(computeResonance({ archer: 3 }, 1).tier.archer, 2);
  const all = Object.fromEntries(TOWER_ORDER.map((t) => [t, 1]));
  assert.equal(computeResonance(all, 0).harmonyOn, true);
});

test('룬: 모든 룬이 오류 없이 적용된다', () => {
  for (const r of RUNES) {
    const g = newGame();
    g.build('archer', 3, 3);
    g.runeChoices = [r];
    g.paused = true;
    assert.ok(g.chooseRune(0), r.id);
    assert.equal(g.paused, false);
  }
});

test('땅굴벌레: 땅속에 있는 동안은 타워가 조준하지 못한다', () => {
  const g = newGame(3);
  const { tower } = g.build('archer', 4, 4);
  const e = g.spawnEnemy('burrower', 0, 1, TILE * 4);
  e.place();
  assert.equal(tower.findTarget(), e);
  e.burrowed = true;
  assert.equal(tower.findTarget(), null);
});

test('저주술사: 근처 타워를 일정 시간 마비시킨다', () => {
  const g = newGame(3);
  const { tower } = g.build('archer', 4, 4);
  const e = g.spawnEnemy('hexer', 0, 1, TILE * 4);
  e.cdA = 0;
  e.abilities(0.016);
  assert.ok(tower.disabledT > 0);
});

test('봇 회귀: 보통 1스테이지는 균형 잡힌 봇이 이기고 궁수만 까는 봇은 진다', () => {
  sim.init(loadGame({ seed: 7 }));
  assert.equal(sim.runBot(0, 'normal', 'balanced', 'aren').result, 'won');
  assert.equal(sim.runBot(0, 'normal', 'lazy', 'aren').result, 'lost');
});

test('모든 스테이지를 처음부터 끝까지 오류 없이 플레이할 수 있다', () => {
  sim.init(loadGame({ seed: 99 }));
  STAGES.forEach((st, i) => {
    const r = sim.runBot(i, 'normal', 'balanced', 'serin');
    assert.ok(r.result === 'won' || r.result === 'lost', `${st.name}: ${r.result}`);
    assert.ok(r.wave >= 5, `${st.name}: 웨이브 ${r.wave}에서 너무 일찍 끝남`);
  });
});

test('저장·이어하기: 스냅샷을 복원하면 타워·골드·웨이브·룬·영웅이 그대로다', () => {
  const g = newGame(2, { meta: { supply: 1, archer: 2 } });
  g.gold = 5000;
  const a = g.build('archer', 3, 3).tower;
  g.upgrade(a); g.upgrade(a); g.upgrade(a, 0);
  const b = g.build('barracks', 7, 7).tower;
  b.setRally(b.rally.x + 4, b.rally.y);
  g.runeChoices = [RUNES.find((r) => r.id === 'frenzy')];
  g.chooseRune(0);
  g.wave = 6;
  g.hero.gainXp(500);
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const r = Game.restore(data);
  assert.equal(r.gold, g.gold);
  assert.equal(r.wave, 6);
  assert.equal(r.towers.length, 2);
  assert.equal(r.towers[0].branch, 0);
  assert.equal(r.towers[0].e.dmg, a.e.dmg, '룬·강화가 다시 적용되어 같은 피해');
  // VM 샌드박스 객체와 프로토타입이 달라 필드 단위로 비교
  assert.equal(r.towers[1].rally.x, b.rally.x);
  assert.equal(r.towers[1].rally.y, b.rally.y);
  assert.equal(r.hero.level, g.hero.level);
  assert.equal(r.state, 'running');
  assert.equal(r.countdown != null, true);
  assert.equal(r.waveInfo.n, 7);
});
