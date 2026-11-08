'use strict';
// ─────────────────────────────────────────────────────────────
//  엔티티: 경로, 적, 타워, 병사, 영웅, 투사체
//  (DOM/캔버스에 의존하지 않음 → Node 시뮬레이터에서도 그대로 동작)
// ─────────────────────────────────────────────────────────────
const _pt = { x: 0, y: 0, dx: 1, dy: 0 };

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

// ── 경로: 축 정렬 웨이포인트 → 모서리를 둥글게 깎은 폴리라인 ──────
class Path {
  constructor(tilePts, smooth = true) {
    const raw = tilePts.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
    this.raw = raw;
    const pts = smooth ? Path.round(raw, TILE * 0.55) : raw;
    this.pts = pts;
    this.segs = [];
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.001) continue;
      this.segs.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len, len, start: acc });
      acc += len;
    }
    this.length = acc;
  }

  static round(pts, r) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p = pts[i], p1 = pts[i + 1];
      const l0 = Math.hypot(p.x - p0.x, p.y - p0.y), l1 = Math.hypot(p1.x - p.x, p1.y - p.y);
      const rr = Math.min(r, l0 / 2, l1 / 2);
      const ux = (p.x - p0.x) / l0, uy = (p.y - p0.y) / l0;
      const vx = (p1.x - p.x) / l1, vy = (p1.y - p.y) / l1;
      if (Math.abs(ux * vy - uy * vx) < 1e-6) { out.push(p); continue; } // 직선 연속
      const ax = p.x - ux * rr, ay = p.y - uy * rr, bx = p.x + vx * rr, by = p.y + vy * rr;
      const N = 8;
      for (let k = 0; k <= N; k++) {
        const t = k / N, it = 1 - t;
        out.push({ x: it * it * ax + 2 * it * t * p.x + t * t * bx, y: it * it * ay + 2 * it * t * p.y + t * t * by });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  at(d, out = { x: 0, y: 0, dx: 1, dy: 0 }) {
    const segs = this.segs;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].start <= d) lo = mid; else hi = mid - 1;
    }
    const s = segs[lo];
    const t = lo === segs.length - 1 ? Math.min(d - s.start, s.len) : d - s.start;
    out.x = s.ax + s.dx * t;
    out.y = s.ay + s.dy * t;
    out.dx = s.dx;
    out.dy = s.dy;
    return out;
  }

  nearest(x, y) {
    let best = null, bd = Infinity;
    for (const s of this.segs) {
      let t = (x - s.ax) * s.dx + (y - s.ay) * s.dy;
      t = clamp(t, 0, s.len);
      const px = s.ax + s.dx * t, py = s.ay + s.dy * t;
      const d = dist2(x, y, px, py);
      if (d < bd) { bd = d; best = { x: px, y: py, d: Math.sqrt(d), along: s.start + t }; }
    }
    return best;
  }
}

// ── 적 ───────────────────────────────────────────────────────
let _eid = 0;
class Enemy {
  constructor(game, type, pathIdx, hpMul, startDist = 0) {
    const def = ENEMIES[type];
    this.id = ++_eid;
    this.game = game;
    this.type = type;
    this.def = def;
    this.flying = !!def.flying;
    this.boss = !!def.boss;
    this.ethereal = !!def.ethereal;
    this.pathIdx = pathIdx;
    this.path = this.flying ? game.airPaths[pathIdx] : game.paths[pathIdx];
    this.dist = Math.max(-TILE, startDist);
    this.hpMul = hpMul;
    this.maxHp = def.hp * hpMul;
    this.hp = this.maxHp;
    this.maxShield = (def.shield || 0) * hpMul;
    this.shield = this.maxShield;
    this.armor = def.armor || 0;
    this.mres = def.mres || 0;
    this.speed = def.speed * TILE;
    this.size = def.size;
    this.atkMul = 0.5 + 0.5 * hpMul;
    this.offset = this.boss ? 0 : rand(-9, 9);
    this.x = 0; this.y = 0; this.dx = 1; this.dy = 0;
    this.slowAmt = 0; this.slowT = 0;
    this.burnDps = 0; this.burnT = 0; this.burnSrc = null;
    this.stunT = 0; this.freezeT = 0;
    this.shred = 0; this.shredT = 0;
    this.blockers = [];
    this.claims = 0;
    this.atkT = 0.4;
    this.alive = true;
    this.done = false;
    this.hitFlash = 0;
    this.swing = 0;
    this.t = rand(0, 10);
    this.walk = rand(0, 20);
    const abil = def.heal || def.stomp || def.summon || def.hex;
    this.burrowed = false;
    this.burrowT = def.burrow ? def.burrow.every * rand(0.4, 1) : 0;
    this.cdA = abil ? abil.cd * rand(0.4, 1) : 0;
    this.broodMark = 1;
    this.warded = false;
    this.place();
  }

  remaining() { return this.path.length - this.dist; }

