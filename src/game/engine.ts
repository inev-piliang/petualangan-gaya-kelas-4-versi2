import type { SceneId, Theme } from "./levels";
import { MENU_THEME, CAVE_THEME } from "./levels";

export type Phase = "idle" | "dashing" | "interact" | "cleared" | "fail" | "treasure";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  kind: 0 | 1 | 2; // 0 circle, 1 rect(confetti), 2 spark
  rot: number;
  vr: number;
}

interface Floater {
  x: number;
  y: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

const CONFETTI = ["#ffd23e", "#ff6b35", "#3ddc84", "#4fc3f7", "#ff5d9e", "#fff6e0"];
const TAU = Math.PI * 2;

const SCENE_ART: Record<SceneId | "menu", string> = {
    menu: `${import.meta.env.BASE_URL}images/menu-adventure.jpg`,
  rock: `${import.meta.env.BASE_URL}images/level-1-rock.jpg`,
  bridge: `${import.meta.env.BASE_URL}images/level-2-bridge.jpg`,
  gate: `${import.meta.env.BASE_URL}images/level-3-magnet.jpg`,
  spring: `${import.meta.env.BASE_URL}images/level-4-spring.jpg`,
  tree: `${import.meta.env.BASE_URL}images/level-5-gravity.jpg`,
  ball: `${import.meta.env.BASE_URL}images/level-6-ball.jpg`,
  clay: `${import.meta.env.BASE_URL}images/level-7-clay.jpg`,
  door: `${import.meta.env.BASE_URL}images/level-8-door.jpg`,
  cave: `${import.meta.env.BASE_URL}images/final-treasure.jpg`,
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export class Engine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private last = performance.now();
  private t = 0;

  private theme: Theme = MENU_THEME;
  scene: SceneId | "menu" = "menu";
  phase: Phase = "idle";
  private phaseT = 0;
  private charFrac = 0.24;
  private dashFrom = 0.24;
  private dashTo = 0.52;
  private arcK = 0; // 0..1 for spring jump
  private scroll = 0;
  private hitDone = false;
  private treasureFired = false;

  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private shake = 0;
  private flash = 0;
  private flashRGB = "255,214,90";
  private art = new Map<SceneId | "menu", HTMLImageElement>();

  onPhase: ((p: Phase) => void) | null = null;

  private bottomInset = 0;
  /** Height (px) of the DOM question panel at the bottom; keeps the scene above it. */
  setBottomInset(px: number) {
    this.bottomInset = Math.max(0, px);
  }

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv;
    this.ctx = cv.getContext("2d")!;
    Object.entries(SCENE_ART).forEach(([scene, src]) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      this.art.set(scene as SceneId | "menu", image);
    });
    this.onResize = this.onResize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
  }

  private onResize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
  }

  // ---------- public API ----------

  setLevel(scene: SceneId, theme: Theme) {
    this.scene = scene;
    this.theme = theme;
    this.phase = "idle";
    this.phaseT = 0;
    this.charFrac = 0.24;
    this.dashFrom = 0.24;
    this.bottomInset = 0;
    this.hitDone = false;
    this.arcK = 0;
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.flash = 0;
  }

  toMenu() {
    this.scene = "menu";
    this.theme = MENU_THEME;
    this.phase = "idle";
    this.phaseT = 0;
    this.charFrac = 0.24;
    this.bottomInset = 0;
    this.arcK = 0;
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.flash = 0;
  }

  toCave() {
    this.scene = "cave";
    this.theme = CAVE_THEME;
    this.phase = "treasure";
    this.phaseT = 0;
    this.charFrac = 0.3;
    this.bottomInset = 0;
    this.arcK = 0;
    this.hitDone = false;
    this.treasureFired = false;
    this.shake = 0;
    this.flash = 0;
  }

  answerCorrect() {
    if (this.phase !== "idle") return;
    this.phase = "dashing";
    this.phaseT = 0;
    this.hitDone = false;
    this.dashFrom = this.charFrac;
    this.dashTo = this.scene === "bridge" || this.scene === "spring" ? 0.8 : 0.5;
  }

  answerWrong() {
    if (this.phase !== "idle") return;
    this.phase = "fail";
    this.phaseT = 0;
    this.shake = 6;
    const [bx, by] = this.obstaclePoint();
    this.burst(bx, by, 14, "#ff5d5d", 0, 170);
  }

  /** Used after the Misi Belajar modal: stop the fail animation and be ready to retry. */
  forceIdle() {
    if (this.phase === "fail") {
      this.phase = "idle";
      this.phaseT = 0;
    }
  }

  addFloater(text: string, fx: number, fy: number, color: string, size = 24) {
    this.floaters.push({ x: fx * this.w, y: fy * this.h, life: 1.6, max: 1.6, text, color, size });
  }

  confetti(n: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rnd(i * 3 + 1) - 0.5) * 1.6;
      const sp = 320 + rnd(i * 5 + 2) * 380;
      this.particles.push({
        x: this.w / 2 + (rnd(i * 7 + 3) - 0.5) * this.w * 0.4,
        y: this.h * 0.9,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1.1 + rnd(i * 11 + 4) * 1,
        max: 2,
        size: 5 + rnd(i * 13 + 5) * 6,
        color: CONFETTI[i % CONFETTI.length],
        grav: 620,
        kind: 1,
        rot: rnd(i) * TAU,
        vr: (rnd(i * 17) - 0.5) * 14,
      });
    }
    this.trimParticles();
  }

  private burst(x: number, y: number, n: number, color: string, grav: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = rnd(i * 19 + this.t * 100) * TAU;
      const sp = speed * (0.4 + rnd(i * 23 + 1) * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.45 + rnd(i * 31 + 2) * 0.5,
        max: 1,
        size: 3 + rnd(i * 37 + 3) * 5,
        color,
        grav,
        kind: rnd(i * 41) > 0.7 ? 2 : 0,
        rot: 0,
        vr: 0,
      });
    }
    this.trimParticles();
  }

  private trimParticles() {
    if (this.particles.length > 320) this.particles.splice(0, this.particles.length - 320);
  }

  // ---------- internals ----------

  private get gY() {
    const base = this.h * 0.78;
    const capped = this.h - this.bottomInset - 30;
    return Math.max(this.h * 0.42, Math.min(base, capped));
  }
  private get s() {
    return Math.max(0.55, Math.min(1.35, Math.min(this.w / 820, this.h / 640)));
  }
  private obstaclePoint(): [number, number] {
    if (this.w / this.h < 0.82) return [this.w * 0.56, this.h * 0.34];
    if (this.scene === "cave") return [this.w * 0.48, this.h * 0.58];
    return [this.w * 0.38, this.h * 0.58];
  }
  private get exitP(): number {
    if (this.phase === "interact") return easeOutCubic(Math.min(this.phaseT / 0.8, 1));
    if (this.phase === "cleared" || this.phase === "treasure") return 1;
    return 0;
  }

  private loop(now: number) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    this.t += dt;
    this.phaseT += dt;
    const speed =
      this.scene === "menu"
        ? 0.55
        : this.phase === "dashing"
          ? 2.6
          : this.phase === "interact"
            ? 0.12
            : 0.3;
    this.scroll += dt * speed;
    this.shake = Math.max(0, this.shake - dt * 20);
    this.flash = Math.max(0, this.flash - dt * 1.6);

    const obsX = this.scene === "cave" ? this.w * 0.6 : this.w * 0.62;

    switch (this.phase) {
      case "dashing": {
        const k = Math.min(this.phaseT / 0.75, 1);
        this.charFrac = lerp(this.dashFrom, this.dashTo, easeOutCubic(k));
        this.arcK = this.scene === "spring" ? Math.sin(Math.PI * k) : 0;
        if (k >= 1) {
          this.phase = "interact";
          this.phaseT = 0;
        }
        break;
      }
      case "interact": {
        if (!this.hitDone && this.phaseT >= 0.3) {
          this.hitDone = true;
          this.shake = 9;
          this.flash = 0.4;
          const [bx, by] = this.obstaclePoint();
          this.burst(bx, by, 26, "#ffd23e", 320, 260);
          this.burst(bx, by, 12, "#3ddc84", 300, 200);
        }
        if (this.phaseT >= 0.8) {
          this.phase = "cleared";
          this.phaseT = 0;
          this.confetti(64);
          this.onPhase?.("cleared");
        }
        break;
      }
      case "fail": {
        if (this.phaseT >= 0.9) {
          this.phase = "idle";
          this.phaseT = 0;
          this.onPhase?.("idle");
        }
        break;
      }
      case "treasure": {
        if (!this.treasureFired && this.phaseT >= 0.55) {
          this.treasureFired = true;
          this.flash = 0.75;
          this.shake = 12;
          const [bx, by] = this.obstaclePoint();
          this.burst(bx, by - 20, 40, "#ffd23e", 240, 340);
          this.confetti(120);
          this.onPhase?.("treasure");
        }
        if (this.treasureFired && Math.random() < 0.35) {
          this.burst(obsX + (Math.random() - 0.5) * 120, this.gY - 40 - Math.random() * 80, 2, "#ffd23e", -140, 60);
        }
        break;
      }
      default:
        break;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 1) p.vx *= 1 - dt * 0.6;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= dt * 42;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  // ---------- drawing ----------

  private draw() {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sx = (Math.random() * 2 - 1) * this.shake;
    const sy = (Math.random() * 2 - 1) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    const hasIllustration = this.drawIllustratedBackground();
    if (!hasIllustration) {
      this.drawSky();
      this.drawHills();
      this.drawDecor();
      this.drawGround();
      this.drawObstacle();
      this.drawChar(this.charFrac * w, this.gY);
    }
    this.drawParticles();
    this.drawFloaters();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(${this.flashRGB},${(this.flash * 0.55).toFixed(3)})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }
    ctx.restore();
  }

  private drawIllustratedBackground(): boolean {
    const { ctx, w, h } = this;
    const image = this.art.get(this.scene);
    if (!image?.complete || image.naturalWidth === 0) return false;

    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const portrait = w / h < 0.82;

    if (portrait && this.scene !== "menu") {
      // A soft full-screen crop fills tall phones; the crisp artwork remains fully visible above the quiz.
      const cover = Math.max((w + 48) / iw, (h + 48) / ih);
      const cw = iw * cover;
      const ch = ih * cover;
      ctx.save();
      ctx.filter = "blur(14px) saturate(0.9)";
      ctx.globalAlpha = 0.72;
      ctx.drawImage(image, (w - cw) / 2, (h - ch) / 2, cw, ch);
      ctx.restore();
      ctx.fillStyle = "rgba(19,58,34,0.18)";
      ctx.fillRect(-24, -24, w + 48, h + 48);

      const fit = (w + 8) / iw;
      const fw = iw * fit;
      const fh = ih * fit;
      const y = Math.max(48, h * 0.085);
      ctx.drawImage(image, -4, y, fw, fh);
      const fade = ctx.createLinearGradient(0, y + fh * 0.7, 0, y + fh + 32);
      fade.addColorStop(0, "rgba(6,32,18,0)");
      fade.addColorStop(1, "rgba(6,32,18,0.82)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, y + fh * 0.68, w, fh * 0.35 + 36);
      return true;
    }

    const overscan = 18;
    const scale = Math.max((w + overscan * 2) / iw, (h + overscan * 2) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return true;
  }

  private drawSky() {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.theme.sky[0]);
    g.addColorStop(1, this.theme.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const night = !!this.theme.night || this.scene === "cave";
    if (night) {
      for (let i = 0; i < 40; i++) {
        const x = rnd(i * 3 + 1) * w;
        const y = rnd(i * 5 + 2) * h * 0.5;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 1.5 + i));
        ctx.fillStyle = `rgba(255,240,200,${a.toFixed(3)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    } else {
      // sun
      const sunX = w * 0.82;
      const sunY = h * 0.16;
      const rg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
      rg.addColorStop(0, "rgba(255,240,180,0.95)");
      rg.addColorStop(0.35, "rgba(255,220,120,0.5)");
      rg.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 90, 0, TAU);
      ctx.fill();
      // clouds
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 3; i++) {
        const cx = w - ((this.scroll * 26 + i * 320) % (w + 340)) + 170;
        const cy = h * (0.12 + i * 0.07);
        this.cloud(cx, cy, 26 + i * 6);
      }
    }
  }

  private cloud(x: number, y: number, r: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.arc(x + r * 0.9, y + r * 0.25, r * 0.75, 0, TAU);
    ctx.arc(x - r * 0.9, y + r * 0.3, r * 0.65, 0, TAU);
    ctx.fill();
  }

  private drawHills() {
    const { h } = this;
    if (this.scene === "cave") return;
    this.hillLayer(this.theme.hillFar, h * 0.55, h * 0.09, this.scroll * 0.16, 0.004, 0.011);
    this.hillLayer(this.theme.hillNear, h * 0.63, h * 0.06, this.scroll * 0.34, 0.006, 0.017);
  }

  private hillLayer(color: string, yBase: number, amp: number, off: number, f1: number, f2: number) {
    const { ctx, w, h } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 24; x += 24) {
      const y =
        yBase +
        Math.sin(x * f1 + off) * amp +
        Math.sin(x * f2 + off * 2.3) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  private drawDecor() {
    const { ctx, w } = this;
    if (this.scene === "cave") {
      // stalactites
      ctx.fillStyle = "#241743";
      for (let i = 0; i < 8; i++) {
        const x = (i / 8) * w + 30;
        const hh = 40 + rnd(i * 9) * 60;
        ctx.beginPath();
        ctx.moveTo(x - 22, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x, hh);
        ctx.closePath();
        ctx.fill();
      }
      // side rocks
      ctx.fillStyle = "#170d30";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(w * 0.22, this.h * 0.3, w * 0.12, this.gY);
      ctx.lineTo(0, this.gY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.quadraticCurveTo(w * 0.8, this.h * 0.3, w * 0.9, this.gY);
      ctx.lineTo(w, this.gY);
      ctx.closePath();
      ctx.fill();
      return;
    }
    // parallax trees / bushes
    for (let i = 0; i < 5; i++) {
      const x = w - ((i * 280 + this.scroll * 30) % (w + 300)) - 40;
      const sz = (0.6 + rnd(i * 7) * 0.7) * this.s;
      this.tree(x, this.gY + 4, sz, 0.85);
    }
  }

  private tree(x: number, groundY: number, s: number, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#6d4520";
    ctx.fillRect(x - 5 * s, groundY - 60 * s, 10 * s, 60 * s);
    ctx.fillStyle = "#2e9e5b";
    ctx.beginPath();
    ctx.arc(x, groundY - 78 * s, 30 * s, 0, TAU);
    ctx.arc(x - 24 * s, groundY - 60 * s, 22 * s, 0, TAU);
    ctx.arc(x + 24 * s, groundY - 60 * s, 22 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(x - 8 * s, groundY - 84 * s, 14 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawGround() {
    const { ctx, w, h } = this;
    const gY = this.gY;
    ctx.fillStyle = this.theme.ground;
    ctx.fillRect(0, gY, w, h - gY);
    ctx.fillStyle = this.theme.groundDark;
    ctx.fillRect(0, gY, w, 5);
    // path
    ctx.fillStyle = "rgba(255,244,214,0.22)";
    ctx.fillRect(0, gY + 6, w, 20 * this.s);
    // moving pebbles
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 12; i++) {
      const x = w - ((i * 110 + this.scroll * 130) % (w + 110));
      const y = gY + 10 + (i % 3) * 8 * this.s;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 * this.s, 3 * this.s, 0, 0, TAU);
      ctx.fill();
    }
  }

  // ---------- obstacles ----------

  private drawObstacle() {
    const p = this.exitP;
    switch (this.scene) {
      case "rock":
        this.drawRock(p);
        break;
      case "bridge":
        this.drawBridge(p);
        break;
      case "gate":
        this.drawGate(p);
        break;
      case "spring":
        this.drawSpring(p);
        break;
      case "tree":
        this.drawTree(p);
        break;
      case "ball":
        this.drawBall(p);
        break;
      case "clay":
        this.drawClay(p);
        break;
      case "door":
        this.drawDoor(p);
        break;
      case "cave":
        this.drawCave();
        break;
      default:
        break;
    }
  }

  private rr(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  private drawRock(p: number) {
    const { ctx } = this;
    const s = this.s;
    const cx = this.w * 0.62 + p * this.w * 0.34;
    const cy = this.gY - 48 * s;
    const r = 52 * s;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * 0.4);
    ctx.fillStyle = "#98a2b3";
    ctx.strokeStyle = "#59637a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rad = r * (0.72 + rnd(i * 3 + 7) * 0.38);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad * 0.85;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,50,70,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.35);
    ctx.lineTo(-r * 0.05, 0);
    ctx.lineTo(-r * 0.35, r * 0.3);
    ctx.moveTo(r * 0.25, -r * 0.4);
    ctx.lineTo(r * 0.15, -r * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  private drawBridge(p: number) {
    const { ctx, w } = this;
    const s = this.s;
    const bx = w * 0.62;
    const gap = Math.max(150, Math.min(300, w * 0.26));
    const gY = this.gY;
    // water
    ctx.fillStyle = "#12486b";
    ctx.fillRect(bx - gap / 2, gY, gap, this.h - gY);
    ctx.strokeStyle = "rgba(160,220,255,0.4)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = gY + 12 + i * 16 * s;
      ctx.beginPath();
      for (let x = bx - gap / 2 + 6; x < bx + gap / 2 - 6; x += 10) {
        const yy = y + Math.sin(x * 0.08 + this.t * 2 + i) * 2.5;
        if (x === bx - gap / 2 + 6) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // deck
    const deckY = gY - 10 * s;
    ctx.fillStyle = "#8a5a2e";
    this.rr(bx - gap / 2 - 14 * s, deckY, gap + 28 * s, 12 * s, 6);
    ctx.fill();
    ctx.strokeStyle = "#5f3c1a";
    ctx.lineWidth = 2;
    for (let i = 1; i < 7; i++) {
      const x = bx - gap / 2 - 14 * s + (i / 7) * (gap + 28 * s);
      ctx.beginPath();
      ctx.moveTo(x, deckY);
      ctx.lineTo(x, deckY + 12 * s);
      ctx.stroke();
    }
    // posts + rope
    ctx.fillStyle = "#6d4520";
    ctx.fillRect(bx - gap / 2 - 14 * s, deckY - 34 * s, 6 * s, 34 * s);
    ctx.fillRect(bx + gap / 2 + 8 * s, deckY - 34 * s, 6 * s, 34 * s);
    ctx.strokeStyle = "#c9a25e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - gap / 2 - 11 * s, deckY - 34 * s);
    ctx.quadraticCurveTo(bx, deckY - 48 * s, bx + gap / 2 + 11 * s, deckY - 34 * s);
    ctx.stroke();
    // ice sheen (fades when cleared)
    if (p < 1) {
      const a = 0.55 * (1 - p);
      ctx.fillStyle = `rgba(200,240,255,${a.toFixed(3)})`;
      this.rr(bx - gap / 2 - 14 * s, deckY, gap + 28 * s, 12 * s, 6);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const x0 = bx - gap / 4 + i * (gap / 4);
        ctx.beginPath();
        ctx.moveTo(x0, deckY + 2);
        ctx.lineTo(x0 + 14 * s, deckY + 10 * s);
        ctx.stroke();
      }
      const tw = Math.abs(Math.sin(this.t * 4));
      ctx.fillStyle = `rgba(255,255,255,${(tw * (1 - p)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bx - gap * 0.2, deckY + 4 * s, 3, 0, TAU);
      ctx.arc(bx + gap * 0.25, deckY + 6 * s, 2.5, 0, TAU);
      ctx.fill();
    }
  }

  private drawGate(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62;
    const gY = this.gY;
    const top = gY - 150 * s;
    // stone frame
    ctx.fillStyle = "#8b93a5";
    ctx.strokeStyle = "#5c6575";
    ctx.lineWidth = 3;
    this.rr(bx - 96 * s, top, 24 * s, 150 * s, 6);
    ctx.fill();
    ctx.stroke();
    this.rr(bx + 72 * s, top, 24 * s, 150 * s, 6);
    ctx.fill();
    ctx.stroke();
    this.rr(bx - 96 * s, top - 18 * s, 192 * s, 24 * s, 8);
    ctx.fill();
    ctx.stroke();
    // opening
    ctx.fillStyle = "rgba(20,26,40,0.85)";
    ctx.fillRect(bx - 72 * s, top + 10 * s, 144 * s, 140 * s);
    // iron gate (lifts up)
    const lift = p * 150 * s;
    ctx.fillStyle = "#39445a";
    for (let i = 0; i < 5; i++) {
      const x = bx - 60 * s + i * 28 * s;
      ctx.fillRect(x, top + 12 * s - lift, 9 * s, 136 * s);
    }
    ctx.fillRect(bx - 66 * s, top + 34 * s - lift, 132 * s, 8 * s);
    ctx.fillRect(bx - 66 * s, top + 84 * s - lift, 132 * s, 8 * s);
    // magnet on pole
    const mx = bx - 130 * s;
    ctx.fillStyle = "#5f3c1a";
    ctx.fillRect(mx - 4 * s, gY - 70 * s, 8 * s, 70 * s);
    ctx.save();
    ctx.translate(mx, gY - 84 * s);
    if (p > 0.25) {
      const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 46 * s);
      gl.addColorStop(0, "rgba(255,80,80,0.7)");
      gl.addColorStop(1, "rgba(255,80,80,0)");
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, 46 * s, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#e23c3c";
    ctx.fillRect(-16 * s, -18 * s, 10 * s, 22 * s);
    ctx.fillRect(6 * s, -18 * s, 10 * s, 22 * s);
    ctx.beginPath();
    ctx.arc(0, -18 * s, 16 * s, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = "#d8dde6";
    ctx.fillRect(-16 * s, 0, 10 * s, 6 * s);
    ctx.fillRect(6 * s, 0, 10 * s, 6 * s);
    ctx.restore();
  }

  private drawSpring(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62;
    const gY = this.gY;
    const sx = bx - 40 * s;
    // slingshot Y
    ctx.strokeStyle = "#8a5a2e";
    ctx.lineWidth = 11 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, gY);
    ctx.lineTo(sx, gY - 40 * s);
    ctx.moveTo(sx, gY - 40 * s);
    ctx.lineTo(sx - 26 * s, gY - 84 * s);
    ctx.moveTo(sx, gY - 40 * s);
    ctx.lineTo(sx + 26 * s, gY - 84 * s);
    ctx.stroke();
    // seat + band
    const seatY = gY - 52 * s;
    ctx.strokeStyle = "#d8dde6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 26 * s, gY - 84 * s);
    ctx.lineTo(sx, seatY);
    ctx.lineTo(sx + 26 * s, gY - 84 * s);
    ctx.stroke();
    ctx.fillStyle = "#4a3b2a";
    this.rr(sx - 14 * s, seatY - 6 * s, 28 * s, 12 * s, 5);
    ctx.fill();
    // coil spring (compresses)
    const coilW = 14 + 46 * (1 - p);
    const cx0 = sx + 40 * s;
    ctx.strokeStyle = "#c9d4e4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = cx0 + (i / 10) * coilW;
      const y = gY - 10 * s + (i % 2 === 0 ? -10 : 10) * s * 0.9;
      if (i === 0) ctx.moveTo(x, gY - 10 * s);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#5c6575";
    this.rr(cx0 + coilW, gY - 24 * s, 12 * s, 24 * s, 4);
    ctx.fill();
    // target flag far side
    const fx = bx + 120 * s;
    ctx.strokeStyle = "#8a5a2e";
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(fx, gY);
    ctx.lineTo(fx, gY - 90 * s);
    ctx.stroke();
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(fx, gY - 90 * s);
    ctx.lineTo(fx + 34 * s, gY - 80 * s);
    ctx.lineTo(fx, gY - 70 * s);
    ctx.closePath();
    ctx.fill();
    if (p > 0.4) {
      const tw = Math.abs(Math.sin(this.t * 5));
      ctx.fillStyle = `rgba(255,210,62,${tw.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx + 60 * s, gY - 60 * s, 4, 0, TAU);
      ctx.fill();
    }
  }

  private drawTree(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62;
    const gY = this.gY;
    // trunk
    ctx.fillStyle = "#7a4a24";
    ctx.fillRect(bx - 13 * s, gY - 115 * s, 26 * s, 115 * s);
    ctx.strokeStyle = "#5b3317";
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(bx - 4 * s, gY - 90 * s);
    ctx.quadraticCurveTo(bx - 30 * s, gY - 105 * s, bx - 44 * s, gY - 122 * s);
    ctx.stroke();
    // crown
    ctx.fillStyle = "#2e9e5b";
    ctx.beginPath();
    ctx.arc(bx, gY - 145 * s, 48 * s, 0, TAU);
    ctx.arc(bx - 38 * s, gY - 122 * s, 34 * s, 0, TAU);
    ctx.arc(bx + 38 * s, gY - 122 * s, 34 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(bx - 12 * s, gY - 158 * s, 20 * s, 0, TAU);
    ctx.fill();
    // static apples
    ctx.fillStyle = "#e23c3c";
    for (let i = 0; i < 4; i++) {
      const a = rnd(i * 13) * TAU;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(a) * 34 * s, gY - 135 * s + Math.sin(a) * 28 * s, 7 * s, 0, TAU);
      ctx.fill();
    }
    // falling apple
    const ay = lerp(gY - 160 * s, gY - 8 * s, p);
    ctx.save();
    ctx.translate(bx + 10 * s, ay);
    ctx.rotate(p * 0.8);
    ctx.fillStyle = "#e23c3c";
    ctx.beginPath();
    ctx.arc(0, 0, 10 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#3fae5c";
    ctx.beginPath();
    ctx.ellipse(4 * s, -10 * s, 6 * s, 3 * s, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    // hint sign pops when p>0.5
    if (p > 0.5) {
      const k = Math.min((p - 0.5) * 2.5, 1);
      ctx.save();
      ctx.translate(bx + 90 * s, gY);
      ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
      ctx.fillStyle = "#8a5a2e";
      ctx.fillRect(-4 * s, -40 * s, 8 * s, 40 * s);
      ctx.fillStyle = "#d9a44a";
      ctx.strokeStyle = "#8a5a2e";
      ctx.lineWidth = 3;
      this.rr(-34 * s, -72 * s, 68 * s, 34 * s, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5b3317";
      ctx.font = `bold ${22 * s}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, -54 * s);
      ctx.restore();
    }
  }

  private drawBall(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62 + p * this.w * 0.46;
    const r = 38 * s;
    const by = this.gY - r;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(bx, this.gY + 4, r * (1 - p * 0.3), 8 * s * (1 - p * 0.4), 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(p * 7);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#cfd9e2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#22303c";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.2, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
    // footprints
    if (p > 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.w * 0.62 - 60 * s, this.gY + 8, 7, 0.2, Math.PI - 0.2);
      ctx.arc(this.w * 0.62 - 34 * s, this.gY + 12, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  private drawClay(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62;
    const gY = this.gY;
    const squash = 1 + Math.sin(this.t * 3) * 0.045 * (1 - p);
    ctx.save();
    ctx.translate(bx, gY);
    ctx.scale(squash, 2 - squash);
    ctx.translate(-bx, -gY);
    ctx.globalAlpha = 1 - p * 0.55;
    ctx.fillStyle = "#c9704a";
    ctx.strokeStyle = "#9c4f2b";
    ctx.lineWidth = 4;
    this.rr(bx - 78 * s, gY - 128 * s, 156 * s, 128 * s, 22 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b5603c";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(bx - 48 * s + i * 26 * s, gY - 100 * s + rnd(i * 7) * 70 * s, 10 * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // doorway opens
    if (p > 0) {
      ctx.fillStyle = "rgba(30,14,8,0.9)";
      ctx.beginPath();
      const dw = 56 * s * p;
      ctx.moveTo(bx - dw / 2, gY);
      ctx.lineTo(bx - dw / 2, gY - 70 * s * p);
      ctx.arc(bx, gY - 70 * s * p, dw / 2, Math.PI, TAU);
      ctx.lineTo(bx + dw / 2, gY);
      ctx.closePath();
      ctx.fill();
    }
    // golden key appears
    if (p > 0.15) {
      const k = Math.min((p - 0.15) / 0.85, 1);
      const sc = 0.6 + easeOutCubic(k) * 0.6;
      ctx.save();
      ctx.translate(bx, gY - 64 * s);
      ctx.rotate(-0.5 + k * 0.5);
      ctx.scale(sc, sc);
      ctx.globalAlpha = k;
      ctx.fillStyle = "#ffd23e";
      ctx.strokeStyle = "#a06a00";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-16 * s, 0, 12 * s, 0, TAU);
      ctx.arc(-16 * s, 0, 5 * s, 0, TAU, true);
      ctx.fill();
      this.rr(-8 * s, -4 * s, 34 * s, 8 * s, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(14 * s, 4 * s, 6 * s, 10 * s);
      ctx.fillRect(24 * s, 4 * s, 6 * s, 14 * s);
      ctx.restore();
      const tw = Math.abs(Math.sin(this.t * 6));
      ctx.fillStyle = `rgba(255,230,140,${tw.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bx + 26 * s, gY - 88 * s, 3.5, 0, TAU);
      ctx.fill();
    }
  }

  private drawDoor(p: number) {
    const { ctx } = this;
    const s = this.s;
    const bx = this.w * 0.62;
    const gY = this.gY;
    const top = gY - 200 * s;
    const dwFull = 190 * s;
    // arch
    ctx.fillStyle = "#8b93a5";
    ctx.strokeStyle = "#5c6575";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - dwFull / 2 - 24 * s, gY);
    ctx.lineTo(bx - dwFull / 2 - 24 * s, top + 70 * s);
    ctx.arc(bx, top + 70 * s, dwFull / 2 + 24 * s, Math.PI, TAU);
    ctx.lineTo(bx + dwFull / 2 + 24 * s, gY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // dark interior
    ctx.fillStyle = "#140f1e";
    ctx.beginPath();
    ctx.moveTo(bx - dwFull / 2, gY);
    ctx.lineTo(bx - dwFull / 2, top + 78 * s);
    ctx.arc(bx, top + 78 * s, dwFull / 2, Math.PI, TAU);
    ctx.lineTo(bx + dwFull / 2, gY);
    ctx.closePath();
    ctx.fill();
    // golden light inside
    if (p > 0) {
      const a = p;
      const cx = bx;
      const cy = gY - 60 * s;
      const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150 * s * p + 20);
      rg.addColorStop(0, `rgba(255,214,90,${(0.85 * a).toFixed(3)})`);
      rg.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(bx - 160 * s, top - 40 * s, 320 * s, gY - top + 40 * s);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.t * 0.5);
      ctx.fillStyle = `rgba(255,230,150,${(0.3 * a).toFixed(3)})`;
      for (let i = 0; i < 8; i++) {
        ctx.rotate(TAU / 8);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(120 * s, -16 * s);
        ctx.lineTo(120 * s, 16 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // door (swings shut-to-open by narrowing)
    const dw = dwFull * (1 - p * 0.86);
    if (dw > 4) {
      ctx.fillStyle = "#8a5a2e";
      ctx.strokeStyle = "#5f3c1a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - dwFull / 2, gY);
      ctx.lineTo(bx - dwFull / 2, top + 78 * s);
      ctx.arc(bx - dwFull / 2 + dw / 2, top + 78 * s, dw / 2, Math.PI, TAU);
      ctx.lineTo(bx - dwFull / 2 + dw, gY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#4a2f12";
      for (let i = 1; i <= 3; i++) {
        const x = bx - dwFull / 2 + (i / 4) * dw;
        ctx.beginPath();
        ctx.moveTo(x, top + 60 * s);
        ctx.lineTo(x, gY);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffd23e";
      ctx.beginPath();
      ctx.arc(bx - dwFull / 2 + dw - 14 * s, gY - 78 * s, 6 * s, 0, TAU);
      ctx.fill();
    }
  }

  private drawCave() {
    const { ctx } = this;
    const s = this.s;
    const open = this.phase === "treasure" ? easeOutCubic(Math.min(this.phaseT / 1.3, 1)) : 1;
    const cx = this.w * 0.6;
    const gY = this.gY;
    // light rays
    if (open > 0.1) {
      const a = Math.min(1, (open - 0.1) * 1.4);
      const cy = gY - 52 * s;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.t * 0.4);
      ctx.fillStyle = `rgba(255,220,110,${(0.28 * a).toFixed(3)})`;
      for (let i = 0; i < 10; i++) {
        ctx.rotate(TAU / 10);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(260 * s, -22 * s);
        ctx.lineTo(260 * s, 22 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      const rg = ctx.createRadialGradient(cx, cy, 6, cx, cy, 240 * s);
      rg.addColorStop(0, `rgba(255,214,90,${(0.75 * a).toFixed(3)})`);
      rg.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(cx - 260 * s, cy - 260 * s, 520 * s, 520 * s);
    }
    // chest base
    ctx.fillStyle = "#8a5a2e";
    ctx.strokeStyle = "#4a2f12";
    ctx.lineWidth = 4;
    this.rr(cx - 48 * s, gY - 44 * s, 96 * s, 44 * s, 8);
    ctx.fill();
    ctx.stroke();
    // coins inside (appear as lid opens)
    if (open > 0.2) {
      ctx.fillStyle = "#ffd23e";
      for (let i = 0; i < 7; i++) {
        const x = cx - 34 * s + i * 11 * s;
        const y = gY - 44 * s - 2 - Math.abs(Math.sin(i * 2.1)) * 8 * s;
        ctx.beginPath();
        ctx.ellipse(x, y, 7 * s, 5 * s, 0, 0, TAU);
        ctx.fill();
      }
    }
    // lid
    ctx.save();
    ctx.translate(cx - 48 * s, gY - 44 * s);
    ctx.rotate(-open * 1.9);
    ctx.fillStyle = "#9c6836";
    ctx.strokeStyle = "#4a2f12";
    ctx.lineWidth = 4;
    this.rr(0, -20 * s, 96 * s, 22 * s, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd23e";
    this.rr(42 * s, -20 * s, 12 * s, 22 * s, 3);
    ctx.fill();
    ctx.restore();
    // gold band + lock
    ctx.fillStyle = "#ffd23e";
    this.rr(cx - 6 * s, gY - 44 * s, 12 * s, 44 * s, 3);
    ctx.fill();
    ctx.fillStyle = open > 0.5 ? "#ff6b35" : "#c9a25e";
    ctx.beginPath();
    ctx.arc(cx, gY - 22 * s, 7 * s, 0, TAU);
    ctx.fill();
    // sparkle gem
    const tw = Math.abs(Math.sin(this.t * 3));
    ctx.fillStyle = `rgba(255,255,255,${(0.5 + tw * 0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx - 18 * s, gY - 56 * s, 3 + tw * 2, 0, TAU);
    ctx.fill();
  }

  // ---------- character ----------

  private drawChar(x: number, feetY: number) {
    const { ctx } = this;
    const s = this.s;
    const moving = this.phase === "dashing" || this.scene === "menu";
    const wt = this.t * (moving ? 17 : 2.6);
    const bob = moving ? Math.abs(Math.sin(wt)) * -5 * s : Math.sin(this.t * 2.2) * -1.5 * s;
    const arcY = this.arcK > 0 ? -this.arcK * this.h * 0.17 : 0;
    const failed = this.phase === "fail";
    const celebrating = this.phase === "cleared";

    // shadow
    const shAlpha = 0.28 * Math.max(0.35, 1 + arcY / (this.h * 0.4));
    ctx.fillStyle = `rgba(0,0,0,${shAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, feetY + 5, 20 * s * (1 - Math.min(0.4, -arcY / (this.h * 1.5))), 6 * s, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(x, feetY + arcY);
    if (failed) ctx.rotate(-0.22);
    if (celebrating) ctx.translate(0, Math.abs(Math.sin(this.phaseT * 8)) * -8 * s);

    const swing = moving ? Math.sin(wt) * 7 * s : Math.sin(this.t * 2.2) * 1.5 * s;
    // legs
    ctx.strokeStyle = "#3b2f63";
    ctx.lineWidth = 7 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-3 * s, -20 * s);
    ctx.lineTo(-6 * s + swing, -2 * s);
    ctx.moveTo(3 * s, -20 * s);
    ctx.lineTo(6 * s - swing, -2 * s);
    ctx.stroke();
    // boots
    ctx.fillStyle = "#7a4a20";
    ctx.beginPath();
    ctx.ellipse(-6 * s + swing + 2 * s, -1 * s, 6 * s, 3.5 * s, 0, 0, TAU);
    ctx.ellipse(6 * s - swing + 2 * s, -1 * s, 6 * s, 3.5 * s, 0, 0, TAU);
    ctx.fill();
    // backpack
    ctx.fillStyle = "#b0763b";
    this.rr(-19 * s, -46 * s + bob, 9 * s, 21 * s, 4);
    ctx.fill();
    ctx.fillStyle = "#8a5a2e";
    this.rr(-17 * s, -40 * s + bob, 5 * s, 9 * s, 2);
    ctx.fill();
    // body
    ctx.fillStyle = "#ff6b35";
    this.rr(-10 * s, -46 * s + bob, 20 * s, 28 * s, 7);
    ctx.fill();
    ctx.strokeStyle = "#d14e20";
    ctx.lineWidth = 2;
    this.rr(-10 * s, -46 * s + bob, 20 * s, 28 * s, 7);
    ctx.stroke();
    // arms
    ctx.strokeStyle = "#ff6b35";
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    if (celebrating) {
      ctx.moveTo(-8 * s, -40 * s + bob);
      ctx.lineTo(-16 * s, -58 * s + bob);
      ctx.moveTo(8 * s, -40 * s + bob);
      ctx.lineTo(16 * s, -58 * s + bob);
    } else {
      const asw = moving ? Math.sin(wt + Math.PI) * 6 * s : 0;
      ctx.moveTo(-8 * s, -40 * s + bob);
      ctx.lineTo(-13 * s, -28 * s + bob + asw);
      ctx.moveTo(8 * s, -40 * s + bob);
      ctx.lineTo(13 * s, -28 * s + bob - asw);
    }
    ctx.stroke();
    // head
    const hy = -56 * s + bob;
    ctx.fillStyle = "#ffd7a8";
    ctx.beginPath();
    ctx.arc(0, hy, 11.5 * s, 0, TAU);
    ctx.fill();
    // hair
    ctx.fillStyle = "#5b3317";
    ctx.beginPath();
    ctx.arc(0, hy, 11.5 * s, Math.PI, TAU);
    ctx.fill();
    // cap
    ctx.fillStyle = "#e23c3c";
    ctx.beginPath();
    ctx.arc(0, hy - 2 * s, 10.5 * s, Math.PI * 1.05, TAU - 0.05);
    ctx.fill();
    this.rr(2 * s, hy - 4.5 * s, 12 * s, 4 * s, 2);
    ctx.fill();
    // face
    ctx.fillStyle = "#2b1a0e";
    ctx.beginPath();
    ctx.arc(5 * s, hy + 1.5 * s, 1.6 * s, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#2b1a0e";
    ctx.lineWidth = 1.6 * s;
    if (failed) {
      ctx.beginPath();
      ctx.arc(6 * s, hy + 8 * s, 3 * s, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(5.5 * s, hy + 5 * s, 3.4 * s, 0.2, Math.PI - 0.4);
      ctx.stroke();
    }
    // blush
    ctx.fillStyle = "rgba(255,120,120,0.5)";
    ctx.beginPath();
    ctx.ellipse(2 * s, hy + 5.5 * s, 2.4 * s, 1.6 * s, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------- fx ----------

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 1) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      } else if (p.kind === 2) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + this.t * 4);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.rotate(TAU / 4);
          ctx.moveTo(0, 0);
          ctx.lineTo(p.size * 0.35, p.size * 0.35);
          ctx.lineTo(0, p.size);
        }
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters() {
    const { ctx } = this;
    for (const f of this.floaters) {
      const a = Math.max(0, Math.min(1, f.life / (f.max * 0.6)));
      ctx.globalAlpha = a;
      ctx.font = `${f.size}px "Luckiest Guy", Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(20,10,0,0.75)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}
