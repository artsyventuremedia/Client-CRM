import { randomInt } from "crypto";

const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SPECIAL = "!@#$%^&*";

function pick(chars: string) {
  return chars[randomInt(chars.length)];
}

/** Generates a random password that satisfies `strongPassword` in src/lib/validation/password.ts. */
export function generateTempPassword(): string {
  const all = LOWER + UPPER + DIGITS + SPECIAL;
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