  place() {
    this.path.at(this.dist, _pt);
    this.dx = _pt.dx; this.dy = _pt.dy;
    let off = this.offset;
    if (this.flying) off = this.offset * 1.6 + Math.sin(this.t * 1.7 + this.id) * 7;
    this.x = _pt.x - _pt.dy * off;
    this.y = _pt.y + _pt.dx * off;
  }

  predict(t) {
    if (this.blockers.length || this.stunT > 0 || this.freezeT > 0) return { x: this.x, y: this.y };
    const sf = Math.max(0.15, 1 - this.slowAmt * (this.boss ? 0.6 : 1));
    const d = Math.min(this.path.length, this.dist + this.speed * sf * t);
    this.path.at(d, _pt);
    return { x: _pt.x - _pt.dy * this.offset, y: _pt.y + _pt.dx * this.offset };
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.takeDamage(this.burnDps * dt, 'magic', this.burnSrc, true);
      if (!this.alive) return;
      if (this.burnT <= 0) this.burnDps = 0;
    }
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowAmt = 0; }
    if (this.shredT > 0) { this.shredT -= dt; if (this.shredT <= 0) this.shred = 0; }
    if (this.stunT > 0) this.stunT -= dt;
    if (this.freezeT > 0) this.freezeT -= dt;

    if (this.def.regen && this.burnT <= 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.def.regen * dt);
      if (Math.random() < dt * 3) g.fxSpark(this.x, this.y - this.size, '#7dff9a', 1, 25, 0.5, 2);
    }
    if (this.def.burrow) {
      const b = this.def.burrow;
      this.burrowT -= dt;
      if (this.burrowT <= 0) {
        this.burrowed = !this.burrowed;
        this.burrowT = this.burrowed ? b.dur : b.every;
        if (this.burrowed) {
          const bs = this.blockers.slice();
          this.blockers.length = 0;
          for (const k of bs) k.release();
        }
        g.fxSpark(this.x, this.y + 4, '#8a6a44', 8, 60, 0.45, 2.5);
      }
    }
    this.abilities(dt);
    if (!this.alive) return;

    if (this.blockers.length) {
      this.blockers = this.blockers.filter((b) => b.alive && b.target === this && b.blocking);
    }
    if (this.stunT > 0 || this.freezeT > 0) { this.place(); return; }

    if (this.blockers.length && !this.flying) {
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.atkT = this.def.atkCd || 1;
        this.swing = 0.22;
        // 공격으로 병사가 죽으면 blockers 배열이 바뀌므로 복사본으로 순회
        const targets = this.blockers.slice(0, this.def.cleave || 1);
        for (const b of targets) b.takeDamage((this.def.atk || 4) * this.atkMul, this);
      }
    } else {
      const sf = Math.max(0.15, 1 - this.slowAmt * (this.boss ? 0.6 : 1)) * (this.burrowed ? this.def.burrow.speedMul : 1);
      const v = this.speed * sf * dt;
      this.dist += v;
      this.walk += v;
      if (this.dist >= this.path.length) { g.enemyReached(this); return; }
    }
    this.place();
  }

  abilities(dt) {
    const d = this.def, g = this.game;
    if (d.heal) {
      this.cdA -= dt;
      if (this.cdA <= 0) {
        this.cdA = d.heal.cd;
        const r = d.heal.radius * TILE;
        let any = false;
        for (const o of g.enemies) {
          if (!o.alive || o.hp >= o.maxHp) continue;
          if (dist2(o.x, o.y, this.x, this.y) > r * r) continue;
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * d.heal.pct);
          any = true;
          g.fxSpark(o.x, o.y - 8, '#7dff9a', 3, 35, 0.6, 2);
        }
        if (any) { g.fxRing(this.x, this.y, 6, r, 0.55, '#7dff9a', 2); g.sfx('heal'); }
      }
    }
    if (d.stomp && this.blockers.length) {
      this.cdA -= dt;
      if (this.cdA <= 0) {
        this.cdA = d.stomp.cd;
        const r = d.stomp.radius * TILE;
        const targets = g.units.concat(g.hero && g.hero.alive ? [g.hero] : []);
        for (const u of targets) {
          if (!u.alive || dist2(u.x, u.y, this.x, this.y) > r * r) continue;
          u.takeDamage(d.stomp.dmg * this.atkMul, this);
          if (u.alive) u.stunT = Math.max(u.stunT || 0, d.stomp.stun);
        }
        g.fxRing(this.x, this.y + 6, 10, r, 0.6, '#d9b27a', 4);
        g.fxSpark(this.x, this.y + 8, '#a58a63', 14, 120, 0.6, 3);
        g.shake(5);
        g.sfx('stomp');
      }
    }
    if (d.brood) {
      while (this.hp / this.maxHp <= this.broodMark - d.brood.step && this.broodMark - d.brood.step > 0.05) {
        this.broodMark -= d.brood.step;
        for (let i = 0; i < d.brood.count; i++) {
          const b = g.spawnEnemy(d.brood.type, this.pathIdx, this.hpMul * 0.6, this.dist - 10 - i * 14);
          b.offset = rand(-14, 14);
        }
        g.fxRing(this.x, this.y - 14, 8, 60, 0.5, '#b26bff', 3);
        g.sfx('screech');
      }
    }
    if (d.summon) {
      this.cdA -= dt;
      if (this.cdA <= 0) {
        this.cdA = d.summon.cd;
        const gp = this.flying ? 0 : this.pathIdx;
        for (let i = 0; i < d.summon.count; i++) {
          g.spawnEnemy(d.summon.type, gp, Math.max(1, this.hpMul * 0.8), this.dist - 22 - i * 16);
        }
        g.fxRing(this.x, this.y, 8, 70, 0.6, '#b26bff', 3);
        g.sfx('summon');
      }
    }
    if (d.hex) {
      this.cdA -= dt;
      if (this.cdA <= 0) {
        let best = null, bd = (d.hex.range * TILE) ** 2;
        for (const t of g.towers) {
          if (t.disabledT > 0 || t.type === 'shrine') continue;
          const dd = dist2(t.x, t.y, this.x, this.y);
          if (dd < bd) { bd = dd; best = t; }
        }
        if (best) {
          this.cdA = d.hex.cd;
          best.disabledT = d.hex.dur;
          best.beamTarget = null;
          g.fxBolt([{ x: this.x, y: this.y - 10 }, { x: best.x, y: best.y - 20 }], '#b26bff');
          g.fxRing(best.x, best.y - 8, 6, 26, 0.5, '#b26bff', 3);
          g.sfx('hex');
        } else this.cdA = 0.5;
      }
    }
    if (d.ward && !this.warded && this.hp / this.maxHp <= d.ward.at) {
      this.warded = true;
      this.maxShield = this.maxHp * d.ward.pct;
      this.shield = this.maxShield;
      g.fxRing(this.x, this.y, 10, 90, 0.8, '#d48bff', 4);
      g.emit('toast', { text: '어둠의 군주가 거대한 보호막을 펼쳤습니다!', kind: 'warn' });
      g.sfx('ward');
    }
  }

  takeDamage(amount, type, src, isDot) {
    if (!this.alive || amount <= 0) return 0;
    const g = this.game, m = g.mods;
    let d = amount;
    if (type === 'phys') {
      const pen = src && src.e ? (src.e.armorPen || 0) : 0;
      d *= 1 - clamp(this.armor * (1 - pen) - this.shred, 0, 0.9);
    } else if (type === 'magic') {
      d *= 1 - clamp(this.mres, 0, 0.9);
    }
    let mult = 1;
    if (this.freezeT > 0) mult += 0.5;
    if (this.slowT > 0 || this.freezeT > 0) mult += g.res.slowVuln + m.frostfire;
    d *= mult;
    const total = d;
    if (this.shield > 0) {
      const s = Math.min(this.shield, d);
      this.shield -= s;
      d -= s;
    }
    this.hp -= d;
    if (src) src.dmgDealt = (src.dmgDealt || 0) + total;
    if (!isDot) this.hitFlash = 0.08;
    if (m.execute && !this.boss && this.hp > 0 && this.hp <= this.maxHp * m.execute) {
      this.hp = 0;
      g.fxText(this.x, this.y - 20, '처형', '#ff6b6b', 13);
    }
    if (this.hp <= 0) this.die(src);
    return total;
  }

  applySlow(amt, dur) {
    if (amt <= 0) return;
    if (amt > this.slowAmt + 1e-6 || this.slowT <= 0) { this.slowAmt = amt; this.slowT = dur; }
    else this.slowT = Math.max(this.slowT, dur);
  }
  applyBurn(dps, dur, src) {
    if (dps >= this.burnDps || this.burnT <= 0) { this.burnDps = dps; this.burnSrc = src; }
    this.burnT = Math.max(this.burnT, dur);
  }
  applyStun(dur) { this.stunT = Math.max(this.stunT, this.boss ? dur * 0.3 : dur); }
  applyFreeze(dur) {
    if (this.boss) { this.applySlow(0.6, dur); return; }
    this.freezeT = Math.max(this.freezeT, dur);
  }
  applyShred(amt, dur) { this.shred = Math.max(this.shred, amt); this.shredT = Math.max(this.shredT, dur); }

  die(src) {
    if (!this.alive) return;
    this.alive = false;
    const bs = this.blockers.slice();
    this.blockers.length = 0;
    for (const b of bs) b.release();
    this.game.onEnemyKilled(this, src);
  }
}

