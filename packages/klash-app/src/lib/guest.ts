import "server-only";

import { createGuestIdentityHelpers } from "@klash/auth/guest";
import prisma from "@klash/klash-app/lib/prisma";
import { createClient } from "@klash/klash-app/lib/supabase/server";
import { getCurrentVertical } from "@klash/klash-config";

const { guestEmailDomain = "guest.klash.local" } = getCurrentVertical();

const guestHelpers = createGuestIdentityHelpers({
  prisma,
  createClient,
  fallbackGuestEmailDomain: guestEmailDomain,
});

export const {
  resolvePlayerIdentity,
  setGuestUsername,
  getGuestIdentityFromCookies,
  migrateGuestDataToUser,
} = guestHelpers;
