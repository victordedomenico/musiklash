import Link from "next/link";
import {
  Music2,
  Play,
  Trophy,
  ChartNoAxesColumn,
  Bot,
  Users,
  Link2,
} from "lucide-react";

export default function GuidePage() {
  const blocks = [
    {
      title: "Bracket",
      icon: <Trophy size={26} />,
      tone: "#f5c413",
      steps: [
        "Création: minimum 3 morceaux, puis le bracket est automatiquement ajusté à la plus petite taille valide (4, 8, 16, 32, 64 ou 128).",
        "Si la taille du bracket est supérieure au nombre de morceaux, les seeds vides donnent des passes automatiques (bye).",
        "Partie en duel 1v1, sans timer: vous votez morceau par morceau jusqu'à la finale.",
        "Objectif: élire un champion unique puis partager le lien du bracket.",
      ],
    },
    {
      title: "Tierlist",
      icon: <ChartNoAxesColumn size={26} />,
      tone: "#3b82f6",
      steps: [
        "Création: de 2 à 50 morceaux.",
        "Classement par glisser-déposer sur 7 rangs fixes: S+, S, A, B, C, D, F.",
        "Les morceaux non classés restent dans la zone « À placer » tant qu'ils ne sont pas déplacés.",
        "Chaque session peut être sauvegardée puis partagée via un lien de résultat.",
      ],
    },
    {
      title: "Blindtest — Solo",
      icon: <Music2 size={26} />,
      tone: "#ef4444",
      steps: [
        "Création: de 3 à 50 morceaux.",
        "Chaque morceau dure 30 secondes.",
        "Barème par morceau: +2 points pour le titre, +1 point pour l'artiste (max 3 points).",
        "La validation peut être manuelle ou automatique à la fin du timer; score final sauvegardé et partageable.",
      ],
    },
    {
      title: "Blindtest — Multijoueur",
      icon: <Users size={26} />,
      tone: "#fb7185",
      steps: [
        "Format room en 1v1: un hôte crée la partie, un invité rejoint via lien.",
        "Même barème que le solo (+2 titre, +1 artiste) et même timer (30 secondes par morceau).",
        "Les deux joueurs répondent sur chaque morceau, puis l'hôte déclenche le passage au suivant.",
        "À la fin, le score le plus élevé gagne; égalité possible en cas de score identique.",
      ],
    },
    {
      title: "BattleFeat — Solo vs IA",
      icon: <Bot size={26} />,
      tone: "#f472b6",
      steps: [
        "Objectif: proposer un artiste ayant un featuring valide avec l'artiste courant, sans jamais réutiliser un artiste déjà joué.",
        "Difficultés: Facile (20s/tour + 4 options), Normal (20s/tour), Difficile (10s/tour).",
        "Chaque coup valide donne +1 point au joueur; l'IA répond ensuite, et marque aussi +1 en cas de coup valide.",
        "Vous avez 1 joker au départ (consommable), et vous pouvez regagner 1 joker (max 1) si l'IA est bloquée.",
      ],
    },
    {
      title: "BattleFeat — Room & Libre",
      icon: <Link2 size={26} />,
      tone: "#22d3ee",
      steps: [
        "Room multijoueur: duel en alternance (20s par tour), 1 joker par joueur, perte immédiate sur timeout, artiste invalide ou déjà utilisé.",
        "Le score correspond au nombre de coups valides; victoire à l'élimination de l'adversaire.",
        "Mode Libre: solo sans timer contre soi-même, la chaîne continue jusqu'à erreur, blocage ou abandon.",
        "Le mode Libre garde la logique de validation des feats + 1 joker initial, puis enregistre la session.",
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] py-8 lg:py-10">
      <h1 className="text-5xl font-black tracking-[-0.03em]">Guide de MusiKlash</h1>
      <p className="mt-2 text-xl" style={{ color: "#8f93a0" }}>
        Règles actuelles des modes de jeu (mise à jour selon le fonctionnement réel de l&apos;app).
      </p>

      <div className="mt-10 space-y-6">
        {blocks.map((block) => (
          <section
            key={block.title}
            className="rounded-[34px] border px-6 py-7 md:px-9 md:py-8"
            style={{ borderColor: "#222a38", background: "rgba(13,16,24,0.72)" }}
          >
            <div className="mb-7 flex items-center gap-4">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-3xl border"
                style={{ borderColor: "#2a3242", color: block.tone, background: "rgba(255,255,255,0.01)" }}
              >
                {block.icon}
              </span>
              <h2 className="text-5xl font-black tracking-[-0.03em]">{block.title}</h2>
            </div>

            <ol className="grid gap-4 md:grid-cols-2">
              {block.steps.map((step, index) => (
                <li key={step} className="flex items-center gap-4">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold"
                    style={{ borderColor: "#353c48", color: "#9ca3af", background: "#1a1f2a" }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[1.5rem] leading-snug" style={{ color: "#b2b6c3" }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="pt-3">
          <Link href="/create" className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-bold" style={{ background: "#ff2f6d", color: "#fff" }}>
            <Play size={18} />
            Choisir un mode
          </Link>
        </div>
      </div>
    </div>
  );
}
