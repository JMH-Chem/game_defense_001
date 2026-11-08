'use strict';
// ─────────────────────────────────────────────────────────────
//  App: 게임 생성·고정 시간 간격 루프·속도 조절
// ─────────────────────────────────────────────────────────────
const STEP = 1 / 60;

// 진행 중인 전투 저장 (웨이브 사이, 필드가 비었을 때)
const RunSave = {
  key: 'lantern-keeper.run.v1',
  load() { try { const raw = localStorage.getItem(this.key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
  save(g) { try { localStorage.setItem(this.key, JSON.stringify(g.serialize())); } catch (e) { /* 저장 불가: 무시 */ } },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { /* 무시 */ } },
};

const App = {
  game: null,
  opts: null,
  speed: 1,
  paused: false,
  modalPause: false,
  acc: 0,
  last: 0,
  view: null,

  resetView() {
    this.view = { mode: 'none', buildType: null, spellId: null, selected: null, hoverX: null, hoverY: null, moveMarker: null, shake: true };
  },

  start(opts) {
    this.opts = opts;
    UI.closeModal();
    this.game = new Game({ ...opts, settings: Save.data.settings });
    this.resetView();
    this.acc = 0;
    this.paused = false;
    this.modalPause = false;
    Renderer.mapFor = null;
    UI.show('game');
    UI.attachGame(this.game);
    UI.layout();
    if (typeof Sfx !== 'undefined') Sfx.musicMood = 'calm';
  },

  restart() { RunSave.clear(); if (this.opts) this.start(this.opts); },

  resume() {
    const data = RunSave.load();
    if (!data) return false;
    let g;
    try { g = Game.restore(data, { settings: Save.data.settings }); } catch (e) { RunSave.clear(); return false; }
    this.start(data.opts);
    this.game = g;
    UI.attachGame(g);
    UI.layout();
    UI.toast(`이어하기 — 웨이브 ${g.wave} 이후부터`, 'gold');
    return true;
  },

  quit() {
    RunSave.clear();
    this.game = null;
    UI.closeModal();
    UI.showStages();
  },

  loop(ts) {
    const dt = Math.min(0.1, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    const g = this.game;
    if (g && UI.screen === 'game') {
      if (!this.paused && !this.modalPause) {
        this.acc += dt * this.speed;
        let n = 0;
        while (this.acc >= STEP && n < 12) { g.update(STEP); this.acc -= STEP; n++; }
        if (n >= 12) this.acc = 0;
      }
      this.view.shake = Save.data.settings.shake;
      this.view.lighting = Save.data.settings.lighting;
      g.settings = Save.data.settings;
      Renderer.draw(g, this.view, this.modalPause ? 0 : dt);
      UI.frame(dt);
      Sfx.musicMood = g.spawning || g.enemies.length ? 'battle' : 'calm';
    }
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener('DOMContentLoaded', () => {
  App.resetView();
  UI.init();
  requestAnimationFrame((t) => App.loop(t));
});

// 테스트·디버그용 핸들
window.LK = { App, UI, Save };
