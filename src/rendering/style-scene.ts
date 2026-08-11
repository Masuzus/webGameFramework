import { advanceFixedStep } from '../runtime/fixed-step';

interface Point {
  x: number;
  y: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Palette {
  world: string;
  grid: string;
  primary: string;
  secondary: string;
  magic: string;
  reward: string;
  danger: string;
  ink: string;
}

const COLUMNS = 14;
const ROWS = 24;
const STEP_MS = 1000 / 60;
const MAX_STEPS = 5;

function cssColor(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function readPalette(): Palette {
  return {
    world: cssColor('--color-world', '#0d0d1a'),
    grid: cssColor('--color-grid', 'rgba(255,255,255,.035)'),
    primary: cssColor('--color-primary', '#00ffcc'),
    secondary: cssColor('--color-secondary', '#00aaff'),
    magic: cssColor('--color-magic', '#ff00cc'),
    reward: cssColor('--color-reward', '#ffd34d'),
    danger: cssColor('--color-danger', '#ff405d'),
    ink: cssColor('--color-ink', '#081114')
  };
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');
  return context;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createStyleScene(canvas: HTMLCanvasElement) {
  const context = requireContext(canvas);
  const palette = readPalette();
  const initialCore = { x: 7, y: 13 };
  const core = { ...initialCore };
  const target = { ...initialCore };
  const beacons: Array<Point & { color: string }> = [
    { x: 3, y: 5, color: palette.reward },
    { x: 10, y: 7, color: palette.magic },
    { x: 4, y: 19, color: palette.secondary }
  ];
  const hazards: Point[] = [{ x: 2, y: 10 }, { x: 11, y: 14 }, { x: 9, y: 20 }];
  const particles: Particle[] = [];

  let width = 0;
  let height = 0;
  let cell = 0;
  let offsetX = 0;
  let offsetY = 0;
  let elapsed = 0;
  let accumulator = 0;
  let previousTime = performance.now();
  let paused = false;
  let running = false;

  function resize(): void {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    width = bounds.width;
    height = bounds.height;
    cell = Math.min(width / COLUMNS, height / ROWS);
    offsetX = (width - COLUMNS * cell) / 2;
    offsetY = (height - ROWS * cell) / 2;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function emit(origin: Point, color: string, count = 10): void {
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count;
      const speed = 12 + (index % 3) * 5;
      particles.push({
        x: (origin.x + 0.5) * cell,
        y: (origin.y + 0.5) * cell,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
  }

  function update(stepMs: number): void {
    elapsed += stepMs;
    const follow = Math.min(1, stepMs / 150);
    core.x += (target.x - core.x) * follow;
    core.y += (target.y - core.y) * follow;

    if (Math.floor(elapsed / 1300) !== Math.floor((elapsed - stepMs) / 1300)) {
      const beacon = beacons[Math.floor(elapsed / 1300) % beacons.length];
      emit(beacon, beacon.color, 8);
    }

    for (const particle of particles) {
      particle.x += particle.vx * stepMs / 1000;
      particle.y += particle.vy * stepMs / 1000;
      particle.life -= stepMs / 720;
    }
    while (particles[0] && particles[0].life <= 0) particles.shift();
  }

  function drawGrid(): void {
    context.fillStyle = palette.world;
    context.fillRect(0, 0, width, height);
    context.save();
    context.translate(offsetX, offsetY);
    context.strokeStyle = palette.grid;
    context.lineWidth = 1;

    for (let column = 0; column <= COLUMNS; column++) {
      context.beginPath();
      context.moveTo(column * cell, 0);
      context.lineTo(column * cell, ROWS * cell);
      context.stroke();
    }
    for (let row = 0; row <= ROWS; row++) {
      context.beginPath();
      context.moveTo(0, row * cell);
      context.lineTo(COLUMNS * cell, row * cell);
      context.stroke();
    }
    context.restore();
  }

  function drawBeacons(): void {
    context.save();
    context.translate(offsetX, offsetY);
    beacons.forEach((beacon, index) => {
      const x = (beacon.x + 0.5) * cell;
      const y = (beacon.y + 0.5) * cell;
      const pulse = 1 + Math.sin(elapsed / 280 + index) * 0.12;
      context.fillStyle = beacon.color;
      context.shadowColor = beacon.color;
      context.shadowBlur = 15;
      context.beginPath();
      context.arc(x, y, cell * 0.16 * pulse, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#fff8cf';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, cell * 0.3 * pulse, 0, Math.PI * 2);
      context.stroke();
    });
    context.restore();
  }

  function drawHazards(): void {
    context.save();
    context.translate(offsetX, offsetY);
    for (const hazard of hazards) {
      const inset = cell * 0.13;
      const x = hazard.x * cell + inset;
      const y = hazard.y * cell + inset;
      const size = cell - inset * 2;
      context.fillStyle = '#361325';
      context.shadowColor = palette.danger;
      context.shadowBlur = 8;
      context.beginPath();
      context.roundRect(x, y, size, size, Math.min(5, cell * 0.16));
      context.fill();
      context.strokeStyle = palette.danger;
      context.lineWidth = Math.max(1.5, cell * 0.05);
      context.beginPath();
      context.moveTo(x + size * 0.28, y + size * 0.28);
      context.lineTo(x + size * 0.72, y + size * 0.72);
      context.moveTo(x + size * 0.72, y + size * 0.28);
      context.lineTo(x + size * 0.28, y + size * 0.72);
      context.stroke();
    }
    context.restore();
  }

  function drawCore(): void {
    const centerX = offsetX + (core.x + 0.5) * cell;
    const centerY = offsetY + (core.y + 0.5) * cell;
    const pulse = 1 + Math.sin(elapsed / 360) * 0.06;

    context.save();
    context.strokeStyle = 'rgba(0,170,255,.25)';
    context.lineWidth = 1;
    for (let index = 0; index < 3; index++) {
      const angle = elapsed / 1300 + index * Math.PI * 2 / 3;
      const orbit = cell * 1.15;
      const droneX = centerX + Math.cos(angle) * orbit;
      const droneY = centerY + Math.sin(angle) * orbit;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(droneX, droneY);
      context.stroke();
      context.fillStyle = index === 2 ? palette.magic : palette.primary;
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 8;
      context.fillRect(droneX - cell * 0.1, droneY - cell * 0.1, cell * 0.2, cell * 0.2);
    }
    context.restore();

    context.save();
    context.translate(centerX, centerY);
    context.rotate(Math.PI / 4 + elapsed / 6000);
    context.scale(pulse, pulse);
    context.fillStyle = palette.primary;
    context.shadowColor = palette.primary;
    context.shadowBlur = 18;
    const size = cell * 0.68;
    context.beginPath();
    context.roundRect(-size / 2, -size / 2, size, size, Math.min(6, cell * 0.15));
    context.fill();
    context.fillStyle = palette.ink;
    const inner = size * 0.34;
    context.fillRect(-inner / 2, -inner / 2, inner, inner);
    context.restore();
  }

  function drawParticles(): void {
    context.save();
    context.translate(offsetX, offsetY);
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, particle.life);
      context.fillStyle = particle.color;
      const size = Math.max(1, cell * 0.08 * particle.life);
      context.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
    }
    context.restore();
  }

  function render(): void {
    drawGrid();
    drawBeacons();
    drawHazards();
    drawCore();
    drawParticles();
  }

  function frame(now: number): void {
    if (!running) return;
    const frameTime = Math.min(100, Math.max(0, now - previousTime));
    previousTime = now;
    if (!paused) {
      const result = advanceFixedStep(accumulator, frameTime, STEP_MS, MAX_STEPS, update);
      accumulator = result.accumulatorMs;
    }
    render();
    requestAnimationFrame(frame);
  }

  function handlePointer(event: PointerEvent): void {
    const bounds = canvas.getBoundingClientRect();
    target.x = clamp((event.clientX - bounds.left - offsetX) / cell - 0.5, 1, COLUMNS - 2);
    target.y = clamp((event.clientY - bounds.top - offsetY) / cell - 0.5, 1, ROWS - 2);
    emit(core, palette.primary, 12);
  }

  canvas.addEventListener('pointerdown', handlePointer);

  return {
    resize,
    reset(): void {
      core.x = initialCore.x;
      core.y = initialCore.y;
      target.x = initialCore.x;
      target.y = initialCore.y;
      elapsed = 0;
      accumulator = 0;
      particles.length = 0;
      emit(core, palette.primary, 12);
    },
    setPaused(value: boolean): void {
      paused = value;
      previousTime = performance.now();
    },
    start(): void {
      if (running) return;
      running = true;
      resize();
      emit(core, palette.primary, 12);
      previousTime = performance.now();
      requestAnimationFrame(frame);
    }
  };
}

