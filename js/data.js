'use strict';
// ─────────────────────────────────────────────────────────────
//  게임 데이터 — 밸런스 수치는 전부 이 파일에서 조정합니다.
//  거리 단위: 타일(1타일 = 48px), 시간 단위: 초
// ─────────────────────────────────────────────────────────────
const TILE = 48;
const COLS = 20;
const ROWS = 12;
const WORLD_W = TILE * COLS; // 960
const WORLD_H = TILE * ROWS; // 576

const TOWER_ORDER = ['archer', 'cannon', 'frost', 'arcane', 'shrine', 'barracks'];
const TARGET_MODES = [
  { id: 'first', name: '선두' },
  { id: 'last', name: '후미' },
  { id: 'strong', name: '강적' },
  { id: 'close', name: '근접' },
];
const DMG_NAMES = { phys: '물리', magic: '마법', true: '고정' };

// ── 타워 ─────────────────────────────────────────────────────
// levels[0..2]는 누적 덮어쓰기, Lv.3에서 branches 중 하나로 분기 (최종 단계)
const TOWERS = {
  archer: {
    name: '궁수탑', hotkey: '1', color: '#f2c46d',
    desc: '빠른 연사로 단일 대상을 공격합니다. 공중 공격 가능.',
    levels: [
      { cost: 70, kind: 'arrow', dmgType: 'phys', dmg: 7, cd: 0.8, range: 3.2, air: true },
      { cost: 80, dmg: 16, cd: 0.7, range: 3.4 },
      { cost: 120, dmg: 27, cd: 0.6, range: 3.6 },
    ],
    branches: [
      { id: 'sniper', name: '매의 둥지', cost: 230,
        desc: '초장거리 저격. 방어력 60% 무시, 25% 확률 치명타(×2.5). 기본 조준: 강적.',
        dmg: 130, cd: 1.6, range: 5.6, armorPen: 0.6, crit: 0.25, critMul: 2.5, defaultMode: 'strong' },
      { id: 'repeater', name: '연발 쇠뇌', cost: 220,
        desc: '한 번에 최대 3명의 적에게 화살을 난사합니다.',
        dmg: 19, cd: 0.33, range: 3.8, multishot: 3 },
    ],
  },
  cannon: {
    name: '대포탑', hotkey: '2', color: '#ff8a4c',
    desc: '착탄 지점에 범위 폭발 피해. 공중 공격 불가.',
    levels: [
      { cost: 110, kind: 'cannon', dmgType: 'phys', dmg: 18, cd: 1.7, range: 2.9, splash: 0.95, air: false },
      { cost: 120, dmg: 34, cd: 1.6, range: 3.1, splash: 1.05 },
      { cost: 160, dmg: 60, cd: 1.5, range: 3.3, splash: 1.15 },
    ],
    branches: [
      { id: 'mortar', name: '대형 박격포', cost: 270, kind: 'mortar',
        desc: '초장거리 포격. 거대한 폭발 후 3초간 불타는 지면을 남깁니다.',
        dmg: 140, cd: 2.6, range: 5.8, splash: 1.55, fireGround: { dps: 26, dur: 3, radius: 1.15 } },
      { id: 'flame', name: '화염 방사기', cost: 250, kind: 'flame', dmgType: 'magic',
        desc: '근거리 부채꼴 화염. 마법 피해 + 지속 화상으로 장갑을 무시합니다.',
        dmg: 7, cd: 0.12, range: 2.5, cone: 0.55, splash: 0, burn: { dps: 20, dur: 2.5 } },
    ],
  },
  frost: {
    name: '서리탑', hotkey: '3', color: '#7fd8ff',
    desc: '냉기 탄환으로 적을 둔화시킵니다. 공중 공격 가능.',
    levels: [
      { cost: 90, kind: 'frost', dmgType: 'magic', dmg: 5, cd: 1.0, range: 2.8, air: true, slow: 0.35, slowDur: 1.6 },
      { cost: 90, dmg: 10, cd: 0.95, range: 3.0, slow: 0.4 },
      { cost: 130, dmg: 18, cd: 0.9, range: 3.2, slow: 0.45, splash: 0.7 },
    ],
    branches: [
      { id: 'glacier', name: '빙결 첨탑', cost: 230,
        desc: '30% 확률로 적을 1.2초간 얼립니다. 얼어붙은 적은 모든 피해를 50% 더 받습니다.',
        dmg: 50, cd: 1.1, range: 3.4, slow: 0.5, splash: 0.9, freezeChance: 0.3, freezeDur: 1.2 },
      { id: 'blizzard', name: '눈보라 제단', cost: 240, kind: 'aura',
        desc: '사거리 안의 모든 적에게 끊임없이 냉기 피해와 강한 둔화를 겁니다.',
        dmg: 16, cd: 0.5, range: 2.8, splash: 0, slow: 0.5, slowDur: 1.0 },
    ],
  },
  arcane: {
    name: '비전탑', hotkey: '4', color: '#c48bff',
    desc: '적들 사이를 튕기는 연쇄 번개. 공중 공격 가능.',
    levels: [
      { cost: 120, kind: 'chain', dmgType: 'magic', dmg: 20, cd: 1.5, range: 3.0, air: true, chain: 2, chainFalloff: 0.8, chainRange: 1.8 },
      { cost: 130, dmg: 32, cd: 1.4, range: 3.1, chain: 3 },
      { cost: 170, dmg: 52, cd: 1.3, range: 3.3, chain: 4 },
    ],
    branches: [
      { id: 'tesla', name: '폭풍 코일', cost: 290,
        desc: '번개가 최대 8번 튕기며 맞은 적을 잠시 기절시킵니다.',
        dmg: 72, cd: 1.0, range: 3.5, chain: 8, chainFalloff: 0.8, stun: 0.25 },
      { id: 'prism', name: '공허 프리즘', cost: 290, kind: 'beam',
        desc: '한 대상을 지속 광선으로 지집니다. 같은 대상을 오래 공격할수록 피해가 최대 5배까지 증가합니다. (피해 = 초당)',
        dmg: 48, cd: 0, chain: null, range: 3.4, ramp: 1.1, rampMax: 5, defaultMode: 'strong' },
    ],
  },
  shrine: {
    name: '성소', hotkey: '5', color: '#ffe08a',
    desc: '공격하지 않습니다. 주변 타워를 강화하고 웨이브마다 골드를 바칩니다.',
    levels: [
      { cost: 100, kind: 'support', range: 1.6, buffDmg: 0.15, buffRate: 0, buffRange: 0, income: 10 },
      { cost: 120, buffDmg: 0.2, buffRate: 0.08, income: 15 },
      { cost: 160, range: 2.2, buffDmg: 0.25, buffRate: 0.12, income: 22 },
    ],
    branches: [
      { id: 'treasury', name: '황금 성소', cost: 220,
        desc: '웨이브마다 골드 +60. 범위 안에서 처치된 적은 골드를 3 더 줍니다.',
        income: 60, killBonus: 3 },
      { id: 'warshrine', name: '전쟁 성소', cost: 260,
        desc: '주변 타워 피해 +40%, 공격속도 +20%, 사거리 +0.5칸.',
        range: 2.4, buffDmg: 0.4, buffRate: 0.2, buffRange: 0.5 },
    ],
  },
  barracks: {
    name: '병영', hotkey: '6', color: '#9be37b',
    desc: '길목에 병사를 보내 지상 적의 진군을 막습니다. 비행·망령은 막지 못합니다.',
    levels: [
      { cost: 90, kind: 'barracks', dmgType: 'phys', range: 2.4, soldiers: 2, sHp: 70, sDmg: 6, sCd: 1.0, sArmor: 0.1, respawn: 10 },
      { cost: 110, soldiers: 3, sHp: 110, sDmg: 9 },
      { cost: 150, sHp: 160, sDmg: 13, sArmor: 0.3, respawn: 9 },
    ],
    branches: [
      { id: 'paladin', name: '성기사단', cost: 240,
        desc: '튼튼한 성기사 3명. 높은 방어력과 빠른 체력 재생.',
        sHp: 330, sDmg: 18, sArmor: 0.5, regen: 14, respawn: 8 },
      { id: 'berserker', name: '광전사 막사', cost: 240,
        desc: '흉포한 광전사 3명. 빠르고 강력한 공격, 준 피해의 25%를 흡혈.',
        sHp: 220, sDmg: 34, sCd: 0.7, sArmor: 0.15, lifesteal: 0.25 },
    ],
  },
};

