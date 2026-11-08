// ─────────────────────────────────────────────────────────────
//  게임 로직(util·data·entities·game)을 Node의 격리된 VM에 올립니다.
//  seed를 주면 Math.random 을 시드 고정 난수로 바꿔 결과가 재현됩니다.
// ─────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/util.js', 'js/data.js', 'js/entities.js', 'js/game.js'];
const EXPORTS = ['Game', 'Path', 'Enemy', 'Tower', 'Soldier', 'Hero', 'Projectile', 'STAGES', 'TOWERS', 'ENEMIES', 'HEROES',
  'RUNES', 'RESONANCE', 'THEMES', 'DIFFICULTY', 'TILE', 'COLS', 'ROWS', 'TOWER_ORDER', 'HERO_ORDER', 'ENEMY_CODEX_ORDER',
  'towerStats', 'computeResonance', 'mulberry32', 'CHALLENGE_RULES', 'dailyChallenge', 'UPGRADES'];

function loadGame({ seed } = {}) {
  const code = FILES.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    `\n;globalThis.__api = { ${EXPORTS.join(', ')} };`;
  const math = Object.create(Math);
  if (seed != null) {
    let a = seed >>> 0;
    math.random = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ctx = { console, Math: math, Date, JSON, Set, Map, WeakMap, Object, Array, Number, String, Boolean, Infinity, NaN, isFinite };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'game-bundle.js' });
  return ctx.__api;
}

module.exports = { loadGame };
