import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Questions fréquentes sur AnimeKlash : gratuité, compte, AniList, brackets, tierlists, blindtests openings et BattleClash.",
  path: "/faq",
});

const FAQS = [
	{
		q: "AnimeKlash est-il gratuit ?",
		a: "Oui, entièrement. Vous pouvez jouer, créer et partager des brackets sans créer de compte ni payer quoi que ce soit.",
	},
	{
		q: "Dois-je créer un compte pour jouer ?",
		a: "Non. Vous pouvez jouer à n'importe quel contenu public sans inscription. Un compte est nécessaire pour créer, sauvegarder et gérer votre bibliothèque.",
	},
	{
		q: "D'où viennent les animés, personnages et openings ?",
		a: "Les fiches animé et personnages proviennent d'AniList. Les extraits d'openings/endings sont fournis par AnimeThemes.moe. AnimeKlash n'héberge pas les fichiers audio ni les images des œuvres tierces.",
	},
	{
		q: "Combien d'entrées peut-on mettre dans un bracket ?",
		a: "De 4 à 32 animés ou personnages. Les formats disponibles sont 4, 8, 16 et 32. Chaque format suit une structure à élimination directe.",
	},
	{
		q: "Puis-je rendre mon contenu privé ?",
		a: "Oui. Lors de la création, vous choisissez la visibilité : public (visible dans Explorer) ou privé (accessible uniquement via le lien direct).",
	},
	{
		q: "Qu'est-ce que BattleClash ?",
		a: "BattleClash est un jeu de chaîne de co-apparitions : à partir d'un personnage, vous enchaînez d'autres personnages qui sont apparus dans les mêmes animés. Jouez en solo libre, contre l'IA ou en multijoueur.",
	},
	{
		q: "Un animé ou un personnage n'est pas disponible. Pourquoi ?",
		a: "Le catalogue dépend d'AniList. Certains titres peuvent manquer ou avoir un nom différent. Essayez le titre romaji, le titre anglais ou le nom du personnage tel qu'il apparaît sur AniList.",
	},
	{
		q: "Comment signaler un problème ou contacter l'équipe ?",
		a: "Envoyez un e-mail à contact@animeklash.com. Nous répondons généralement sous 48 heures.",
	},
];

export default function FaqPage() {
	return (
		<>
			<JsonLd
				data={{
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: FAQS.map((item) => ({
						"@type": "Question",
						name: item.q,
						acceptedAnswer: {
							"@type": "Answer",
							text: item.a,
						},
					})),
				}}
			/>
			<div className="refit-doc-page">
			<div className="mx-auto max-w-3xl px-4 py-12">
				<h1 className="text-4xl font-black mb-2">FAQ</h1>
				<p style={{ color: "var(--muted)" }}>Les questions les plus fréquentes.</p>

				<div className="mt-10 space-y-1">
					{FAQS.map((item, i) => (
						<details
							key={i}
							className="group rounded-xl px-5 py-4"
							style={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
							}}
						>
							<summary
								className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold"
								style={{ fontSize: "0.9375rem" }}
							>
								{item.q}
								<span
									className="shrink-0 text-xl leading-none transition-transform duration-200 group-open:rotate-45"
									style={{ color: "var(--muted)" }}
								>
									+
								</span>
							</summary>
							<p
								className="mt-3 text-sm leading-relaxed"
								style={{ color: "var(--muted-strong)" }}
							>
								{item.a}
							</p>
						</details>
					))}
				</div>

				<p className="mt-10 text-sm" style={{ color: "var(--muted)" }}>
					Vous ne trouvez pas la réponse ?{" "}
					<a
						href="mailto:contact@animeklash.com"
						style={{ color: "var(--accent)" }}
						className="hover:underline"
					>
						Contactez-nous
					</a>
					.
				</p>
			</div>
			</div>
		</>
	);
}