function towerStats(type, level, branch) {
  const def = TOWERS[type];
  const s = {};
  for (let i = 0; i <= Math.min(level, 2); i++) Object.assign(s, def.levels[i]);
  if (branch != null) Object.assign(s, def.branches[branch]);
  return s;
}

// ── 공명(시너지): 같은 종류 타워 수에 따른 보너스 ───────────────
const RESONANCE = {
  archer: { name: '명사수', tiers: [2, 4, 6], text: ['궁수탑 공격속도 +10%', '궁수탑 공격속도 +25%', '궁수탑 공격속도 +45%'] },
  cannon: { name: '포격', tiers: [2, 4, 6], text: ['폭발 범위 +10%', '폭발 범위 +20%', '폭발 범위 +35%, 피격 적 방어력 -25%'] },
  frost: { name: '혹한', tiers: [2, 4, 6], text: ['둔화 +5%p', '둔화 +10%p', '둔화 +15%p, 둔화된 적이 받는 피해 +15%'] },
  arcane: { name: '뇌운', tiers: [2, 4, 6], text: ['연쇄 +1', '연쇄 +2', '연쇄 +3, 광선 가속 +50%'] },
  shrine: { name: '신앙', tiers: [2, 3, 4], text: ['성소 효과 +25%', '성소 효과 +50%', '성소 효과 +100%'] },
  barracks: { name: '군단', tiers: [2, 4, 6], text: ['병사 체력 +20%', '병사 체력 +40%', '병사 체력 +70%, 병사 +1'] },
};
const HARMONY = { name: '조화', text: '6종 타워를 모두 보유 — 모든 타워 피해 +12%' };

