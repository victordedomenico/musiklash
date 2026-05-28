import "server-only";

import { createGuestIdentityHelpers } from "@klash/auth/guest";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const guestHelpers = createGuestIdentityHelpers({
  prisma,
  createClient,
  fallbackGuestEmailDomain: "guest.animeklash.local",
});

export const {
  resolvePlayerIdentity,
  setGuestUsername,
  getGuestIdentityFromCookies,
  migrateGuestDataToUser,
} = guestHelpers;