// ── 병사 (병영 병사 / 증원군 민병) ───────────────────────────────
class Soldier {
  constructor(game, o) {
    this.game = game;
    this.owner = o.owner || null;
    this.style = o.style || 'basic';
    this.x = o.x; this.y = o.y;
    this.rx = o.rx; this.ry = o.ry;
    this.maxHp = o.hp; this.hp = o.hp;
    this.dmg = o.dmg; this.cd = o.cd || 1;
    this.armor = o.armor || 0;
    this.regen = o.regen || 0;
    this.lifesteal = o.lifesteal || 0;
    this.engage = (o.engage || 1.25) * TILE;
    this.speed = (o.speed || 1.9) * TILE;
    this.ttl = o.ttl || 0;
    this.maxTtl = this.ttl;
    this.side = o.side || 1;
    this.target = null;
    this.blocking = false;
    this.alive = true;
    this.atkT = rand(0, 0.4);
    this.stunT = 0;
    this.swing = 0;
    this.face = 1;
    this.walk = 0;
    this.hitFlash = 0;
    this.spawnT = 0.3;
  }

  moveToward(tx, ty, dt) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return;
    const step = Math.min(d, this.speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.walk += step;
    if (Math.abs(dx) > 0.5) this.face = dx > 0 ? 1 : -1;
  }