function computeResonance(counts, unity) {
  const tier = {};
  for (const t of TOWER_ORDER) {
    const n = counts[t] || 0;
    let k = 0;
    RESONANCE[t].tiers.forEach((need, i) => { if (n >= need - unity) k = i + 1; });
    tier[t] = k;
  }
  const pick = (t, arr) => (tier[t] ? arr[tier[t] - 1] : 0);
  const harmony = TOWER_ORDER.every((t) => (counts[t] || 0) > 0);
  return {
    tier,
    harmonyOn: harmony,
    harmony: harmony ? 0.12 : 0,
    rate: { archer: pick('archer', [0.1, 0.25, 0.45]) },
    splash: pick('cannon', [0.1, 0.2, 0.35]),
    shredOnHit: tier.cannon >= 3 ? 0.25 : 0,
    slowAdd: pick('frost', [0.05, 0.1, 0.15]),
    slowVuln: tier.frost >= 3 ? 0.15 : 0,
    chainAdd: pick('arcane', [1, 2, 3]),
    beamRamp: tier.arcane >= 3 ? 0.5 : 0,
    shrineMul: pick('shrine', [0.25, 0.5, 1.0]),
    soldierHp: pick('barracks', [0.2, 0.4, 0.7]),
    soldierExtra: tier.barracks >= 3 ? 1 : 0,
  };
}

