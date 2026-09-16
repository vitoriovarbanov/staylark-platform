/**
 * Data-volume gate for real-data pricing retraining. Below these thresholds a
 * real fit overfits noise and is worse than the synthetic prior, so the real
 * trainer refuses to run. See
 * docs/plans/2026-07-07-pricing-real-data-training-foundation-design.md §2.
 */
export const GATE = { minBookings: 500, minProperties: 5, minMonths: 3 } as const;

export interface GateCounts {
    bookings: number;
    properties: number;
    monthsSpanned: number;
}

export interface GateResult {
    met: boolean;
    reasons: string[];
}

export const evaluateGate = (c: GateCounts): GateResult => {
    const reasons: string[] = [];
    if (c.bookings < GATE.minBookings) reasons.push(`bookings ${c.bookings}/${GATE.minBookings}`);
    if (c.properties < GATE.minProperties) reasons.push(`properties ${c.properties}/${GATE.minProperties}`);
    if (c.monthsSpanned < GATE.minMonths) reasons.push(`months ${c.monthsSpanned}/${GATE.minMonths}`);
    return { met: reasons.length === 0, reasons };
};
