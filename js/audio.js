'use strict';
// ─────────────────────────────────────────────────────────────
//  사운드: WebAudio로 실시간 합성 (음원 파일 없음)
// ─────────────────────────────────────────────────────────────
const Sfx = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  noiseBuf: null,
  sfxOn: true,
  musicOn: true,
  last: {},
  musicTimer: null,
  musicStep: 0,
  musicMood: 'calm',

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.7;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6;
    this.master.connect(comp).connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0;
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicOn ? 0.22 : 0;
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic();
  },

  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05); },
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.3); },

  tone(type, f0, f1, dur, vol, when = 0, bus) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq, q = 1, type = 'bandpass', when = 0, f1) {
    const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  // 같은 소리가 너무 자주 겹치지 않도록 제한
  gate(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  },

  play(name) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const r = () => 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'arrow': if (this.gate(name, 60)) { this.noise(0.07, 0.18, 3200 * r(), 2); this.tone('triangle', 900 * r(), 500, 0.05, 0.05); } break;
      case 'snipe': if (this.gate(name, 90)) { this.noise(0.14, 0.3, 2400, 3, 'bandpass', 0, 800); this.tone('square', 1400, 300, 0.09, 0.05); } break;
      case 'cannon': if (this.gate(name, 90)) { this.tone('sine', 140 * r(), 45, 0.22, 0.45); this.noise(0.18, 0.25, 700, 0.8, 'lowpass'); } break;
      case 'mortar': if (this.gate(name, 150)) { this.tone('sine', 110, 40, 0.35, 0.5); this.noise(0.3, 0.3, 500, 0.7, 'lowpass'); } break;
      case 'thud': if (this.gate(name, 80)) { this.noise(0.22, 0.35, 420, 0.8, 'lowpass', 0, 120); this.tone('sine', 90, 40, 0.18, 0.3); } break;
      case 'boom': if (this.gate(name, 110)) { this.noise(0.6, 0.6, 600, 0.6, 'lowpass', 0, 80); this.tone('sine', 80, 30, 0.5, 0.6); } break;
      case 'frost': if (this.gate(name, 80)) { this.tone('triangle', 1600 * r(), 2400, 0.12, 0.08); this.tone('sine', 2600 * r(), 3200, 0.1, 0.04, 0.03); } break;
      case 'zap': if (this.gate(name, 70)) { this.tone('sawtooth', 220 * r(), 1200, 0.08, 0.12); this.noise(0.12, 0.2, 5000, 1.5, 'highpass'); } break;
      case 'flame': if (this.gate(name, 120)) this.noise(0.18, 0.12, 900, 0.5, 'lowpass'); break;
      case 'pop': if (this.gate(name, 60)) { this.tone('sine', 700 * r(), 200, 0.12, 0.15); } break;
      case 'orb': if (this.gate(name, 80)) { this.tone('sine', 520 * r(), 980, 0.14, 0.1); } break;
      case 'hit': if (this.gate(name, 70)) { this.noise(0.05, 0.12, 1800 * r(), 3); this.tone('square', 320 * r(), 180, 0.04, 0.04); } break;
      case 'die': if (this.gate(name, 45)) { this.tone('triangle', 420 * r(), 120, 0.14, 0.08); this.noise(0.08, 0.08, 1500, 1); } break;
      case 'leak': this.tone('square', 220, 110, 0.35, 0.18); this.tone('square', 165, 82, 0.4, 0.12, 0.08); break;
      case 'build': this.noise(0.12, 0.3, 500, 1, 'lowpass'); this.tone('triangle', 260, 180, 0.12, 0.18); this.tone('triangle', 390, 390, 0.1, 0.12, 0.08); break;
      case 'upgrade': [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.13, i * 0.06)); break;
      case 'sell': [784, 659, 523].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.12, i * 0.05)); this.play('coin'); break;
      case 'coin': if (this.gate(name, 50)) { this.tone('square', 988, 988, 0.06, 0.06); this.tone('square', 1318, 1318, 0.12, 0.06, 0.05); } break;
      case 'click': this.tone('triangle', 660, 520, 0.05, 0.08); break;
      case 'deny': this.tone('square', 180, 140, 0.14, 0.1); break;
      case 'wave': [220, 277, 330].forEach((f, i) => { this.tone('sawtooth', f, f * 1.01, 0.9, 0.06, i * 0.02); }); this.noise(0.5, 0.12, 300, 0.5, 'lowpass'); break;
      case 'boss': [110, 104, 98].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.7, 0.14, i * 0.3)); this.noise(1.2, 0.2, 200, 0.5, 'lowpass'); break;
      case 'bossdie': this.noise(1.2, 0.5, 900, 0.5, 'lowpass', 0, 60); [392, 523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.4, 0.12, 0.2 + i * 0.1)); break;
      case 'heal': if (this.gate(name, 300)) { this.tone('sine', 660, 990, 0.25, 0.06); } break;
      case 'stomp': this.tone('sine', 70, 30, 0.45, 0.6); this.noise(0.4, 0.4, 300, 0.6, 'lowpass'); break;
      case 'screech': this.tone('sawtooth', 1200, 500, 0.3, 0.08); this.tone('sawtooth', 1500, 700, 0.25, 0.06, 0.05); break;
      case 'summon': this.tone('sawtooth', 160, 90, 0.5, 0.12); this.tone('sine', 320, 640, 0.4, 0.06); break;
      case 'ward': [330, 415, 494].forEach((f, i) => this.tone('sine', f, f * 1.5, 0.6, 0.08, i * 0.1)); break;
      case 'meteor': this.noise(0.9, 0.18, 1800, 0.6, 'bandpass', 0, 300); break;
      case 'summon2': [392, 494, 587].forEach((f, i) => this.tone('square', f, f, 0.1, 0.06, i * 0.05)); break;
      case 'bash': this.tone('sine', 160, 50, 0.3, 0.5); this.noise(0.25, 0.4, 1200, 0.8); break;
      case 'volley': this.noise(0.4, 0.2, 2600, 1.5); break;
      case 'rift': this.tone('sine', 880, 220, 0.8, 0.12); this.tone('sine', 440, 110, 0.9, 0.1, 0.05); break;
      case 'herodie': [330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.95, 0.3, 0.12, i * 0.12)); break;
      case 'levelup': [523, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.12, 0.06, i * 0.07)); break;
      case 'rune': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.09, i * 0.06)); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.12, i * 0.13)); break;
      case 'defeat': [392, 349, 311, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.45, 0.08, i * 0.2)); break;
    }
  },

  // ── 배경음: 느린 화음 패드 + 펜타토닉 아르페지오 ──
  startMusic() {
    if (this.musicTimer) return;
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]];
    const scale = [440, 523.3, 587.3, 659.3, 784, 880, 1046.5];
    const tick = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const step = this.musicStep++;
      const bar = Math.floor(step / 8) % chords.length;
      const battle = this.musicMood === 'battle';
      if (step % 8 === 0) {
        for (const f of chords[bar]) this.pad(f, 3.4, battle ? 0.05 : 0.045);
        this.pad(chords[bar][0] / 2, 3.4, 0.06);
      }
      const pattern = battle ? [0, 2, 4, 2, 5, 4, 2, 1] : [0, -1, 2, -1, 4, -1, 2, -1];
      const n = pattern[step % 8];
      if (n >= 0 && Math.random() < (battle ? 0.95 : 0.7)) {
        const f = scale[(n + bar) % scale.length];
        this.tone('triangle', f, f, 0.35, battle ? 0.05 : 0.035, 0, this.musicBus);
      }
      if (battle && step % 4 === 0) {
        const c = this.ctx, t = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.3);
      }
    };
    this.musicTimer = setInterval(tick, 430);
  },

  pad(f, dur, vol) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'sawtooth';
    o.frequency.value = f; o2.frequency.value = f * 1.006;
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
};