  acquire() {
    const g = this.game;
    const r2 = this.engage * this.engage;
    let best = null, bestScore = Infinity;
    for (const e of g.enemies) {
      if (!e.alive || e.flying || e.ethereal || e.burrowed) continue;
      if (dist2(e.x, e.y, this.rx, this.ry) > r2) continue;
      const score = Math.min(e.claims, 3) * 100000 + e.remaining();
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) { this.target = best; this.blocking = false; best.claims++; }
  }

  release() {
    const e = this.target;
    if (e) {
      e.claims = Math.max(0, e.claims - 1);
      const i = e.blockers.indexOf(this);
      if (i >= 0) e.blockers.splice(i, 1);
    }
    this.target = null;
    this.blocking = false;
  }

  fight(dt, dmg, dmgType, src) {
    const e = this.target;
    const slot = this.side * (e.size + 7);
    const gx = e.x + slot, gy = e.y + (this.side > 0 ? 2 : -2);
    if (!this.blocking && dist2(this.x, this.y, e.x, e.y) <= (e.size + 16) ** 2) {
      this.blocking = true;
      e.blockers.push(this);
    }
    if (dist2(this.x, this.y, gx, gy) > 4) this.moveToward(gx, gy, dt);
    if (this.blocking) {
      this.face = e.x >= this.x ? 1 : -1;
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.atkT = this.cd;
        this.swing = 0.2;
        const dealt = this.game.dealDamage(e, dmg, dmgType, src, { canCrit: false });
        if (this.lifesteal) this.hp = Math.min(this.maxHp, this.hp + dealt * this.lifesteal);
        this.game.sfx('hit');
      }
    }
  }

  update(dt) {
    if (!this.alive) return;
    if (this.spawnT > 0) this.spawnT -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.ttl) {
      this.ttl -= dt;
      if (this.ttl <= 0) { this.die(true); return; }
    }
    if (this.stunT > 0) { this.stunT -= dt; return; }
    if (this.target && !this.target.alive) this.release();
    if (this.target && !this.blocking &&
        dist2(this.target.x, this.target.y, this.rx, this.ry) > (this.engage * 1.7) ** 2) this.release();
    if (!this.target) this.acquire();

    if (this.target) {
      this.fight(dt, this.dmg, 'phys', this.owner || this);
      if (this.regen) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    } else {
      if (dist2(this.x, this.y, this.rx, this.ry) > 4) this.moveToward(this.rx, this.ry, dt);
      this.hp = Math.min(this.maxHp, this.hp + (this.maxHp * 0.06 + this.regen) * dt);
    }
  }

  takeDamage(d) {
    if (!this.alive) return;
    this.hp -= d * (1 - this.armor);
    this.hitFlash = 0.1;
    if (this.hp <= 0) this.die(false);
  }

  die(expired) {
    if (!this.alive) return;
    this.alive = false;
    this.release();
    if (this.owner) this.owner.onSoldierDeath(this);
    if (!expired) this.game.fxSpark(this.x, this.y, '#d0d6e8', 8, 70, 0.5, 2);
    else this.game.fxSpark(this.x, this.y, '#9be37b', 6, 40, 0.5, 2);
  }
}

// ── 영웅 ─────────────────────────────────────────────────────
class Hero {
  constructor(game, id, x, y, hx, hy) {
    this.game = game;
    this.id = id;
    this.def = HEROES[id];
    this.isHero = true;
    this.level = 1;
    this.xp = 0;
    this.x = x; this.y = y;
    this.hx = hx; this.hy = hy;
    this.spawnX = x; this.spawnY = y;
    this.alive = true;
    this.respawnT = 0;
    this.moveTo = null;
    this.target = null;
    this.blocking = false;
    this.atkT = 0;
    this.rangedT = 0;
    this.stunT = 0;
    this.swing = 0;
    this.face = 1;
    this.walk = 0;
    this.hitFlash = 0;
    this.skillT = 0;
    this.kills = 0;
    this.dmgDealt = 0;
    this.side = -1;
    this.claimed = null;
    this.recalc();
    this.hp = this.maxHp;
  }

