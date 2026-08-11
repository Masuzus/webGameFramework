import './styles/tokens.css';
import './styles/app.css';
import { createStyleScene } from './rendering/style-scene';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#gameCanvas');
const pauseButton = requireElement<HTMLButtonElement>('#pauseButton');
const resetButton = requireElement<HTMLButtonElement>('#resetButton');
const statusValue = requireElement<HTMLElement>('#statusValue');
const rewardValue = requireElement<HTMLElement>('#rewardValue');
const scene = createStyleScene(canvas);

let paused = false;

function renderPauseState(): void {
  pauseButton.innerHTML = paused ? '&#x25B6;' : '&#x23F8;';
  pauseButton.setAttribute('aria-label', paused ? '继续动画' : '暂停动画');
  pauseButton.title = paused ? '继续动画' : '暂停动画';
  statusValue.textContent = paused ? '已暂停' : '运行中';
}

pauseButton.addEventListener('click', () => {
  paused = !paused;
  scene.setPaused(paused);
  renderPauseState();
});

resetButton.addEventListener('click', () => {
  scene.reset();
  rewardValue.textContent = String(180 + Math.floor(Math.random() * 240));
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !paused) {
    paused = true;
    scene.setPaused(true);
    renderPauseState();
  }
});

window.addEventListener('resize', scene.resize);
window.visualViewport?.addEventListener('resize', scene.resize);

scene.start();
renderPauseState();

if (/^https?:$/.test(window.location.protocol) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => undefined));
}

