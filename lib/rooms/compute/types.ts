// Shared types for the Availability Room compute layer (spec 3). Pure data; no
// behavior. `Instant` is epoch-ms (matches the app's unix-ms convention and
// keeps past-filtering plain integer math); `PlainDate` is a 'YYYY-MM-DD' string
// (same shape as override keys / weekAnchor). Weeks are Sunday-first in the
// viewer's frame: day index 0 = Sunday … 6 = Saturday.

import type { RoomState } from '../db';
import type { SlotState } from '../blob';

export type { SlotState };

/** Absolute point in time, epoch milliseconds. */
export type Instant = number;

/** A calendar date with no zone, ISO 'YYYY-MM-DD', interpreted in the viewer frame. */
export type PlainDate = string;

/** Aggregate grade of a viewer cell over the compute set. */
export type Grade = 'all' | 'some' | 'none';

/** The four inputs everything keys off. */
export type ComputeInput = {
  room: RoomState; // participants w/ generalWeek, overrides, timezone, hasResponded
  viewerTz: string; // IANA zone of the current viewer
  weekAnchor: PlainDate; // first day (SUNDAY) of the concrete week, in viewer frame
  now: Instant; // current absolute instant
  selected?: string[]; // participant ids in the aggregate (default: all)
};

/** One participant's availability projected into the viewer's 7×48 grid. */
export type ParticipantProjection = {
  participantId: string;
  /** projection[d][k] — viewer day d (0=Sun), slot k (0..47). */
  grid: SlotState[][];
};

/** Output of the projection pass: per-participant grids + the viewer-cell nonexistent flags. */
export type Projection = {
  participants: ParticipantProjection[];
  /** nonexistent[d][k] — true where the viewer's local wall-time doesn't exist (spring-forward gap). */
  nonexistent: boolean[][];
};

/** The aggregate overlap grid + the parallel nonexistent flags. */
export type AggregateGrid = {
  grade: Grade[][]; // grade[d][k]
  nonexistent: boolean[][]; // nonexistent[d][k]
};

/** A run of viewer time-rows, either folded (collapsed dead band) or shown. */
export type Segment = {
  fold: boolean;
  from: number; // first slot index, inclusive
  to: number; // last slot index, inclusive
};

/** A ranked meeting window within a single viewer-day. */
export type MeetingWindow = {
  day: number; // 0=Sun … 6=Sat
  startSlot: number; // inclusive
  endSlot: number; // inclusive
  grade: 'all' | 'some'; // 'all' iff every cell is all-green; else some
  softPeople: string[]; // distinct participants soft anywhere in the window
  startInstant: Instant;
  endInstant: Instant; // end of the last cell (exclusive boundary)
};

/** The best-covered remaining slot today when no full overlap is left (spec 6). */
export type PartialToday = {
  slot: number; // viewer half-hour index 0..47 on today's column
  outParticipants: string[]; // compute-set participants who are 'n' at that slot
};

/** A participant's availability at `now`, in their own zone. */
export type LiveStatus = {
  participantId: string;
  state: SlotState;
  /** true when derived from the recurring template, false when a concrete override covers now. */
  inferred: boolean;
};

/** Per-cell hover/tap breakdown over the compute set. */
export type CellBreakdown = {
  perPerson: { participantId: string; state: SlotState }[];
  freeCount: number; // 'y'
  softCount: number; // 's'
  outCount: number; // 'n'
};