// ── 적 ───────────────────────────────────────────────────────
// speed: 타일/초, cost: 웨이브 예산 단가, interval: 같은 무리 내 출현 간격
const ENEMIES = {
  imp: { name: '그림자 도깨비', hp: 42, speed: 1.05, gold: 5, lives: 1, atk: 5, atkCd: 1.0, size: 11, cost: 1, interval: 0.8, weight: 3,
    trait: '가장 흔한 어둠의 졸개. 특별한 능력은 없습니다.' },
  runner: { name: '잿빛 늑대', hp: 30, speed: 1.95, gold: 4, lives: 1, atk: 4, atkCd: 0.8, size: 11, cost: 0.9, interval: 0.5, weight: 2,
    trait: '매우 빠르게 달립니다. 둔화나 병사로 붙잡으세요.' },
  bat: { name: '황혼 박쥐', hp: 34, speed: 1.25, flying: true, gold: 5, lives: 1, size: 10, cost: 1.4, interval: 0.85, weight: 2,
    trait: '비행. 길을 무시하고 점선 항로를 따라 등불로 곧장 날아옵니다. 대포·병사는 공격할 수 없습니다.' },
  brute: { name: '철갑 골렘', hp: 170, speed: 0.62, armor: 0.55, gold: 12, lives: 2, atk: 14, atkCd: 1.4, size: 16, cost: 3.2, interval: 1.6, weight: 2,
    trait: '두꺼운 장갑이 물리 피해를 55% 줄입니다. 마법으로 녹이세요.' },
  shaman: { name: '타락한 주술사', hp: 85, speed: 0.9, mres: 0.5, gold: 10, lives: 1, atk: 6, atkCd: 1.2, size: 12, cost: 2.5, interval: 1.4, weight: 1.4,
    heal: { cd: 3, radius: 1.8, pct: 0.1 }, trait: '3초마다 주변 적의 체력을 10% 회복시킵니다. 마법 저항 50%.' },
  slime: { name: '분열 점액', hp: 100, speed: 0.85, gold: 4, lives: 1, atk: 6, atkCd: 1.1, size: 14, cost: 2.3, interval: 1.3, weight: 1.6,
    split: { type: 'slimelet', count: 2 }, trait: '처치하면 작은 점액 2마리로 분열합니다.' },
  slimelet: { name: '작은 점액', hp: 32, speed: 1.3, gold: 2, lives: 1, atk: 3, atkCd: 1.0, size: 8, cost: 0.6, interval: 0.6, weight: 0, hidden: true,
    trait: '분열 점액에서 떨어져 나온 조각.' },
  wraith: { name: '울부짖는 망령', hp: 72, speed: 1.3, mres: 0.75, gold: 8, lives: 1, size: 12, cost: 2.0, interval: 1.0, weight: 1.6, ethereal: true,
    trait: '실체가 없어 병사와 영웅이 막을 수 없습니다. 마법 저항 75%.' },
  knight: { name: '공허 방패병', hp: 130, shield: 130, speed: 0.72, armor: 0.3, gold: 13, lives: 2, atk: 11, atkCd: 1.3, size: 14, cost: 3.4, interval: 1.6, weight: 1.4,
    trait: '체력과 같은 양의 보호막이 피해를 먼저 흡수합니다. 방어력 30%.' },
  troll: { name: '늪 트롤', hp: 230, speed: 0.68, armor: 0.2, gold: 14, lives: 2, atk: 16, atkCd: 1.4, size: 17, cost: 3.6, interval: 1.6, weight: 1.4,
    regen: 0.025, trait: '초당 최대 체력의 2.5%를 재생합니다. 불에 타는 동안에는 재생하지 못합니다.' },
  burrower: { name: '땅굴벌레', hp: 95, speed: 1.0, gold: 8, lives: 1, atk: 6, atkCd: 1.0, size: 12, cost: 2.2, interval: 1.0, weight: 1.4,
    burrow: { every: 4, dur: 1.8, speedMul: 1.8 }, trait: '주기적으로 땅속으로 파고들어 1.8초 동안 공격받지 않고 빠르게 이동합니다.' },
  hexer: { name: '저주술사', hp: 110, speed: 0.8, mres: 0.4, gold: 14, lives: 1, atk: 6, atkCd: 1.2, size: 12, cost: 3.0, interval: 1.8, weight: 1.0,
    hex: { cd: 6, range: 3, dur: 3 }, trait: '6초마다 가장 가까운 타워 하나를 3초 동안 마비시킵니다. 마법 저항 40%.' },
  ogre: { name: '오우거 족장', hp: 2400, speed: 0.48, armor: 0.3, gold: 150, lives: 10, atk: 45, atkCd: 1.6, size: 26, boss: true, cost: 30,
    stomp: { cd: 5, radius: 1.7, dmg: 60, stun: 1.5 }, trait: '보스. 막아선 병사들을 주기적으로 짓밟아 기절시킵니다.' },
  drake: { name: '그림자 비룡', hp: 3400, speed: 0.45, mres: 0.35, flying: true, gold: 200, lives: 10, size: 28, boss: true, cost: 40,
    brood: { type: 'bat', count: 3, step: 0.2 }, trait: '비행 보스. 체력이 20% 줄어들 때마다 박쥐 떼를 풀어놓습니다.' },
  hydra: { name: '늪의 히드라', hp: 4600, speed: 0.42, armor: 0.25, mres: 0.25, gold: 240, lives: 15, atk: 40, atkCd: 1.2, size: 28, boss: true, cost: 45,
    regen: 0.012, cleave: 3, trait: '보스. 초당 체력 1.2%를 재생하고(불타는 동안 멈춤), 막아선 병사를 최대 3명까지 동시에 공격합니다.' },
  lord: { name: '어둠의 군주', hp: 12000, speed: 0.4, armor: 0.35, mres: 0.35, gold: 400, lives: 99, atk: 80, atkCd: 1.5, size: 30, boss: true, cost: 60,
    summon: { type: 'imp', count: 3, cd: 8 }, ward: { at: 0.5, pct: 0.3 },
    trait: '최종 보스. 졸개를 소환하고 체력이 절반이 되면 거대한 보호막을 펼칩니다. 등불에 닿으면 즉시 패배.' },
};
const ENEMY_CODEX_ORDER = ['imp', 'runner', 'bat', 'brute', 'shaman', 'slime', 'wraith', 'knight', 'troll', 'burrower', 'hexer', 'ogre', 'drake', 'hydra', 'lord'];

