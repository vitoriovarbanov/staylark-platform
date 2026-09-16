/**
 * Race a promise against a timeout. Clears the loser's timer in `finally` so a settled race
 * can't leave a `setTimeout` that fires an orphaned rejection later (a flaky-test / noise source).
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
    });
    try {
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(timer);
    }
}