  recalc() {
    const d = this.def, m = this.game.mods, lv = this.level - 1;
    const ratio = this.maxHp ? this.hp / this.maxHp : 1;
    this.maxHp = d.hp * (1 + 0.1 * lv) * (1 + m.heroHp);
    this.dmg = d.dmg * (1 + 0.1 * lv) * (1 + m.heroDmg);
    this.armor = d.armor;
    this.cd = d.cd;
    this.range = d.range * TILE;
    this.engage = d.engage * TILE;
    this.speed = d.speed * TILE;
    if (this.hp != null) this.hp = this.maxHp * ratio;
  }

  get xpNeed() { return Math.round(50 * Math.pow(this.level, 1.45)); }
  get respawnTime() { return 14 * this.game.mods.heroRespawn; }

  gainXp(v) {
    if (this.level >= 10) return;
    this.xp += v;
    let up = false;
    while (this.level < 10 && this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      up = true;
    }
    if (up) {
      this.recalc();
      if (this.alive) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.35);
        this.game.fxText(this.x, this.y - 30, `LEVEL ${this.level}`, '#ffe08a', 13);
        this.game.fxRing(this.x, this.y, 6, 34, 0.6, '#ffe08a', 2);
      }
      this.game.sfx('levelup');
    }
  }

  command(x, y) {
    if (!this.alive) return;
    this.release();
    this.moveTo = { x: clamp(x, 10, WORLD_W - 10), y: clamp(y, 10, WORLD_H - 10) };
  }

  moveToward(tx, ty, dt) { Soldier.prototype.moveToward.call(this, tx, ty, dt); }
  release() { Soldier.prototype.release.call(this); }

  acquireBlock() {
    const g = this.game;
    const r2 = this.engage * this.engage;
    let best = null, bestScore = Infinity;
    for (const e of g.enemies) {
      if (!e.alive || e.flying || e.ethereal || e.burrowed) continue;
      if (dist2(e.x, e.y, this.hx, this.hy) > r2) continue;
      const score = Math.min(e.claims, 3) * 100000 + e.remaining();
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) { this.target = best; this.blocking = false; best.claims++; }
  }

  update(dt) {
    const g = this.game;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.skillT > 0) this.skillT -= dt;
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.revive();
      return;
    }
    if (this.stunT > 0) { this.stunT -= dt; return; }
    const lvMul = 1 + 0.1 * (this.level - 1);

    if (this.moveTo) {
      const mt = this.moveTo;
      if (dist2(this.x, this.y, mt.x, mt.y) < 9) {
        this.hx = mt.x; this.hy = mt.y;
        this.moveTo = null;
      } else {
        this.moveToward(mt.x, mt.y, dt);
        this.hp = Math.min(this.maxHp, this.hp + this.def.regen * lvMul * dt);
        return;
      }
    }

    this.hp = Math.min(this.maxHp, this.hp + this.def.regen * lvMul * (this.blocking ? 0.35 : 1) * dt);
    if (this.def.aura) {
      const r2 = (this.def.aura.radius * TILE) ** 2;
      for (const u of g.units) if (u.alive && dist2(u.x, u.y, this.x, this.y) <= r2) u.hp = Math.min(u.maxHp, u.hp + this.def.aura.heal * lvMul * dt);
    }
    if (this.target && !this.target.alive) this.release();
    if (this.target && !this.blocking &&
        dist2(this.target.x, this.target.y, this.hx, this.hy) > (this.engage * 1.8) ** 2) this.release();
    if (!this.target) this.acquireBlock();

    if (this.target) {
      Soldier.prototype.fight.call(this, dt, this.dmg, this.def.dmgType, this);
    } else if (dist2(this.x, this.y, this.hx, this.hy) > 9) {
      this.moveToward(this.hx, this.hy, dt);
    }

    // 원거리 영웅은 막는 중이 아닐 때 사격
    if (this.range > 0 && !this.blocking) {
      this.rangedT -= dt;
      if (this.rangedT <= 0) {
        const e = this.findRanged();
        if (e) {
          this.rangedT = this.cd;
          this.face = e.x >= this.x ? 1 : -1;
          this.swing = 0.2;
          const orb = this.def.dmgType === 'magic';
          g.projectiles.push(new Projectile(g, {
            slow: this.def.rootSlow || 0, slowDur: 1.2,
            x: this.x + this.face * 6, y: this.y - 14, target: e, kind: this.def.rootSlow ? 'thorn' : orb ? 'orb' : 'heroArrow',
            speed: orb ? 360 : 640, dmg: this.dmg, dmgType: this.def.dmgType, splash: this.def.splash || 0,
            src: this, air: true, arc: orb ? 14 : 8,
          }));
          g.sfx(orb ? 'orb' : 'arrow');
        } else this.rangedT = 0.1;
      }
    }
  }

  findRanged() {
    const g = this.game;
    let best = null, bv = Infinity;
    const r = this.range;
    for (const e of g.enemies) {
      if (!e.alive || e.burrowed) continue;
      const rr = r + e.size * 0.5;
      if (dist2(e.x, e.y, this.x, this.y) > rr * rr) continue;
      const v = e.remaining();
      if (v < bv) { bv = v; best = e; }
    }
    return best;
  }

  takeDamage(d) {
    if (!this.alive) return;
    this.hp -= d * (1 - this.armor);
    this.hitFlash = 0.1;
    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    this.release();
    this.moveTo = null;
    this.respawnT = this.respawnTime;
    this.game.fxSpark(this.x, this.y, this.def.color, 18, 110, 0.8, 3);
    this.game.emit('toast', { text: `${this.def.name}이(가) 쓰러졌습니다. ${Math.round(this.respawnT)}초 후 부활합니다.`, kind: 'warn' });
    this.game.sfx('herodie');
  }

  revive() {
    this.alive = true;
    this.hp = this.maxHp;
    this.x = this.spawnX; this.y = this.spawnY;
    this.hx = this.spawnX; this.hy = this.spawnY;
    this.stunT = 0;
    this.game.fxRing(this.x, this.y, 4, 40, 0.7, this.def.color, 3);
  }
}