// ── 영웅 ─────────────────────────────────────────────────────
const HEROES = {
  aren: {
    name: '아렌', title: '강철의 기사', color: '#6fb7ff', role: '근접 탱커',
    hp: 520, dmg: 26, cd: 0.9, range: 0, dmgType: 'phys', armor: 0.45, speed: 1.7, regen: 12, engage: 1.6, air: false,
    desc: '단단한 방패로 길목을 틀어막습니다. 넓은 범위의 적을 붙잡습니다.',
    skill: { id: 'bash', name: '방패 강타', cd: 14, target: 'self', radius: 1.7, dmg: 90, stun: 1.6,
      desc: '주변 적에게 피해를 주고 1.6초 기절시킵니다.' },
  },
  lyra: {
    name: '리라', title: '숲의 명궁', color: '#8ef08a', role: '원거리 딜러',
    hp: 260, dmg: 24, cd: 0.75, range: 3.6, dmgType: 'phys', armor: 0.1, speed: 1.9, regen: 6, engage: 0.9, air: true,
    desc: '먼 거리에서 화살을 쏩니다. 공중 공격 가능.',
    skill: { id: 'volley', name: '화살비', cd: 16, target: 'point', radius: 1.5, dmg: 32, hits: 8,
      desc: '지정한 지역에 화살비를 쏟아 8회 범위 피해를 줍니다.' },
  },
  orin: {
    name: '오린', title: '대지의 드루이드', color: '#c9e27a', role: '소환·지원',
    hp: 320, dmg: 21, cd: 1.0, range: 3.0, dmgType: 'magic', armor: 0.15, speed: 1.6, regen: 7, engage: 0.9, air: true,
    rootSlow: 0.3, aura: { radius: 2, heal: 8 },
    desc: '덩굴 씨앗으로 적을 느리게 하고, 곁에 있는 병사들의 체력을 초당 8씩 회복시킵니다.',
    skill: { id: 'grove', name: '숲의 수호자', cd: 22, target: 'point', radius: 2.0, heal: 0.4, dur: 18,
      desc: '지정한 길에 18초간 나무 정령을 불러내 적을 막고, 주변 아군의 체력을 40% 회복시킵니다.' },
  },
  serin: {
    name: '세린', title: '별의 마법사', color: '#e08bff', role: '마법 범위딜',
    hp: 230, dmg: 34, cd: 1.3, range: 3.1, dmgType: 'magic', splash: 0.7, armor: 0, speed: 1.6, regen: 6, engage: 0.9, air: true,
    desc: '폭발하는 별빛 구체를 던집니다. 장갑을 무시하는 마법 피해.',
    skill: { id: 'rift', name: '시간 균열', cd: 18, target: 'point', radius: 2.2, dmg: 85, slow: 0.7, dur: 4,
      desc: '지정한 지역의 적을 4초간 70% 둔화시키고 마법 피해를 줍니다.' },
  },
};
const HERO_ORDER = ['aren', 'lyra', 'serin', 'orin'];

// ── 별 강화 (영구 성장): 별을 써서 트랙별로 3단계까지 ──
const UPGRADES = [
  { id: 'archer', name: '궁술', color: '#f2c46d', sigil: 'archer', levels: [
    { cost: 1, desc: '궁수탑 피해 +10%', apply: (g) => { g.mods.dmg.archer += 0.1; } },
    { cost: 2, desc: '궁수탑 공격속도 +10%', apply: (g) => { g.mods.rate.archer += 0.1; } },
    { cost: 3, desc: '모든 타워 사거리 +5%', apply: (g) => { g.mods.range += 0.05; } },
  ] },
  { id: 'cannon', name: '포술', color: '#ff8a4c', sigil: 'cannon', levels: [
    { cost: 1, desc: '대포탑 피해 +10%', apply: (g) => { g.mods.dmg.cannon += 0.1; } },
    { cost: 2, desc: '폭발 범위 +10%', apply: (g) => { g.mods.splash += 0.1; } },
    { cost: 3, desc: '모든 물리 피해 +8%', apply: (g) => { g.mods.physDmg += 0.08; } },
  ] },
  { id: 'arcana', name: '비술', color: '#c48bff', sigil: 'arcane', levels: [
    { cost: 1, desc: '둔화 +5%p', apply: (g) => { g.mods.slowAdd += 0.05; } },
    { cost: 2, desc: '비전탑 연쇄 +1', apply: (g) => { g.mods.chainAdd += 1; } },
    { cost: 3, desc: '모든 마법 피해 +8%', apply: (g) => { g.mods.magicDmg += 0.08; } },
  ] },
  { id: 'command', name: '군략', color: '#9be37b', sigil: 'barracks', levels: [
    { cost: 1, desc: '병사·민병 체력 +15%', apply: (g) => { g.mods.soldierHp += 0.15; } },
    { cost: 2, desc: '성소 버프 효과 +15%', apply: (g) => { g.mods.shrineMul += 0.15; } },
    { cost: 3, desc: '병사·민병 피해 +20%', apply: (g) => { g.mods.soldierDmg += 0.2; } },
  ] },
  { id: 'hero', name: '영웅담', color: '#6fb7ff', sigil: 'crown', levels: [
    { cost: 1, desc: '영웅 체력 +15%', apply: (g) => { g.mods.heroHp += 0.15; } },
    { cost: 2, desc: '영웅 피해 +15%', apply: (g) => { g.mods.heroDmg += 0.15; } },
    { cost: 3, desc: '영웅 부활 시간 -30%', apply: (g) => { g.mods.heroRespawn *= 0.7; } },
  ] },
  { id: 'supply', name: '병참', color: '#ffd36b', sigil: 'coin', levels: [
    { cost: 1, desc: '시작 골드 +40', apply: (g) => { g.gold += 40; } },
    { cost: 2, desc: '주문 재사용 대기 -12%', apply: (g) => { g.mods.spellCd *= 0.88; } },
    { cost: 3, desc: '생명 +3', apply: (g) => { g.lives += 3; g.maxLives += 3; } },
  ] },
];

