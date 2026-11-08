'use strict';
// ─────────────────────────────────────────────────────────────
//  App: 게임 생성·고정 시간 간격 루프·속도 조절
// ─────────────────────────────────────────────────────────────
const STEP = 1 / 60;

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

  restart() { if (this.opts) this.start(this.opts); },

  quit() {
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
