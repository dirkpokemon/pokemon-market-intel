-- Prune old raw_prices in batches (less WAL/disk spike than one huge DELETE).
-- Use ONLY when Postgres is healthy and you have a backup.
-- Connect: Railway → Postgres → Connect / psql, or: railway connect Postgres
--
-- 1) See size / oldest row:
--    SELECT COUNT(*), MIN(scraped_at), MAX(scraped_at) FROM raw_prices;
--
-- 2) Run the DELETE below repeatedly until it reports DELETE 0 (change 60 days if needed).
--    Analysis uses ~30d lookback by default; keeping 60–90d is usually enough headroom.

DELETE FROM raw_prices
WHERE id IN (
  SELECT id FROM raw_prices
  WHERE scraped_at < NOW() - INTERVAL '60 days'
  ORDER BY id
  LIMIT 50000
);

-- After many batches, reclaim space (needs free disk; run off-peak):
-- VACUUM (ANALYZE) raw_prices;
