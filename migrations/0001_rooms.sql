-- Availability Room — initial schema (spec 1).
-- The data contract for the whole feature: a rooms table and a participants
-- table, with availability stored as a blob on the participant row (no separate
-- availability table — client-side compute, small rooms).

CREATE TABLE rooms (
  id             TEXT    PRIMARY KEY,           -- high-entropy URL id; the obscurity is the access control
  name           TEXT,                          -- nullable → UI shows a placeholder; anyone may rename (flat ownership)
  created_at     INTEGER NOT NULL,              -- unix ms
  last_active_at INTEGER NOT NULL,              -- unix ms; bumped on WRITES only, never reads; drives the TTL
  schema_version INTEGER NOT NULL               -- starts at BLOB_VERSION; lets us migrate blob format later
);

CREATE TABLE participants (
  id                  TEXT    PRIMARY KEY,                                 -- internal id (NOT the cookie secret)
  room_id             TEXT    NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  display_name        TEXT    NOT NULL,                                    -- set in the contribute modal (spec 2)
  timezone            TEXT    NOT NULL,                                    -- IANA string, e.g. America/Los_Angeles
  general_week        TEXT,                                                -- 336-char recurring-week blob; NULL until first save
  overrides           TEXT    NOT NULL DEFAULT '{}',                       -- JSON map of concrete-date exceptions
  availability_set_at INTEGER,                                             -- unix ms of first availability save; NULL = unresponded
  password_hash       TEXT,                                                -- NULL = no password (optional); spec 2 populates
  secret_hash         TEXT    NOT NULL,                                    -- hash of the per-room cookie secret; spec 2 populates
  created_at          INTEGER NOT NULL,                                    -- unix ms
  last_seen_at        INTEGER NOT NULL                                     -- unix ms; spec 2 bumps on resolve
);

-- Load a room's people.
CREATE INDEX participants_room_id ON participants(room_id);

-- Janitor scan over stale rooms.
CREATE INDEX rooms_last_active_at ON rooms(last_active_at);
