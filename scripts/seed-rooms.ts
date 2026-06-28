// biome-ignore-all lint/suspicious/noConsole: CLI seed script

// Dev seed for Availability Rooms — populates LOCAL D1 with a few rooms to
// evaluate the views against (there's no create-room UI yet). Run:
//
//   pnpm seed:rooms
//
// Then open the printed /r/<id> URLs in `pnpm dev`. To edit as yourself, use the
// Availability tab → "Find me" → pick "Dev" → enter the standard password; the
// claim rebinds that participant to your browser.
//
// Idempotent: it deletes its own rooms (fixed ids) and re-inserts. Local only —
// it shells out to `wrangler d1 execute --local`, the same store `next dev` reads.

import type { SlotState } from '@/lib/rooms/blob';
import { BLOB_VERSION } from '@/lib/rooms/config';
import { generateSecret, hashPassword, sha256Base64url } from '@/lib/rooms/crypto';
import { generateParticipantId } from '@/lib/rooms/id';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The standard identity present in every populated room — claim it to hop in.
const DEV_NAME = 'Dev';
const DEV_PASSWORD = 'devpass123';

const SQL_PATH = join(import.meta.dirname, '..', '.wrangler', 'seed-rooms.sql');
const WEEKDAYS = [0, 1, 2, 3, 4]; // storage dow: Mon=0 … Fri=4

type Range = { days: number[]; from: number; to: number; state: SlotState };

/** Build a 336-char general-week blob from local-time ranges (the participant's own frame). */
function week(...ranges: Range[]): string {
  const slots: SlotState[] = Array(336).fill('n');
  for (const r of ranges) {
    for (const d of r.days) {
      for (let k = r.from * 2; k < r.to * 2; k++) slots[d * 48 + k] = r.state;
    }
  }
  return slots.join('');
}

// A "9–5 plus a couple of if-needed evenings" week, reused with small variations.
const nineToFive = (): Range => ({ days: WEEKDAYS, from: 9, to: 17, state: 'y' });
const eveningSoft = (days: number[]): Range => ({ days, from: 18, to: 20, state: 's' });

type SeedParticipant = { name: string; timezone: string; week: string; dev?: boolean };
type SeedRoom = { id: string; name: string; participants: SeedParticipant[] };

const ROOMS: SeedRoom[] = [
  { id: 'dev-blank', name: 'Blank room', participants: [] },
  {
    id: 'dev-solo',
    name: 'Solo room',
    participants: [
      {
        name: DEV_NAME,
        timezone: 'America/New_York',
        week: week(nineToFive(), eveningSoft([1, 3])),
        dev: true,
      },
    ],
  },
  {
    id: 'dev-trio',
    name: 'Team sync (US)',
    participants: [
      {
        name: DEV_NAME,
        timezone: 'America/New_York',
        week: week(nineToFive(), eveningSoft([1, 3])),
        dev: true,
      },
      { name: 'Alex', timezone: 'America/Chicago', week: week(nineToFive()) },
      { name: 'Sam', timezone: 'America/Denver', week: week(nineToFive(), eveningSoft([0, 2, 4])) },
    ],
  },
  {
    id: 'dev-global',
    name: 'Global crew',
    participants: [
      {
        name: DEV_NAME,
        timezone: 'America/Los_Angeles',
        week: week(nineToFive(), eveningSoft([1, 3])),
        dev: true,
      },
      { name: 'Liv', timezone: 'Europe/London', week: week(nineToFive()) },
      { name: 'Priya', timezone: 'Asia/Kolkata', week: week(nineToFive()) },
      { name: 'Yuki', timezone: 'Asia/Tokyo', week: week(nineToFive(), eveningSoft([0, 4])) },
    ],
  },
];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const now = Date.now();
  const devHash = await hashPassword(DEV_PASSWORD);
  const ids = ROOMS.map((r) => r.id);

  const stmts: string[] = [
    `DELETE FROM participants WHERE room_id IN (${ids.map(q).join(', ')})`,
    `DELETE FROM rooms WHERE id IN (${ids.map(q).join(', ')})`,
  ];

  for (const room of ROOMS) {
    stmts.push(
      `INSERT INTO rooms (id, name, created_at, last_active_at, schema_version) ` +
        `VALUES (${q(room.id)}, ${q(room.name)}, ${now}, ${now}, ${BLOB_VERSION})`,
    );
    for (const p of room.participants) {
      // Throwaway secret — the user claims via the password, which rebinds it.
      const secretHash = await sha256Base64url(generateSecret());
      const passwordHash = p.dev ? q(devHash) : 'NULL';
      stmts.push(
        `INSERT INTO participants ` +
          `(id, room_id, display_name, timezone, general_week, overrides, availability_set_at, password_hash, secret_hash, created_at, last_seen_at) ` +
          `VALUES (${q(generateParticipantId())}, ${q(room.id)}, ${q(p.name)}, ${q(p.timezone)}, ` +
          `${q(p.week)}, '{}', ${now}, ${passwordHash}, ${q(secretHash)}, ${now}, ${now})`,
      );
    }
  }

  const sql = `${stmts.join(';\n')};\n`;
  mkdirSync(join(import.meta.dirname, '..', '.wrangler'), { recursive: true });
  writeFileSync(SQL_PATH, sql);

  console.log('Seeding local D1…');
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'worldtimezones-rooms', '--local', '--file', SQL_PATH],
    { stdio: 'inherit' },
  );

  console.log('\nSeeded rooms (open in `pnpm dev`):');
  for (const r of ROOMS) {
    const who = r.participants.length === 0 ? 'empty' : `${r.participants.length} filled`;
    console.log(`  http://localhost:3000/r/${r.id}   — ${r.name} (${who})`);
  }
  console.log(`\nHop in: Availability tab → "Find me" → ${DEV_NAME} → password "${DEV_PASSWORD}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
