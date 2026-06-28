// Rate-limit abstraction for the claim endpoint (spec 2). `claim` is the one
// password-guessing surface, so it gets a per-(room, IP) limiter.
//
// The limiter is an injected interface, not a hard dependency on the Cloudflare
// binding, for one reason: Cloudflare's native Workers Rate Limiting binding
// isn't modeled by Miniflare / vitest-pool-workers. So the pure `claim` op takes
// a `RateLimiter`; prod passes a thin wrapper over `env.CLAIM_LIMITER` and tests
// inject an in-memory fake — neither the op nor the tests touch the real binding.

export interface RateLimiter {
  /** Returns `{ allowed: false }` when the key is over its limit. */
  check(key: string): Promise<{ allowed: boolean }>;
}

/** The Cloudflare native rate-limit binding shape (a subset of `RateLimit`). */
interface CfRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Wrap the native `env.CLAIM_LIMITER` binding as a RateLimiter (used in the route handler). */
export function cloudflareRateLimiter(binding: CfRateLimitBinding): RateLimiter {
  return {
    async check(key) {
      const { success } = await binding.limit({ key });
      return { allowed: success };
    },
  };
}

/** A limiter that never blocks — used where no binding is available (e.g. local dev). */
export const allowAllRateLimiter: RateLimiter = {
  check: async () => ({ allowed: true }),
};

/** Build the limiter key for a claim attempt. */
export function claimRateLimitKey(roomId: string, clientIp: string): string {
  return `claim:${roomId}:${clientIp}`;
}

/** Build the limiter key for a room-creation attempt (the one unguarded public write). */
export function roomCreateRateLimitKey(clientIp: string): string {
  return `create:${clientIp}`;
}