// ── 주문 ─────────────────────────────────────────────────────
const SPELLS = {
  meteor: { name: '유성 낙하', key: 'Q', cd: 35, radius: 1.3, color: '#ff8a4c',
    desc: '지정한 지점에 유성 3개를 떨어뜨려 큰 범위 피해와 화상을 입힙니다.' },
  reinforce: { name: '증원군', key: 'W', cd: 20, dur: 16, count: 2, color: '#9be37b',
    desc: '지정한 지점에 민병 2명을 16초간 소환해 적을 막습니다.' },
};

// ── 룬 (웨이브 3개마다 3장 중 1장 선택) ─────────────────────────
// rarity 1=일반 2=희귀 3=전설
const RARITY = {
  1: { name: '일반', color: '#a9b8cc', weight: 62 },
  2: { name: '희귀', color: '#5aa9ff', weight: 30 },
  3: { name: '전설', color: '#ffb347', weight: 8 },
};
const RUNES = [
  { id: 'arrowhead', name: '예리한 화살촉', rarity: 1, sigil: 'archer', desc: '궁수탑 피해 +30%', apply: (g) => { g.mods.dmg.archer += 0.3; } },
  { id: 'powder', name: '정제 화약', rarity: 1, sigil: 'cannon', desc: '대포탑 피해 +20%, 폭발 범위 +15%', apply: (g) => { g.mods.dmg.cannon += 0.2; g.mods.splash += 0.15; } },
  { id: 'permafrost', name: '영구 동토', rarity: 1, sigil: 'frost', desc: '둔화 +8%p, 둔화 지속시간 +50%', apply: (g) => { g.mods.slowAdd += 0.08; g.mods.slowDur += 0.5; } },
  { id: 'overcharge', name: '과충전 코일', rarity: 1, sigil: 'arcane', desc: '비전탑 연쇄 +2, 피해 +10%', apply: (g) => { g.mods.chainAdd += 2; g.mods.dmg.arcane += 0.1; } },
  { id: 'hymn', name: '성가', rarity: 1, sigil: 'shrine', desc: '성소의 버프 효과 +35%', apply: (g) => { g.mods.shrineMul += 0.35; } },
  { id: 'drill', name: '혹독한 훈련', rarity: 1, sigil: 'barracks', desc: '병사·민병 체력 +35%, 피해 +35%', apply: (g) => { g.mods.soldierHp += 0.35; g.mods.soldierDmg += 0.35; } },
  { id: 'alchemy', name: '연금술', rarity: 1, sigil: 'coin', desc: '처치 골드 +20%', apply: (g) => { g.mods.goldMul += 0.2; } },
  { id: 'oil', name: '등불 기름', rarity: 1, sigil: 'heart', desc: '생명 +5', repeat: true, apply: (g) => { g.lives += 5; } },
  { id: 'mason', name: '석공 길드', rarity: 1, sigil: 'hammer', desc: '건설·업그레이드 비용 -12%', apply: (g) => { g.mods.costMul += 0.12; } },
  { id: 'scrap', name: '고물상', rarity: 1, sigil: 'coin', desc: '판매 환급률 70% → 95%', apply: (g) => { g.mods.sellRate = 0.95; } },
  { id: 'purse', name: '두둑한 지갑', rarity: 1, sigil: 'coin', desc: '즉시 150 골드', repeat: true, apply: (g) => { g.addGold(150); } },
  { id: 'hawkeye', name: '매의 눈', rarity: 2, sigil: 'eye', desc: '모든 타워 사거리 +12%', apply: (g) => { g.mods.range += 0.12; } },
  { id: 'frenzy', name: '전장의 광기', rarity: 2, sigil: 'bolt', desc: '모든 타워 공격속도 +15%', apply: (g) => { g.mods.rate.all += 0.15; } },
  { id: 'star', name: '행운의 별', rarity: 2, sigil: 'star', desc: '모든 타워 공격이 12% 확률로 치명타 (피해 ×2)', apply: (g) => { g.mods.crit += 0.12; } },
  { id: 'interest', name: '복리 이자', rarity: 2, sigil: 'coin', desc: '웨이브 시작마다 보유 골드 10당 +1 (최대 +20)', apply: (g) => { g.mods.interest = true; } },
  { id: 'oath', name: '영웅의 맹세', rarity: 2, sigil: 'crown', desc: '영웅 피해·체력 +40%, 부활 시간 -50%', apply: (g) => { g.mods.heroDmg += 0.4; g.mods.heroHp += 0.4; g.mods.heroRespawn *= 0.5; } },
  { id: 'warp', name: '시간 왜곡', rarity: 2, sigil: 'hourglass', desc: '주문·영웅 기술 재사용 대기시간 -35%', apply: (g) => { g.mods.spellCd *= 0.65; } },
  { id: 'bounty', name: '현상금', rarity: 2, sigil: 'flag', desc: '조기 호출 보너스 골드 ×2.5', apply: (g) => { g.mods.earlyMul *= 2.5; } },
  { id: 'elemental', name: '원소 증폭', rarity: 2, sigil: 'orb', desc: '모든 마법 피해 +20%', apply: (g) => { g.mods.magicDmg += 0.2; } },
  { id: 'steel', name: '강철 증폭', rarity: 2, sigil: 'sword', desc: '모든 물리 피해 +20%', apply: (g) => { g.mods.physDmg += 0.2; } },
  { id: 'execute', name: '처형인의 낫', rarity: 3, sigil: 'skull', desc: '체력이 10% 이하로 떨어진 일반 적을 즉시 처치', apply: (g) => { g.mods.execute = 0.1; } },
  { id: 'frostfire', name: '서리불꽃', rarity: 3, sigil: 'frostfire', desc: '둔화·빙결된 적이 받는 모든 피해 +30%', apply: (g) => { g.mods.frostfire += 0.3; } },
  { id: 'unity', name: '만물 공명', rarity: 3, sigil: 'unity', desc: '모든 공명 효과의 필요 타워 수 -1', apply: (g) => { g.mods.unity = 1; } },
  { id: 'golden', name: '황금기', rarity: 3, sigil: 'coin', desc: '즉시 300 골드, 처치 골드 +15%', apply: (g) => { g.addGold(300); g.mods.goldMul += 0.15; } },
  { id: 'heart', name: '등불의 심장', rarity: 3, sigil: 'lantern', desc: '생명 +8. 적이 등불에 닿으면 주변에 큰 폭발을 일으킵니다.', apply: (g) => { g.lives += 8; g.mods.lanternBlast = true; } },
];

