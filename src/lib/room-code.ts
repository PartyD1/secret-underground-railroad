// Unambiguous uppercase alphanumeric charset (no 0/O, 1/I/L) so codes
// are easy to read aloud and type on a phone.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  const chars = Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)],
  ).join("");
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}
