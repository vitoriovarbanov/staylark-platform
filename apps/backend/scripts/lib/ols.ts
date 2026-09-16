// Ordinary-least-squares helpers shared by the synthetic and real-data trainers,
// so the fitting math is provably identical in both. Pure, no I/O.

export interface Row {
    features: number[];
    target: number;
}

export function solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
        let pivot = i;
        for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[pivot][i])) pivot = k;
        [M[i], M[pivot]] = [M[pivot], M[i]];
        const div = M[i][i];
        if (div === 0) throw new Error('Singular matrix in OLS solve');
        for (let j = i; j <= n; j++) M[i][j] /= div;
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            const f = M[k][i];
            for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
        }
    }
    return M.map(row => row[n]);
}

/**
 * Fit coefficients by OLS. `ridge` adds L2 regularization to the normal equations
 * (not on the intercept), which stabilises the solve when features are collinear or
 * n is small — the real-data case. `ridge = 0` (default) is plain OLS, byte-identical
 * to the original synthetic trainer, so the committed synthetic model is unchanged.
 */
export function olsFit(rows: Row[], ridge = 0): number[] {
    const p = rows[0].features.length;
    const xtx = Array.from({ length: p }, () => Array(p).fill(0));
    const xty = Array(p).fill(0);
    for (const r of rows) {
        for (let i = 0; i < p; i++) {
            for (let j = 0; j < p; j++) xtx[i][j] += r.features[i] * r.features[j];
            xty[i] += r.features[i] * r.target;
        }
    }
    for (let i = 1; i < p; i++) xtx[i][i] += ridge;
    return solveLinearSystem(xtx, xty);
}

export const predict = (features: number[], coeffs: number[]): number =>
    features.reduce((s, x, i) => s + x * coeffs[i], 0);

/** Coefficient of determination on `rows`. Returns NaN when the targets have no
 *  variance (ssTot = 0), e.g. a tiny or degenerate held-out set — callers warn. */
export function rSquared(rows: Row[], coeffs: number[]): number {
    const meanY = rows.reduce((s, r) => s + r.target, 0) / rows.length;
    let ssRes = 0;
    let ssTot = 0;
    for (const r of rows) {
        const pred = predict(r.features, coeffs);
        ssRes += (r.target - pred) ** 2;
        ssTot += (r.target - meanY) ** 2;
    }
    return ssTot === 0 ? NaN : 1 - ssRes / ssTot;
}
