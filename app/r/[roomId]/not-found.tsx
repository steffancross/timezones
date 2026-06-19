// Room dead-end (spec 7b). Rendered by `notFound()` in this segment's page when
// `readRoomState` returns null — a bad/typo'd id or a TTL-expired room. A clean
// recoverable dead-end with a way to start fresh, never a broken shell. Not-found
// boundaries receive no params, so the copy is generic (no roomId needed).

import { StartRoomButton } from '@/components/room/StartRoomButton';

export default function RoomNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">This room doesn&apos;t exist or has expired</h1>
      <p className="mt-3 text-[color:var(--fg-muted)]">
        The link may be mistyped, or the room was inactive long enough to be cleaned up. You can
        start a new one and share the link.
      </p>
      <div className="mt-6">
        <StartRoomButton />
      </div>
    </div>
  );
}
