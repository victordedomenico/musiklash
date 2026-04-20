import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { updateProfileSettings } from "./actions";

export const metadata = {
  title: "Paramètres — MusiKlash",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

  const currentUsername = profile?.username ?? "";

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">Paramètres</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Mets à jour tes informations personnelles.
        </p>
      </div>

      <div className="card space-y-6 p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Compte
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Email : <span className="font-medium text-[color:var(--foreground)]">{user.email}</span>
          </p>
        </div>

        <form action={updateProfileSettings} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]"
            >
              Pseudo
            </label>
            <input
              id="username"
              name="username"
              type="text"
              defaultValue={currentUsername}
              minLength={3}
              maxLength={24}
              required
              className="input mt-1"
              placeholder="Ton pseudo"
            />
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              3 à 24 caractères. Lettres, chiffres, tirets et underscores.
            </p>
          </div>

          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </form>

        {success ? (
          <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Profil mis à jour.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
