export type RateLimitResult = {
  allowed: boolean;
  count: number;
};

export type RateLimitStore = {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
};

type Bucket = {
  count: number;
};

export function createMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, Bucket>();

  return {
    async consume(key, limit, windowMs) {
      const now = Date.now();
      const slot = Math.floor(now / windowMs);
      const id = `${key}:${slot}`;

      for (const stored of windows.keys()) {
        const marker = stored.lastIndexOf(":");
        const storedSlot = Number(stored.slice(marker + 1));

        if (Number.isFinite(storedSlot) && storedSlot < slot) {
          windows.delete(stored);
        }
      }

      const bucket = windows.get(id) ?? { count: 0 };
      bucket.count += 1;
      windows.set(id, bucket);

      return { allowed: bucket.count <= limit, count: bucket.count };
    },
  };
}
