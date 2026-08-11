export interface FixedStepResult {
  accumulatorMs: number;
  steps: number;
}

export function advanceFixedStep(
  accumulatorMs: number,
  elapsedMs: number,
  stepMs: number,
  maximumSteps: number,
  update: (stepMs: number) => void
): FixedStepResult {
  let nextAccumulator = accumulatorMs + Math.max(0, elapsedMs);
  let steps = 0;

  while (nextAccumulator + Number.EPSILON >= stepMs && steps < maximumSteps) {
    nextAccumulator -= stepMs;
    update(stepMs);
    steps++;
  }

  return { accumulatorMs: Math.max(0, nextAccumulator), steps };
}

