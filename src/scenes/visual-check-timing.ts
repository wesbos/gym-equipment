/** Test-harness waits must fail even when a hidden tab stops delivering frames. */
export async function boundedWait<T>(promise: Promise<T>, deadline: number, stage: string, timeoutMs = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error(`${stage}: timed out (tab may be hidden)`)), Math.max(0, Math.min(timeoutMs, deadline - performance.now())));
    })]);
  } finally { clearTimeout(timer); }
}
export async function boundedFrame(deadline: number, stage: string) {
  let frame = 0;
  try {
    await boundedWait(new Promise<number>(resolve => { frame = requestAnimationFrame(resolve); }), deadline, `${stage} / animation frame`);
  } finally { cancelAnimationFrame(frame); }
}