// ── 투사체: 출발점→목표점 보간 + 포물선 (유도형/고정형) ───────────
class Projectile {
  constructor(game, o) {
    Object.assign(this, o);
    this.game = game;
    this.sx = o.x; this.sy = o.y;
    this.p = 0;
    this.alive = true;
    this.prevX = o.x; this.prevY = o.y;
    if (o.fixed) {
      this.homing = false;
      this.tx = o.px; this.ty = o.py;
      this.dur = o.dur;
    } else {
      this.homing = true;
      this.tx = o.target.x; this.ty = o.target.y;
      this.dur = Math.max(0.06, dist(this.sx, this.sy, this.tx, this.ty) / this.speed);
    }
  }

  update(dt) {
    if (this.homing && this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; }
    this.p += dt / this.dur;
    const ip = Math.min(1, this.p);
    this.prevX = this.x; this.prevY = this.y;
    this.gx = lerp(this.sx, this.tx, ip);
    this.gy = lerp(this.sy, this.ty, ip);
    this.x = this.gx;
    this.y = this.gy - (this.arc || 0) * 4 * ip * (1 - ip);
    if (this.p >= 1) {
      this.alive = false;
      this.game.projectileHit(this);
    }
  }
}

// ── 타워 ─────────────────────────────────────────────────────
const FORMATION = [[-11, -7], [11, -7], [0, 9], [0, -20]];

class Tower {
  constructor(game, type, c, r) {
    this.game = game;
    this.type = type;
    this.def = TOWERS[type];
    this.c = c; this.r = r;
    this.x = c * TILE + TILE / 2;
    this.y = r * TILE + TILE / 2;
    this.level = 0;
    this.branch = null;
    this.invested = 0;
    this.refund = 0; // 다음 웨이브 시작 전까지 전액 환불되는 금액
    this.disabledT = 0;
    this.cdT = 0.3;
    this.angle = 0.6;
    this.mode = 'first';
    this.kills = 0;
    this.dmgDealt = 0;
    this.flash = 0;
    this.buildT = 0.4;
    this.beamTarget = null;
    this.beamT = 0;
    this.beamMult = 1;
    this.flameOn = false;
    this.soldiers = [];
    this.respawns = [];
    this.rally = null;
    this.buff = { dmg: 0, rate: 0, range: 0, src: null };
    this.e = {};
  }

  get name() { return this.branch != null ? this.def.branches[this.branch].name : this.def.name; }
  get isAttacker() { return this.type !== 'shrine' && this.type !== 'barracks'; }

  inRange(e) {
    const r = this.e.range * TILE + e.size * 0.5;
    return dist2(this.x, this.y, e.x, e.y) <= r * r;
  }

  score(e) {
    switch (this.mode) {
      case 'last': return -e.remaining();
      case 'strong': return -(e.hp + e.shield);
      case 'close': return dist2(this.x, this.y, e.x, e.y);
      default: return e.remaining();
    }
  }

  findTarget(exclude) {
    let best = null, bv = Infinity;
    const air = !!this.e.air;
    for (const e of this.game.enemies) {
      if (!e.alive || e.burrowed || (e.flying && !air)) continue;
      if (exclude && exclude.has(e)) continue;
      if (!this.inRange(e)) continue;
      const v = this.score(e);
      if (v < bv) { bv = v; best = e; }
    }
    return best;
  }

  aim(e) { this.angle = Math.atan2(e.y - (this.y - 24), e.x - this.x); }

  update(dt) {
    if (this.buildT > 0) this.buildT -= dt;
    if (this.flash > 0) this.flash -= dt;
    const k = this.e.kind;
    if (this.disabledT > 0) {
      this.disabledT -= dt;
      this.flameOn = false;
      if (k === 'barracks') this.updateBarracks(dt);
      return;
    }
    if (k === 'support') return;
    if (k === 'barracks') { this.updateBarracks(dt); return; }
    if (k === 'beam') { this.updateBeam(dt); return; }
    if (k === 'flame') { this.updateFlame(dt); return; }
    if (k === 'aura') { this.updateAura(dt); return; }

    this.cdT -= dt;
    if (this.cdT > 0) {
      if (this.target && this.target.alive && this.inRange(this.target)) this.aim(this.target);
      return;
    }
    const t = this.findTarget();
    this.target = t;
    if (!t) { this.cdT = 0.05; return; }
    this.aim(t);
    this.cdT = this.e.cd;
    this.flash = 0.12;
    this.fire(t);
  }