// ── 스테이지 ─────────────────────────────────────────────────
// paths: 타일 좌표 웨이포인트(축 정렬). 첫 점은 화면 밖 출현 지점, 마지막 점이 등불.
const THEMES = {
  forest: { ground: '#15231d', ground2: '#1a2b24', speck: '#2d4c3b', grass: '#2f5a42', path: '#4a3c2d', pathEdge: '#241c15', pathSpeck: '#6b5a45',
    decos: ['tree', 'tree', 'tree', 'bush', 'rock', 'mushroom'], ambient: 'firefly', dark: 0.42, portal: '#9d6bff', tint: 'rgba(30,70,60,0.10)' },
  frost: { ground: '#18202e', ground2: '#1d2738', speck: '#3a4c66', grass: '#c9dcf5', path: '#56647a', pathEdge: '#252e3d', pathSpeck: '#8b9bb3',
    decos: ['pine', 'pine', 'pine', 'icerock', 'crystal'], ambient: 'snow', dark: 0.3, portal: '#6fd3ff', tint: 'rgba(60,90,140,0.10)' },
  ruins: { ground: '#1c1724', ground2: '#221c2c', speck: '#3a2e47', grass: '#4a3a5a', path: '#4a3c47', pathEdge: '#221a24', pathSpeck: '#6f5d6c',
    decos: ['pillar', 'rubble', 'deadtree', 'pillar', 'brazier'], ambient: 'ember', dark: 0.48, portal: '#ff5d8f', tint: 'rgba(90,40,80,0.10)' },
  swamp: { ground: '#121c17', ground2: '#18261f', speck: '#28392f', grass: '#3f5c3b', path: '#3b3828', pathEdge: '#1b1a12', pathSpeck: '#5c5640',
    decos: ['pool', 'pool', 'reed', 'reed', 'stump', 'mushroom'], ambient: 'wisp', dark: 0.5, portal: '#7dff9a', tint: 'rgba(40,80,50,0.10)' },
};

