import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function scrypt(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error || !derived) {
        reject(error ?? new Error("Password hash failed."));
        return;
      }

      resolve(Buffer.from(derived));
    });
  });
}

let timingHash: Promise<string> | null = null;

export function dummyPasswordHash() {
  timingHash ??= hashPassword("mafateeh-timing-equalizer");
  return timingHash;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 256 * 1024 * 1024 })) as Buffer;
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash.toString("hex")}`;
}

export function passwordNeedsRehash(stored: string) {
  return !stored.startsWith(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$`);
}

function parts(stored: string) {
  if (stored.startsWith("scrypt$")) {
    const [, n, r, p, salt, hash] = stored.split("$");
    const cost = Number(n);
    const block = Number(r);
    const parallel = Number(p);

    if (!salt || !hash || !Number.isInteger(cost) || !Number.isInteger(block) || !Number.isInteger(parallel)) {
      return null;
    }

    return { salt, hash, N: cost, r: block, p: parallel };
  }

  const [scheme, salt, hash] = stored.split(":");

  if (scheme !== "scrypt" || !salt || !hash) {
    return null;
  }

  return { salt, hash, N: 16384, r: 8, p: 1 };
}

export async function verifyPassword(password: string, stored: string) {
  const parsed = parts(stored);

  if (!parsed) {
    return false;
  }

  const actual = (await scrypt(password, parsed.salt, KEY_LENGTH, { N: parsed.N, r: parsed.r, p: parsed.p, maxmem: 256 * 1024 * 1024 })) as Buffer;
  const expected = Buffer.from(parsed.hash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
