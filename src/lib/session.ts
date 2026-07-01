import "server-only";
import { cookies } from "next/headers";

interface PlayerSession {
  playerId: string;
  secretToken: string;
}

function cookieName(roomCode: string) {
  return `sur_session_${roomCode}`;
}

export async function setPlayerSession(
  roomCode: string,
  session: PlayerSession,
) {
  const store = await cookies();
  store.set(cookieName(roomCode), JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h, matches room expiry
  });
}

export async function getPlayerSession(
  roomCode: string,
): Promise<PlayerSession | null> {
  const store = await cookies();
  const raw = store.get(cookieName(roomCode))?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.playerId === "string" && typeof parsed.secretToken === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearPlayerSession(roomCode: string) {
  const store = await cookies();
  store.delete(cookieName(roomCode));
}
