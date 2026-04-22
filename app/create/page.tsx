import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import CreateHub from "@/components/CreateHub";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `${t.nav.create} — MusiKlash`,
    description: t.nav.createPageSubtitle,
  };
}

export default async function CreatePage() {
  const { t } = await getI18n();
  const n = t.nav;

  return (
    <div className="page-shell py-6 md:py-10">
      <section
        className="relative overflow-hidden rounded-[36px] border px-6 py-10 text-center md:px-12 md:py-14"
        style={{
          borderColor: "var(--border-strong)",
          background: "var(--surface)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 380px at 50% 0%, rgba(239,68,68,0.18) 0%, rgba(255,59,116,0.08) 42%, transparent 70%)",
          }}
        />
        <div className="relative">
          <h1
            className="font-black tracking-[-0.04em]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", color: "var(--foreground)" }}
          >
            {n.create}
          </h1>
          <p
            className="mx-auto mt-4 max-w-xl text-lg leading-relaxed md:text-2xl"
            style={{ color: "var(--muted-strong)" }}
          >
            {n.createPageSubtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto mt-8 w-full max-w-5xl">
        <CreateHub
          labels={{
            chooseMode: n.chooseMode,
            back: n.back,
            bracket: n.createBracket,
            bracketDesc: n.createBracketDesc,
            tierlist: n.createTierlist,
            tierlistDesc: n.createTierlistDesc,
            blindtest: n.createBlindtest,
            blindtestDesc: n.createBlindtestDesc,
            battleFeat: n.battleFeat,
            battleFeatDesc: n.createBattleFeatDesc,
            modeSolo: n.modeSolo,
            modeSoloDesc: n.modeSoloDesc,
            modeSoloAi: n.modeSoloAi,
            modeSoloAiDesc: n.modeSoloAiDesc,
            modeMulti: n.modeMulti,
            modeMultiDesc: n.modeMultiDesc,
          }}
        />
      </div>
    </div>
  );
}
