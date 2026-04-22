import Link from "next/link";
import {
  Music2,
  Play,
  Trophy,
  ChartNoAxesColumn,
  Bot,
  Users,
  User,
  Sparkles,
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
        "Format room multijoueur: un hôte crée la partie, puis plusieurs joueurs peuvent rejoindre (2 à N) via lien ou Explorer selon la visibilité.",
        "Même barème que le solo (+2 titre, +1 artiste) et même timer (30 secondes par morceau).",
        "Chaque joueur répond sur chaque morceau; le passage au morceau suivant est synchronisé pour toute la room.",
        "À la fin, le classement se fait au score (égalité possible si score identique).",
      ],
    },
    {
      title: "BattleFeat — Solo",
      icon: <User size={26} />,
      tone: "#22d3ee",
      steps: [
        "Mode libre en solo: tu enchaînes les artistes ayant un feat valide avec l'artiste courant.",
        "Pas d'adversaire IA: le but est de prolonger la chaîne le plus loin possible.",
        "Un artiste déjà utilisé, un feat invalide ou un abandon met fin à la session.",
        "En fin de partie, tu peux enregistrer le résultat en PNG puis partager ou recommencer.",
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
      title: "BattleFeat — Multijoueur",
      icon: <Users size={26} />,
      tone: "#60a5fa",
      steps: [
        "Format room multijoueur: l'hôte crée la room, puis plusieurs joueurs rejoignent (2 à N) via lien ou Explorer si room publique.",
        "Tour par tour en temps réel: 20 secondes pour jouer un artiste valide, sans réutiliser un artiste déjà passé.",
        "Chaque coup valide rapporte des points; un timeout, un feat invalide ou un artiste déjà utilisé pénalise le joueur actif.",
        "À la fin, la room affiche le résultat final avec classement, partage, rejouer et export PNG.",
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1120px] py-8 lg:py-10">
      <div
        className="rounded-3xl border px-6 py-6 md:px-8 md:py-7"
        style={{ borderColor: "#222a38", background: "linear-gradient(180deg, rgba(13,16,24,0.9) 0%, rgba(13,16,24,0.72) 100%)" }}
      >
        <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "#2a3242", color: "#aab1c3" }}>
          <Sparkles size={13} />
          Guide rapide
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.02em] sm:text-4xl lg:text-5xl">
          Règles des modes MusiKlash
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: "#9aa1b4" }}>
          Version lisible et concise des règles: création, déroulé de partie, scoring et fin de session.
        </p>
      </div>

      <div className="mt-8 space-y-4 sm:space-y-5">
        {blocks.map((block) => (
          <section
            key={block.title}
            className="rounded-2xl border px-5 py-5 md:px-6 md:py-6"
            style={{ borderColor: "#222a38", background: "rgba(13,16,24,0.72)" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ borderColor: "#2a3242", color: block.tone, background: "rgba(255,255,255,0.01)" }}
              >
                {block.icon}
              </span>
              <h2 className="text-xl font-black tracking-[-0.01em] sm:text-2xl">{block.title}</h2>
            </div>

            <ol className="space-y-2.5">
              {block.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "#2a3242", background: "#121723" }}>
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                    style={{ borderColor: "#353c48", color: "#9ca3af", background: "#1a1f2a" }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed sm:text-[15px]" style={{ color: "#b2b6c3" }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="pt-2">
          <Link href="/create" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold sm:text-base" style={{ background: "#ff2f6d", color: "#fff" }}>
            <Play size={18} />
            Choisir un mode
          </Link>
        </div>
      </div>
    </div>
  );
}
