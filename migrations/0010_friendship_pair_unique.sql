-- One friendship state per unordered pair. Prefer an accepted relation when
-- cleaning older bidirectional rows, then prevent the race from recurring.
WITH ranked AS (
 SELECT requester_id, recipient_id,
  row_number() OVER (
   PARTITION BY LEAST(requester_id,recipient_id), GREATEST(requester_id,recipient_id)
   ORDER BY CASE WHEN state='ACCEPTED' THEN 0 ELSE 1 END, created_at, requester_id
  ) AS position
 FROM friendships
)
DELETE FROM friendships f USING ranked r
WHERE f.requester_id=r.requester_id AND f.recipient_id=r.recipient_id AND r.position>1;

CREATE UNIQUE INDEX friendships_pair_unique
 ON friendships (LEAST(requester_id,recipient_id), GREATEST(requester_id,recipient_id));
