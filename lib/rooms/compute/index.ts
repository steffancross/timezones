// Public surface of the Availability Room compute layer (spec 3). Pure, client-
// safe functions: projection → aggregate → segments / windows / status / breakdown,
// plus the viewer-frame cell helpers. The views (specs 4–6) import from here.

export type {
  AggregateGrid,
  CellBreakdown,
  ComputeInput,
  Grade,
  Instant,
  LiveStatus,
  MeetingWindow,
  ParticipantProjection,
  PlainDate,
  Projection,
  Segment,
  SlotState,
} from './types';

export {
  cellInstant,
  currentWeekAnchor,
  participantSlotAt,
  viewerCellInstant,
  viewerWeekStart,
} from './cells';
export { computeSet, project } from './projection';
export { aggregate, cellGrade } from './aggregate';
export { rowSegments } from './segments';
export { todayWindows, weekWindows } from './windows';
export { liveStatus } from './status';
export { cellBreakdown } from './breakdown';