  rollCrit(dmg) {
    const c = this.e.crit || 0;
    if (c > 0 && Math.random() < c) return [dmg * (this.e.critMul || 2), true];
    return [dmg, false];
  }

  fire(t) {
    const g = this.game, e = this.e;
    const top = { x: this.x, y: this.y - 26 };
    switch (e.kind) {
      case 'arrow': {
        const targets = [t];
        if (e.multishot > 1) {
          const ex = new Set(targets);
          while (targets.length < e.multishot) {
            const n = this.findTarget(ex);
            if (!n) break;
            targets.push(n); ex.add(n);
          }
        }
        for (const tg of targets) {
          const [dmg, crit] = this.rollCrit(e.dmg);
          g.projectiles.push(new Projectile(g, {
            x: top.x, y: top.y - 6, target: tg, kind: e.armorPen ? 'bolt' : 'arrow', speed: e.armorPen ? 1100 : 720,
            dmg, crit, dmgType: e.dmgType, src: this, arc: e.armorPen ? 2 : 8, air: true,
          }));
        }
        g.sfx(e.armorPen ? 'snipe' : 'arrow');
        break;
      }
      case 'cannon': {
        const [dmg, crit] = this.rollCrit(e.dmg);
        g.projectiles.push(new Projectile(g, {
          x: top.x + Math.cos(this.angle) * 14, y: top.y + 8 + Math.sin(this.angle) * 10, target: t, kind: 'ball', speed: 380,
          dmg, crit, dmgType: e.dmgType, splash: e.splash, src: this, arc: 26, air: false,
          shred: g.res.shredOnHit,
        }));
        g.sfx('cannon');
        break;
      }
      case 'mortar': {
        const dur = 1.15;
        const p = t.predict(dur);
        const [dmg, crit] = this.rollCrit(e.dmg);
        g.projectiles.push(new Projectile(g, {
          x: top.x, y: top.y - 8, target: t, fixed: true, px: p.x, py: p.y, dur, kind: 'shell',
          dmg, crit, dmgType: e.dmgType, splash: e.splash, src: this, arc: 150, air: false,
          shred: g.res.shredOnHit, fireGround: e.fireGround,
        }));
        g.sfx('mortar');
        break;
      }
      case 'frost': {
        const [dmg, crit] = this.rollCrit(e.dmg);
        g.projectiles.push(new Projectile(g, {
          x: top.x, y: top.y - 6, target: t, kind: 'shard', speed: 520,
          dmg, crit, dmgType: e.dmgType, splash: e.splash || 0, src: this, arc: 6, air: true,
          slow: e.slow, slowDur: e.slowDur, freezeChance: e.freezeChance || 0, freezeDur: e.freezeDur || 0,
        }));
        g.sfx('frost');
        break;
      }
      case 'chain': this.fireChain(t); break;
    }
  }

  fireChain(first) {
    const g = this.game, e = this.e;
    let cur = first;
    let [dmg, crit] = this.rollCrit(e.dmg);
    const hit = new Set();
    const pts = [{ x: this.x, y: this.y - 34 }];
    for (let i = 0; i <= e.chain && cur; i++) {
      hit.add(cur);
      pts.push({ x: cur.x, y: cur.y - 4 });
      g.dealDamage(cur, dmg, 'magic', this, { stun: e.stun || 0, canCrit: false, crit });
      crit = false;
      dmg *= e.chainFalloff;
      let nb = null, nd = (e.chainRange * TILE) ** 2;
      for (const o of g.enemies) {
        if (!o.alive || o.burrowed || hit.has(o) || (o.flying && !e.air)) continue;
        const d2 = dist2(cur.x, cur.y, o.x, o.y);
        if (d2 < nd) { nd = d2; nb = o; }
      }
      cur = nb;
    }
    g.fxBolt(pts, this.branch === 0 ? '#8fd3ff' : '#c48bff');
    g.sfx('zap');
  }

  updateBeam(dt) {
    const g = this.game, e = this.e;
    let t = this.beamTarget;
    if (!t || !t.alive || t.burrowed || !this.inRange(t)) {
      const nt = this.findTarget();
      if (nt !== t) this.beamT = 0;
      t = this.beamTarget = nt;
    }
    if (!t) { this.beamMult = 1; return; }
    this.aim(t);
    this.beamT += dt;
    this.beamMult = Math.min(e.rampMax, 1 + this.beamT * e.ramp);
    g.dealDamage(t, e.dmg * this.beamMult * dt, 'magic', this, { canCrit: false, dot: true });
    if (Math.random() < dt * 20) g.fxSpark(t.x, t.y - 4, '#e7c4ff', 1, 60, 0.3, 2);
    if (!t.alive) { this.beamTarget = null; }
  }

