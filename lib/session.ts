import { cookies } from "next/headers";

export type SessionUser = {
  userId: string;
  username: string;
  displayName: string;
  expiresAt: string;
};

export async function readSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("indrive_session")?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie) as SessionUser;

    if (!session.userId || !session.username || !session.expiresAt) {
      return null;
    }

    const expiresAt = new Date(session.expiresAt).getTime();

    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
