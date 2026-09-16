import { test, expect, type Page, type Locator } from '@playwright/test';

// Write-path journeys — tagged @writes so production runs skip them (test:smoke:readonly uses
// --project=public). STAGING ONLY. Synthetic data is removed by clean-synthetic, which keys on
// the `smoke-` email prefix, so SMOKE_USER_EMAIL must start with `smoke-`.

/** The single open Mantine date dropdown. Both pickers exist in the DOM; only one is open. */
const openCalendar = (page: Page): Locator =>
    page.locator('[role="dialog"]:visible').filter({ has: page.locator('table') });

/**
 * Day cells carry a full-date aria-label ("10 August 2026") and are `disabled` +
 * `data-disabled="true"` when the property is already booked or before minDate.
 * Reading the grid rather than assuming a fixed offset is what makes this
 * non-flaky: the original version picked the 10th and 14th of next month and
 * broke whenever either was taken.
 */
async function enabledDaysInView(cal: Locator): Promise<string[]> {
    return cal
        .locator('table button:not([data-disabled="true"])')
        .evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')).filter((l): l is string => !!l));
}

/**
 * Advance the visible calendar one month. Returns false when the control is
 * disabled, which happens at the picker's maxDate — the check-out picker is
 * capped at check-in + 90 nights.
 *
 * Returning rather than clicking blindly matters: Playwright will retry a click
 * on a disabled button until the test times out, which surfaces as an opaque
 * 30s timeout instead of "ran out of months".
 */
async function nextMonth(cal: Locator): Promise<boolean> {
    const next = cal.locator('[data-direction="next"]').first();
    if (!(await next.isEnabled())) return false;
    await next.click();
    await cal.page().waitForTimeout(150);
    return true;
}

/** The month/year currently displayed, for error messages. */
const visibleMonth = (cal: Locator) => cal.locator('[class*="calendarHeaderLevel"]').first().innerText();

/**
 * Finds a run of `nights + 1` consecutive bookable days, scanning forward month by
 * month. Returns the aria-labels to click for check-in and check-out.
 *
 * A run is required rather than two arbitrary free days: `excludeDate` only
 * disables individual dates, so picking either side of a booked night would be
 * accepted by the picker and then rejected by the API as "Dates Unavailable".
 */
async function findBookableRun(cal: Locator, nights: number, maxMonths = 12): Promise<[string, string]> {
    for (let i = 0; i < maxMonths; i++) {
        const labels = await enabledDaysInView(cal);
        const dates = labels
            .map(l => ({ label: l, time: Date.parse(l) }))
            .filter(d => Number.isFinite(d.time))
            .sort((a, b) => a.time - b.time);

        const DAY = 86_400_000;
        for (let s = 0; s + nights < dates.length; s++) {
            const run = dates.slice(s, s + nights + 1);
            const consecutive = run.every((d, k) => k === 0 || d.time - run[k - 1].time === DAY);
            if (consecutive) return [run[0].label, run[run.length - 1].label];
        }
        if (!(await nextMonth(cal))) {
            throw new Error(
                `No run of ${nights + 1} consecutive bookable days, and the calendar ` +
                    `cannot advance past ${await visibleMonth(cal)} (maxDate reached).`
            );
        }
    }
    throw new Error(`No run of ${nights + 1} consecutive bookable days found within ${maxMonths} months`);
}

/** Clicks a day by aria-label, advancing months until it is on screen. */
async function pickDay(cal: Locator, label: string, maxMonths = 12): Promise<void> {
    for (let i = 0; i < maxMonths; i++) {
        const day = cal.locator(`table button[aria-label="${label}"]`);
        if ((await day.count()) > 0 && (await day.first().isEnabled())) {
            await day.first().click();
            return;
        }
        if (!(await nextMonth(cal))) {
            throw new Error(`Day "${label}" is past the picker's maxDate (stuck at ${await visibleMonth(cal)})`);
        }
    }
    throw new Error(`Day "${label}" never became reachable`);
}

test.describe('@smoke @writes critical writes (staging only)', () => {
    test('create a booking end-to-end', async ({ page }) => {
        const NIGHTS = 3;

        // The catalog, not the home page. Home lists "Live Availability" — properties
        // free TONIGHT — so a booking made by an earlier run can empty it and leave
        // this test with nothing to click.
        await page.goto('/properties');
        await page.locator('a[href*="/properties/"]').first().click();
        await expect(page).toHaveURL(/\/properties\//);

        // Check-in: scan for a genuinely bookable window.
        await page.getByLabel('Check-in').click();
        const cal = openCalendar(page);
        await expect(cal).toBeVisible();
        const [checkInLabel, checkOutLabel] = await findBookableRun(cal, NIGHTS);
        await pickDay(cal, checkInLabel);

        // Fail loudly here rather than letting an unset check-in cascade into a
        // confusing timeout inside the check-out picker. DatePickerInput renders a
        // <button> showing the placeholder until a date is chosen — it has no value.
        await expect(page.getByLabel('Check-in')).not.toHaveText('Select date');
        await expect(cal).toBeHidden(); // the check-in dropdown must close first

        // Check-out: the picker reopens with minDate = check-in, capped at +90 nights.
        await page.getByLabel('Check-out').click();
        const outCal = openCalendar(page);
        // Wait for the dropdown to actually mount. Choosing a check-in pushes
        // ?checkIn= into the URL, and clicking straight through that navigation
        // otherwise starts driving a calendar that is not on screen yet — which
        // surfaced as the picker appearing stuck on a far-future month.
        await expect(outCal).toBeVisible();
        await pickDay(outCal, checkOutLabel);
        await expect(page.getByLabel('Check-out')).not.toHaveText('Select date');

        // Book Now → confirmation modal → Confirm Booking. This exercises the live
        // pricing quote, the availability re-check and the drift guard.
        await page.getByRole('button', { name: 'Book Now' }).click();
        const confirm = page.getByRole('button', { name: 'Confirm Booking' });
        await expect(confirm).toBeEnabled({ timeout: 15_000 }); // waits out "Calculating price…"
        await confirm.click();

        await expect(page.getByText('Booking Confirmed!')).toBeVisible({ timeout: 15_000 });
    });

    test('submit text feedback → AI analysis returns', async () => {
        // DEFERRED: feedback is entered from a COMPLETED stay (banner/drawer on a past booking).
        // A fresh smoke account has no completed bookings, so there's no entry point. Needs a
        // seeded completed-booking fixture before this can run.
        test.fixme();
    });
});
