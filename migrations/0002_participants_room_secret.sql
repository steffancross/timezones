-- Availability Room — identity lookup index (spec 2).
-- resolveMe hashes the cookie secret and looks the participant up by
-- (room_id, secret_hash) on every authenticated request — the hot path. The
-- columns already exist from 0001; this just makes that lookup an index hit
-- instead of a scan. (room_id leads so it doubles as the per-room filter.)

CREATE INDEX participants_room_secret ON participants(room_id, secret_hash);