  updateFlame(dt) {
    const g = this.game, e = this.e;
    this.cdT -= dt;
    const t = this.findTarget();
    this.flameOn = !!t;
    if (!t) return;
    this.aim(t);
    if (this.cdT > 0) return;
    this.cdT = e.cd;
    const r = e.range * TILE;
    const ox = this.x, oy = this.y - 18;
    const ang = Math.atan2(t.y - oy, t.x - ox);
    for (const o of g.enemies) {
      if (!o.alive || o.flying || o.burrowed) continue;
      const dx = o.x - ox, dy = o.y - oy;
      const d2 = dx * dx + dy * dy;
      const rr = r + o.size * 0.5;
      if (d2 > rr * rr) continue;
      if (Math.abs(angleDiff(Math.atan2(dy, dx), ang)) > e.cone && d2 > 400) continue;
      g.dealDamage(o, e.dmg, 'magic', this, { canCrit: false, burn: e.burn });
    }
    if (!g.headless) {
      for (let i = 0; i < 3; i++) {
        const a = ang + rand(-e.cone, e.cone) * 0.8;
        const sp = rand(r * 1.6, r * 2.4);
        g.fx.push({ type: 'flame', x: ox + Math.cos(ang) * 12, y: oy + Math.sin(ang) * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.42, max: 0.42, size: rand(5, 8) });
      }
    }
    if (Math.random() < 0.25) g.sfx('flame');
  }

  updateAura(dt) {
    const g = this.game, e = this.e;
    this.cdT -= dt;
    if (this.cdT > 0) return;
    this.cdT = e.cd;
    let any = false;
    const r = e.range * TILE;
    for (const o of g.enemies) {
      if (!o.alive || o.burrowed) continue;
      if (dist2(o.x, o.y, this.x, this.y) > (r + o.size * 0.5) ** 2) continue;
      g.dealDamage(o, e.dmg, 'magic', this, { slow: e.slow, slowDur: e.slowDur, canCrit: false });
      any = true;
      if (!g.headless && Math.random() < 0.5) g.fxSpark(o.x, o.y - 6, '#dff6ff', 2, 30, 0.5, 2);
    }
    if (any) { this.flash = 0.3; g.fxRing(this.x, this.y - 6, 10, r, 0.5, '#bfeaff', 2); }
  }

  // ── 병영 ──
  updateBarracks(dt) {
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      this.respawns[i] -= dt;
      if (this.respawns[i] <= 0) { this.respawns.splice(i, 1); this.spawnSoldier(); }
    }
    while (this.soldiers.length + this.respawns.length < this.e.soldiers) this.spawnSoldier();
    while (this.soldiers.length > this.e.soldiers) { const s = this.soldiers.pop(); s.alive = false; s.release(); }
  }

  slotPos(i) {
    const f = FORMATION[i % FORMATION.length];
    return { x: this.rally.x + f[0], y: this.rally.y + f[1] };
  }

  spawnSoldier() {
    const g = this.game, e = this.e;
    const used = new Set(this.soldiers.map((s) => s.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const p = this.slotPos(slot);
    const s = new Soldier(g, {
      owner: this, x: this.x, y: this.y + 10, rx: p.x, ry: p.y,
      hp: e.sHp, dmg: e.sDmg, cd: e.sCd, armor: e.sArmor, regen: e.regen || 0, lifesteal: e.lifesteal || 0,
      engage: 1.3, style: this.branch == null ? 'basic' : this.branch === 0 ? 'paladin' : 'berserker',
      side: slot % 2 === 0 ? -1 : 1,
    });
    s.slot = slot;
    this.soldiers.push(s);
    g.units.push(s);
  }

  onSoldierDeath(s) {
    const i = this.soldiers.indexOf(s);
    if (i >= 0) this.soldiers.splice(i, 1);
    this.respawns.push(this.e.respawn);
  }

  refreshSoldiers(heal) {
    const e = this.e;
    for (const s of this.soldiers) {
      const ratio = s.hp / s.maxHp;
      s.maxHp = e.sHp;
      s.hp = heal ? s.maxHp : s.maxHp * ratio;
      s.dmg = e.sDmg; s.cd = e.sCd; s.armor = e.sArmor;
      s.regen = e.regen || 0; s.lifesteal = e.lifesteal || 0;
      s.style = this.branch == null ? 'basic' : this.branch === 0 ? 'paladin' : 'berserker';
    }
  }

  setRally(x, y) {
    this.rally = { x, y };
    for (const s of this.soldiers) {
      const p = this.slotPos(s.slot);
      s.rx = p.x; s.ry = p.y;
      s.release();
    }
  }

  removeSoldiers() {
    for (const s of this.soldiers) { s.alive = false; s.release(); }
    this.soldiers.length = 0;
    this.respawns.length = 0;
  }
}
