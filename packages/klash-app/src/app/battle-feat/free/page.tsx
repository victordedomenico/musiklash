import type { Metadata } from "next";
import { Link2, User } from "lucide-react";
import BattleFeatFree from "./BattleFeatFree";

export const metadata: Metadata = { title: "BattleFeat Solo — MusiKlash" };

export default function BattleFeatFreePage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] py-6">
      <div className="mb-7 text-center">
        <p
          className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]"
          style={{
            color: "var(--accent)",
            borderColor: "var(--accent-dim)",
            background: "var(--accent-dim)",
          }}
        >
          <User size={12} />
          Mode solo libre
        </p>
        <h1 className="mt-3 text-7xl font-black tracking-[-0.04em]">
          BattleFeat
        </h1>
        <p
          className="mx-auto mt-2 max-w-3xl text-3xl"
          style={{ color: "var(--muted-strong)" }}
        >
          Enchaîne les featurings sans limite de temps. Jusqu&apos;où peux-tu
          aller ?
        </p>
      </div>

      <BattleFeatFree />

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <article
          className="rounded-[26px] border p-5"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface)",
          }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
            <User size={18} />
            Comment jouer ?
          </h2>
          <p className="text-lg" style={{ color: "var(--muted-strong)" }}>
            Choisis un artiste de départ, puis enchaîne les artistes qui ont
            collaboré ensemble. Pas de timer, pas de pression — juste la
            musique.
          </p>
        </article>
        <article
          className="rounded-[26px] border p-5"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface)",
          }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
            <Link2 size={18} />
            Règle d&apos;or
          </h2>
          <p className="text-lg" style={{ color: "var(--muted-strong)" }}>
            Chaque artiste doit avoir un featuring officiel avec le précédent.
            Un artiste ne peut pas apparaître deux fois dans la même chaîne.
          </p>
        </article>
      </div>
    </div>
  );
}
