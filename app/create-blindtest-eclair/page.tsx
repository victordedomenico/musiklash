import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import CreateBlindtestForm from "@/app/create-blindtest/CreateBlindtestForm";

export default function CreateFlashBlindtestPage() {
  return (
    <div className="page-shell max-w-5xl py-8 md:py-12">
      <Link
        href="/create"
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft size={15} /> Retour aux modes
      </Link>
      <section
        className="mt-5 rounded-[32px] border px-6 py-8 md:px-10"
        style={{
          borderColor: "rgba(32,223,112,0.28)",
          background:
            "radial-gradient(760px 300px at 0% 0%, rgba(32,223,112,0.15), transparent 58%), var(--surface)",
        }}
      >
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(32,223,112,0.14)", color: "#20df70" }}
          >
            <Zap size={24} />
          </span>
          <div>
            <p
              className="text-sm font-bold uppercase tracking-[0.18em]"
              style={{ color: "#20df70" }}
            >
              Nouveau mode
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
              Blindtest éclair
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted-strong)] md:text-base">
              Compose exactement 5 morceaux : un Easy, un Medium, un Hard, un Expert et un
              Impossible. Plus tu trouves vite, plus tu marques. Le jackpot : les 5 titres en
              0,1&nbsp;s.
            </p>
          </div>
        </div>
      </section>
      <div className="mt-8">
        <CreateBlindtestForm mode="solo" variant="flash" />
      </div>
    </div>
  );
}
