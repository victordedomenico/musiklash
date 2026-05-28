import "server-only";

import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const GUEST_ID_COOKIE = "mk_guest_id";
const GUEST_USERNAME_COOKIE = "mk_guest_username";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const ADJECTIVES = [
  "Blue",
  "Neon",
  "Wild",
  "Cosmic",
  "Golden",
  "Lucky",
  "Rapid",
  "Silent",
  "Funky",
  "Crimson",
];

const ANIMALS = [
  "Fox",
  "Panda",
  "Wolf",
  "Tiger",
  "Falcon",
  "Otter",
  "Lynx",
  "Raven",
  "Koala",
  "Panther",
];

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: ONE_YEAR_SECONDS,
};

function isUuid(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateReadableGuestUsername(): string {
  const adjective = ADJECTIVES[randomInt(0, ADJECTIVES.length - 1)] ?? "Guest";
  const animal = ANIMALS[randomInt(0, ANIMALS.length - 1)] ?? "User";
  const suffix = randomInt(10, 9999);
  return `${adjective}${animal}${suffix}`;
}

function normalizePreferredUsername(value: string | undefined | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
  if (cleaned.length < 3) return null;
  return cleaned.slice(0, 24);
}

async function usernameExists(username: string): Promise<boolean> {
  const existing = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  return Boolean(existing);
}

async function generateUniqueUsername(base?: string): Promise<string> {
  const candidate = normalizePreferredUsername(base) ?? generateReadableGuestUsername();

  if (!(await usernameExists(candidate))) {
    return candidate;
  }

  for (let i = 0; i < 10; i += 1) {
    const suffixed = `${candidate}${randomInt(10, 9999)}`;
    if (!(await usernameExists(suffixed))) {
      return suffixed;
    }
  }

  return `${candidate}${crypto.randomUUID().slice(0, 6)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFallbackGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith("@guest.bracketfight.local");
}

function buildFallbackGuestCredentials() {
  const token = crypto.randomUUID().replace(/-/g, "");
  return {
    email: `guest_${token}@guest.bracketfight.local`,
    password: `Gst!${token}${crypto.randomUUID().slice(0, 8)}`,
  };
}

async function getProfileWithRetry(userId: string, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (profile) return profile;
    await wait(100);
  }
  return null;
}

async function ensureAnonymousUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();
  const anonErrorMsg = error?.message;
  if (!error && data.user) {
    return data.user;
  }

  // Fallback when anonymous sign-ins are disabled:
  // create a temporary guest account with random credentials.
  const fallback = buildFallbackGuestCredentials();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: fallback.email,
    password: fallback.password,
  });
  const signUpErrorMsg = signUpError?.message;

  if (signUpError || !signUpData.user) {
    const details = signUpErrorMsg ?? anonErrorMsg ?? "inconnu";
    throw new Error(
      `Impossible de créer une session invitée. Active les connexions anonymes dans Supabase Auth ou connecte-toi avec un compte. (${details})`,
    );
  }

  if (signUpData.session) {
    return signUpData.user;
  }

  // Some projects require email confirmation before issuing a session.
  // Try direct login with generated credentials.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: fallback.email,
    password: fallback.password,
  });

  if (signInError || !signInData.user) {
    const details = signInError?.message ?? signUpErrorMsg ?? anonErrorMsg ?? "inconnu";
    throw new Error(
      `Impossible de créer une session invitée. Active les connexions anonymes dans Supabase Auth ou connecte-toi avec un compte. (${details})`,
    );
  }

  return signInData.user;
}

async function clearGuestCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_ID_COOKIE);
  cookieStore.delete(GUEST_USERNAME_COOKIE);
}

export async function resolvePlayerIdentity() {
  // Reuse existing guest identity from cookies when available.
  // This avoids blocking returning guests if anonymous sign-ins are temporarily unavailable.
  const cookieGuest = await getGuestIdentityFromCookies();
  if (cookieGuest) {
    return {
      playerId: cookieGuest.id,
      username: cookieGuest.username,
      isGuest: true,
    };
  }

  const user = await ensureAnonymousUser();
  const isGuest = Boolean(user.is_anonymous) || isFallbackGuestEmail(user.email);
  const profile = await getProfileWithRetry(user.id);
  if (!profile) {
    throw new Error("Profil utilisateur introuvable après création de session.");
  }
  const cookieStore = await cookies();
  const preferredGuestUsername = isGuest
    ? cookieStore.get(GUEST_USERNAME_COOKIE)?.value
    : null;
  const normalizedPreferred = normalizePreferredUsername(preferredGuestUsername);

  let finalUsername = profile.username;
  if (isGuest && normalizedPreferred && normalizedPreferred !== profile.username) {
    const username = await generateUniqueUsername(normalizedPreferred);
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { username },
      select: { username: true },
    });
    finalUsername = updated.username;
  } else if (isGuest && /^user\d*$/i.test(profile.username)) {
    const username = await generateUniqueUsername();
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { username },
      select: { username: true },
    });
    finalUsername = updated.username;
  }

  if (isGuest) {
    try {
      cookieStore.set(GUEST_ID_COOKIE, profile.id, COOKIE_OPTIONS);
      cookieStore.set(GUEST_USERNAME_COOKIE, finalUsername, COOKIE_OPTIONS);
    } catch {
      // Called from a Server Component — cookies can only be set from Server Actions / Route Handlers.
      // Safe to ignore: Supabase auth cookies are already set, and guest cookies will be set on next write.
    }
  }

  return {
    playerId: profile.id,
    username: finalUsername,
    isGuest,
  };
}

export async function setGuestUsername(preferredUsername: string) {
  const normalized = normalizePreferredUsername(preferredUsername);
  if (!normalized) {
    return { error: "Pseudo invalide (3 caractères minimum)." };
  }

  const user = await ensureAnonymousUser();
  const isGuest = Boolean(user.is_anonymous) || isFallbackGuestEmail(user.email);
  if (!isGuest) {
    return { error: "Le pseudo invité est modifiable uniquement en mode invité." };
  }

  const profile = await getProfileWithRetry(user.id);
  if (!profile) {
    return { error: "Profil invité introuvable." };
  }

  const username = await generateUniqueUsername(normalized);
  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: { username },
    select: { id: true, username: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(GUEST_ID_COOKIE, updated.id, COOKIE_OPTIONS);
  cookieStore.set(GUEST_USERNAME_COOKIE, updated.username, COOKIE_OPTIONS);

  return { username: updated.username };
}

export async function getGuestIdentityFromCookies() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (user.is_anonymous || isFallbackGuestEmail(user.email))) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { username: true },
    });
    return {
      id: user.id,
      username: profile?.username ?? "Anonyme",
    };
  }

  if (user && !user.is_anonymous) {
    return null;
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_ID_COOKIE)?.value;
  if (!isUuid(guestId)) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: guestId },
    select: { username: true },
  });

  return {
    id: guestId,
    username: profile?.username ?? cookieStore.get(GUEST_USERNAME_COOKIE)?.value ?? "Anonyme",
  };
}

export async function migrateGuestDataToUser(userId: string) {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_ID_COOKIE)?.value;

  if (!isUuid(guestId)) return;
  if (guestId === userId) {
    await clearGuestCookies();
    return;
  }

  const guestProfile = await prisma.profile.findUnique({
    where: { id: guestId },
    select: { id: true },
  });
  if (!guestProfile) {
    await clearGuestCookies();
    return;
  }

  const userProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userProfile) {
    const fallbackUsername = await generateUniqueUsername(`User${userId.slice(0, 6)}`);
    await prisma.profile.create({
      data: {
        id: userId,
        username: fallbackUsername,
      },
    });
  }

  await prisma.$transaction([
    prisma.bracket.updateMany({ where: { ownerId: guestId }, data: { ownerId: userId } }),
    prisma.tierlist.updateMany({ where: { ownerId: guestId }, data: { ownerId: userId } }),
    prisma.blindtest.updateMany({ where: { ownerId: guestId }, data: { ownerId: userId } }),
    prisma.bracketGame.updateMany({ where: { playerId: guestId }, data: { playerId: userId } }),
    prisma.tierlistSession.updateMany({ where: { playerId: guestId }, data: { playerId: userId } }),
    prisma.blindtestSession.updateMany({ where: { playerId: guestId }, data: { playerId: userId } }),
    prisma.battleFeatSoloSession.updateMany({
      where: { playerId: guestId },
      data: { playerId: userId },
    }),
    prisma.battleFeatRoom.updateMany({ where: { hostId: guestId }, data: { hostId: userId } }),
    prisma.battleFeatRoom.updateMany({
      where: { currentTurnId: guestId },
      data: { currentTurnId: userId },
    }),
    prisma.battleFeatRoom.updateMany({ where: { winnerId: guestId }, data: { winnerId: userId } }),
    prisma.blindtestRoom.updateMany({ where: { hostId: guestId }, data: { hostId: userId } }),
    prisma.blindtestRoom.updateMany({ where: { winnerId: guestId }, data: { winnerId: userId } }),
  ]);

  // Remap JSON participants (rooms with N players) from guestId → userId.
  await prisma.$executeRaw`
    UPDATE blindtest_rooms
    SET participants = replace(participants::text, ${guestId}, ${userId})::jsonb
    WHERE participants::text LIKE ${"%" + guestId + "%"}
  `;
  await prisma.$executeRaw`
    UPDATE battle_feat_rooms
    SET participants = replace(participants::text, ${guestId}, ${userId})::jsonb
    WHERE participants::text LIKE ${"%" + guestId + "%"}
  `;

  await prisma.profile.deleteMany({ where: { id: guestId } });
  await clearGuestCookies();
}