const STAGES = [
  {
    id: 1, name: '속삭이는 숲', en: 'WHISPERING WOODS', theme: 'forest',
    desc: '반딧불이 흩날리는 숲길. 구불구불한 외길을 따라 어둠이 처음으로 밀려옵니다.',
    waves: 15, startGold: 280, hpMul: 1.0, budgetMul: 1.0, seed: 11,
    paths: [[[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [18, 9]]],
    unlocks: { imp: 1, runner: 2, bat: 4, brute: 6, shaman: 9, slime: 11 },
    bosses: { 15: 'ogre' },
  },
  {
    id: 2, name: '얼어붙은 협곡', en: 'FROSTFANG PASS', theme: 'frost',
    desc: '눈보라 치는 협곡. 긴 일직선 구간과 하늘을 뒤덮는 박쥐 떼를 조심하세요.',
    waves: 15, startGold: 330, hpMul: 1.15, budgetMul: 1.05, seed: 23,
    paths: [[[10, -1], [10, 2], [2, 2], [2, 6], [17, 6], [17, 10], [5, 10]]],
    unlocks: { imp: 1, runner: 1, slime: 2, bat: 3, brute: 4, wraith: 6, shaman: 7, knight: 10 },
    bosses: { 8: 'ogre', 15: 'drake' },
  },
  {
    id: 3, name: '몰락한 왕도', en: 'THE FALLEN CAPITAL', theme: 'ruins',
    desc: '두 갈래 길이 하나로 합쳐지는 폐허의 수도. 어둠의 군주가 직접 행차합니다.',
    waves: 20, startGold: 380, hpMul: 1.2, budgetMul: 1.1, lateMul: 1.4, seed: 37,
    paths: [
      [[-1, 2], [5, 2], [5, 6], [13, 6], [13, 2], [17, 2], [17, 8]],
      [[-1, 10], [8, 10], [8, 6], [13, 6], [13, 2], [17, 2], [17, 8]],
    ],
    unlocks: { imp: 1, runner: 1, bat: 3, brute: 4, slime: 5, wraith: 6, shaman: 7, knight: 8 },
    bosses: { 10: 'ogre', 15: 'drake', 20: 'lord' },
  },
  {
    id: 4, name: '독안개 늪', en: 'MIREFEN SWAMP', theme: 'swamp',
    desc: '두 길이 한가운데서 엇갈리는 독안개 늪. 재생하는 트롤, 땅을 파는 벌레, 타워를 마비시키는 저주술사가 기다립니다.',
    waves: 18, startGold: 420, hpMul: 1.2, budgetMul: 1.05, lateMul: 1.15, seed: 53,
    paths: [
      [[-1, 3], [5, 3], [5, 8], [11, 8], [11, 4], [16, 4], [16, 9], [18, 9]],
      [[8, -1], [8, 10], [18, 10], [18, 9]],
    ],
    unlocks: { imp: 1, runner: 1, slime: 2, troll: 3, bat: 4, burrower: 5, hexer: 7, brute: 8, shaman: 10, wraith: 12, knight: 13 },
    bosses: { 9: 'ogre', 18: 'hydra' },
  },
];

const DIFFICULTY = {
  normal: { name: '보통', hpBase: 1, hpRamp: 0, lives: 20, goldMul: 1, desc: '생명 20' },
  hard: { name: '영웅', hpBase: 1.08, hpRamp: 0.012, lives: 12, goldMul: 0.95, desc: '적 체력 +10%~+35% (웨이브마다 증가), 생명 12, 처치 골드 -5%' },
};

const WAVE_GAP = 18;      // 웨이브 사이 자동 시작까지의 초
const RUNE_EVERY = 3;     // 몇 웨이브마다 룬 선택
const REROLL_COST = 30;
