-- Step 1: add nullable JSONB column
ALTER TABLE "Booking" ADD COLUMN "priceBreakdown" JSONB;

-- Step 2: backfill every legacy row with nights >= 1.
-- For each booking, generate one row per night between checkIn (inclusive) and checkOut (exclusive).
-- Per-night price = ROUND(totalPrice / nights, 2), with the LAST night absorbing the remainder
-- so SUM(breakdown.price) === totalPrice to the cent.
UPDATE "Booking" b
SET "priceBreakdown" = sub.breakdown
FROM (
  SELECT
    b2.id,
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(b2."checkIn" + (gs.n || ' days')::interval, 'YYYY-MM-DD'),
        'price',
          CASE
            WHEN gs.n = (b2."checkOut" - b2."checkIn") - 1
              THEN (b2."totalPrice"
                    - (ROUND(b2."totalPrice" / (b2."checkOut" - b2."checkIn"), 2)
                       * ((b2."checkOut" - b2."checkIn") - 1)))::numeric(10,2)
            ELSE ROUND(b2."totalPrice" / (b2."checkOut" - b2."checkIn"), 2)
          END,
        'appliedRules', jsonb_build_array('Legacy')
      ) ORDER BY gs.n
    ) AS breakdown
  FROM "Booking" b2,
       generate_series(0, (b2."checkOut" - b2."checkIn") - 1) AS gs(n)
  WHERE b2."checkOut" > b2."checkIn"
  GROUP BY b2.id
) sub
WHERE b.id = sub.id;

-- Step 2b: any row with checkOut <= checkIn (corrupt/legacy data the app-layer
-- invariant of nights >= 1 should have prevented) still has a NULL breakdown.
-- Give it a single-night fallback so step 3's NOT NULL succeeds; tag explicitly
-- so consumers can detect synthesized-from-corrupt rows.
UPDATE "Booking"
SET "priceBreakdown" = jsonb_build_array(
  jsonb_build_object(
    'date', to_char("checkIn", 'YYYY-MM-DD'),
    'price', "totalPrice"::numeric(10,2),
    'appliedRules', jsonb_build_array('Legacy', 'ZeroNightFallback')
  )
)
WHERE "priceBreakdown" IS NULL;

-- Step 3: flip NOT NULL once every row is populated.
ALTER TABLE "Booking" ALTER COLUMN "priceBreakdown" SET NOT NULL;
