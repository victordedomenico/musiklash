import Link from "next/link";
import type { Metadata } from "next";
import {
  Music2,
  Play,
  Trophy,
  ChartNoAxesColumn,
  Bot,
  Users,
  User,
  Sparkles,
  Zap,
  Heart,
} from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Guide des modes de jeu",
  description:
    "Apprenez à jouer aux brackets, tierlists, blindtests openings, BattleClash, Smash or Pass et Stream Clash sur AnimeKlash.",
  path: "/guide",
});

export default function GuidePage() {
  const blocks = [
    {
      title: "Bracket",
      icon: <Trophy size={26} />,
      tone: "#f5c413",
      steps: [
        "Création : minimum 3 titres d'animé, persos, arcs ou openings/endings, puis le bracket s'ajuste à la taille valide (4, 8, 16, 32, 64 ou 128).",
        "Si la taille dépasse le nombre d'entrées, les seeds vides donnent des passes automatiques (bye).",
        "Partie en duel 1v1, sans timer : vous votez entrée par entrée jusqu'à la finale.",
        "Objectif : élire un champion unique puis partager le lien du bracket.",
      ],
    },
    {
      title: "Tierlist",
      icon: <ChartNoAxesColumn size={26} />,
      tone: "#3b82f6",
      steps: [
        "Création : de 2 à 50 titres d'animé, persos, arcs ou openings/endings.",
        "Classement par glisser-déposer sur 7 rangs fixes : S+, S, A, B, C, D, F.",
        "Les entrées non classées restent dans la zone « À placer » tant qu'elles ne sont pas déplacées.",
        "Chaque session peut être sauvegardée puis partagée via un lien de résultat.",
      ],
    },
    {
      title: "Blindtest — Solo",
      icon: <Music2 size={26} />,
      tone: "#ef4444",
      steps: [
        "Création : de 3 à 50 openings ou titres d'animé.",
        "Chaque extrait dure 30 secondes.",
        "Barème : +2 points pour le nom de l'opening/ending, +1 point pour le titre d'animé (max 3 points).",
        "Validation manuelle ou automatique à la fin du timer ; score final sauvegardé et partageable.",
      ],
    },
    {
      title: "Blindtest — Multijoueur",
      icon: <Users size={26} />,
      tone: "#fb7185",
      steps: [
        "Room multijoueur : un hôte crée la partie, puis plusieurs joueurs rejoignent (2 à N) via lien ou Explorer.",
        "Même barème que le solo (+2 opening/ending, +1 titre d'animé) et même timer (30 secondes par extrait).",
        "Chaque joueur répond sur chaque extrait ; passage synchronisé au suivant.",
        "Classement final par score (égalité possible).",
      ],
    },
    {
      title: "BattleClash — Solo libre",
      icon: <User size={26} />,
      tone: "#22d3ee",
      steps: [
        "Mode libre : enchaîne les personnages ayant une co-apparition valide avec le personnage courant.",
        "Pas d'adversaire IA : prolonge la chaîne le plus loin possible.",
        "Un personnage déjà utilisé, une co-apparition invalide ou un abandon met fin à la session.",
        "En fin de partie, export PNG puis partage ou nouvelle partie.",
      ],
    },
    {
      title: "BattleClash — Solo vs IA",
      icon: <Bot size={26} />,
      tone: "#f472b6",
      steps: [
        "Objectif : proposer un personnage qui s'est croisé avec le personnage courant dans un même animé, sans réutiliser un personnage déjà joué.",
        "Difficultés : Facile (20 s/tour + 4 options), Normal (20 s/tour), Difficile (10 s/tour).",
        "Chaque coup valide donne +1 point ; l'IA répond ensuite (+1 si coup valide).",
        "1 joker au départ ; vous pouvez en regagner 1 (max 1) si l'IA est bloquée.",
      ],
    },
    {
      title: "BattleClash — Multijoueur",
      icon: <Users size={26} />,
      tone: "#60a5fa",
      steps: [
        "Room multijoueur : l'hôte crée la partie, les joueurs rejoignent (2 à N) via lien ou Explorer.",
        "Tour par tour : 20 secondes pour jouer un personnage valide, sans réutiliser un personnage déjà passé.",
        "Chaque coup valide rapporte des points ; timeout, co-apparition invalide ou doublon pénalisent le joueur actif.",
        "Fin de partie : classement, partage, revanche et export PNG.",
      ],
    },
    {
      title: "Stream Clash — Solo",
      icon: <Zap size={26} />,
      tone: "#a855f7",
      steps: [
        "Création : de 4 à 50 animés ou personnages via le sélecteur AniList.",
        "Chaque manche oppose deux entrées : devine laquelle est la plus populaire sur AniList.",
        "Difficultés : Facile (tout écart), Normal (écart modéré), Difficile (écart serré).",
        "10 secondes par manche, +100 pts par bonne réponse. De 5 à 20 manches selon ta configuration.",
      ],
    },
    {
      title: "Smash or Pass — Solo",
      icon: <Heart size={26} />,
      tone: "#ec4899",
      steps: [
        "Création : choisis titres d'animé ou persos d'animé (5 à 100 éléments par deck).",
        "Pour chaque élément: vote Smash ou Pass — les stats communautaires globales s'affichent sur l'élément précédent.",
        "Compteurs de session en direct sur les boutons PASS et SMASH.",
        "Partage ton deck en public ou joue en mode éphémère (non publié).",
      ],
    },
    {
      title: "Smash or Pass — Multijoueur",
      icon: <Users size={26} />,
      tone: "#f472b6",
      steps: [
        "L'hôte crée une room à partir d'un deck; les joueurs rejoignent via lien ou Explorer.",
        "Tout le monde vote Smash ou Pass sur le même élément; l'hôte avance quand tous ont voté.",
        "Barres room + stats communautaires AnimeKlash à chaque révélation.",
        "Classement final par nombre de Smash et Pass en fin de partie.",
      ],
    },
    {
      title: "Stream Clash — Multijoueur",
      icon: <Users size={26} />,
      tone: "#c084fc",
      steps: [
        "Format room multijoueur: l'hôte crée la room à partir d'un Stream Clash, puis les joueurs rejoignent (2 à N) via lien ou Explorer.",
        "Même principe que le solo : deux entrées s'affrontent, chacun choisit la plus populaire en 15 secondes.",
        "Chaque bonne réponse rapporte +100 pts. L'hôte fait avancer les manches une fois que tout le monde a répondu.",
        "À la fin, classement par score (égalité possible). Revanche et mode spectateur disponibles.",
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
          Règles des modes AnimeKlash
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
