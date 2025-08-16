/**
 * Deterministic, strong password generator in TypeScript
 * - Uses Web Crypto API (PBKDF2 + HMAC-SHA-256) — no external libraries
 * - Same inputs -> same password; change number/context to rotate
 * - Works in Browser and Node.js >= 18 (uses globalThis.crypto or node:crypto.webcrypto)
 *
 * SECURITY NOTES
 * - Real security depends on the strength/secrecy of your master phrase.
 * - Use long phrases (≥ 20 chars / 5+ random words). Increase iterations on fast hardware.
 * - Nothing is literally "unhackable"; this design aims to be robust against modern offline cracking.
 */

// ---------- Environment helpers ----------
async function getSubtle(): Promise<SubtleCrypto> {
  const g = globalThis as any;
  if (g?.crypto?.subtle) {
    return g.crypto.subtle as SubtleCrypto;
  }
  // Node fallback: only attempt dynamic import when not in browser to avoid bundler resolution
  if (typeof window === "undefined") {
    try {
      const { webcrypto } = await import(/* @vite-ignore */ "crypto");
      return (webcrypto as Crypto).subtle as SubtleCrypto;
    } catch {
      // fallthrough to error below
    }
  }
  throw new Error(
    "Web Crypto API not available. In Node, use v18+; in browser/Tauri, use a modern runtime."
  );
}

const enc = new TextEncoder();

// ---------- Utilities ----------
function normText(s: string): string {
  return s.normalize("NFKC").trim();
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const subtle = await getSubtle();
  const digest = await subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

async function hmacSha256(
  keyBytes: Uint8Array,
  msg: Uint8Array
): Promise<Uint8Array> {
  const subtle = await getSubtle();
  const key = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, msg);
  return new Uint8Array(sig);
}

async function pbkdf2(
  master: string,
  salt: Uint8Array,
  iterations: number,
  bits: number
): Promise<Uint8Array> {
  const subtle = await getSubtle();
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(normText(master)),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const params: Pbkdf2Params = {
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations,
  };
  const derived = await subtle.deriveBits(params, keyMaterial, bits);
  return new Uint8Array(derived);
}

function bytesToInt(b: number): number {
  return b & 0xff;
}

// ---------- Character policy ----------
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/\\|~";
const ALLSETS = [LOWER, UPPER, DIGITS, SYMBOLS] as const;
const COMBINED = ALLSETS.join("");

// ---------- Salt derivation (deterministic) ----------
async function deterministicSalt(
  context: string,
  number: number | string
): Promise<Uint8Array> {
  const tag = "pwgen-salt-v1";
  const payload = `${tag}|${normText(context)}|${normText(String(number))}`;
  const hash = await sha256(enc.encode(payload));
  return hash.slice(0, 16); // 128-bit salt
}

// ---------- Deterministic shuffle (Fisher–Yates using HMAC PRF) ----------
async function deterministicShuffle(
  arr: string[],
  keyBytes: Uint8Array
): Promise<void> {
  // Generate PRF bytes; extend if needed by chaining
  let prf = await hmacSha256(keyBytes, enc.encode("shuffle-v1"));
  let j = 0;
  for (let i = arr.length - 1; i > 0; i--) {
    if (j >= prf.length) {
      prf = await hmacSha256(
        keyBytes,
        concatBytes(prf, enc.encode("shuffle-next"))
      );
      j = 0;
    }
    const k = prf[j++] % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[k];
    arr[k] = tmp;
  }
}

// ---------- Mapping bytes to password with policy ----------
function mapBytesToPassword(keyBytes: Uint8Array, length: number): string {
  if (length < 8) throw new Error("length must be at least 8");
  const out: string[] = [];
  // Ensure at least one from each set
  for (let i = 0; i < ALLSETS.length; i++) {
    const set = ALLSETS[i];
    const b = keyBytes[i % keyBytes.length];
    out.push(set[bytesToInt(b) % set.length]);
  }
  // Fill remaining from combined set
  for (let i = ALLSETS.length; i < length; i++) {
    const b = keyBytes[i % keyBytes.length];
    out.push(COMBINED[bytesToInt(b) % COMBINED.length]);
  }
  return out.join("");
}

// ---------- Public API ----------
export interface GenerateOptions {
  /** site/app identifier (e.g., 'gmail.com') */
  context?: string;
  /** password length (>= 8; recommend 16–24) */
  length?: number;
  /** PBKDF2 iterations (>= 100_000; default 600_000) */
  iterations?: number;
}

export async function generatePassword(
  masterPhrase: string,
  number: number,
  options: GenerateOptions = {}
): Promise<string> {
  const context = options.context ?? "";
  const length = options.length ?? 20;
  const iterations = options.iterations ?? 600_000;
  if (iterations < 100_000) throw new Error("iterations must be >= 100,000");

  const salt = await deterministicSalt(context, number);
  // Derive >= 2*length bytes so we can shuffle and sample
  const keyBytes = await pbkdf2(
    masterPhrase,
    salt,
    iterations,
    Math.max(512, length * 16)
  );

  // Build password then deterministically shuffle characters to avoid fixed positions
  const initial = mapBytesToPassword(keyBytes, length).split("");
  await deterministicShuffle(initial, keyBytes);
  return initial.slice(0, length).join("");
}

// ---------- Optional: Node CLI ----------
const __maybeProcess: any = (globalThis as any).process;
if (
  typeof __maybeProcess !== "undefined" &&
  Array.isArray(__maybeProcess.argv) &&
  typeof __maybeProcess.argv[1] === "string" &&
  /(pwgen).*\.(ts|js)$/.test(__maybeProcess.argv[1] as string)
) {
  (async () => {
    const [, , master, numStr, ...rest] = __maybeProcess.argv as string[];
    if (!master || !numStr) {
      console.error(
        'Usage: ts-node pwgen.ts "Mi frase maestra" 12345 --context gmail.com --length 20 --iterations 600000'
      );
      __maybeProcess.exit(1);
    }
    const args = new Map<string, string>();
    for (let i = 0; i < rest.length; i += 2) {
      const k = rest[i];
      const v = rest[i + 1];
      if (k?.startsWith("--") && typeof v === "string") args.set(k.slice(2), v);
    }
    const pwd = await generatePassword(master, Number(numStr), {
      context: args.get("context") ?? "",
      length: args.has("length") ? Number(args.get("length")) : 20,
      iterations: args.has("iterations")
        ? Number(args.get("iterations"))
        : 600_000,
    });
    console.log(pwd);
  })().catch((e) => {
    console.error(e);
    __maybeProcess.exit(1);
  });
}
