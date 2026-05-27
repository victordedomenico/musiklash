import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Questions fréquentes sur MusiKlash : gratuité, compte, extraits Deezer, brackets, tierlists, blindtests et BattleFeat.",
  path: "/faq",
});

const FAQS = [
	{
		q: "MusiKlash est-il gratuit ?",
		a: "Oui, entièrement. Vous pouvez jouer, créer et partager des brackets sans créer de compte ni payer quoi que ce soit.",
	},
	{
		q: "Dois-je créer un compte pour jouer ?",
		a: "Non. Vous pouvez jouer à n'importe quel bracket public sans inscription. Un compte est nécessaire uniquement pour créer et sauvegarder vos propres brackets.",
	},
	{
		q: "D'où viennent les extraits musicaux ?",
		a: "Les extraits de 30 secondes proviennent de l'API Deezer. MusiKlash n'héberge aucun fichier audio.",
	},
	{
		q: "Combien de morceaux peut-on mettre dans un bracket ?",
		a: "De 4 à 32 morceaux. Les formats disponibles sont 4, 8, 16 et 32 pistes. Chaque format suit une structure à élimination directe.",
	},
	{
		q: "Puis-je rendre mon bracket privé ?",
		a: "Oui. Lors de la création, vous choisissez la visibilité : public (apparaît dans Explorer) ou privé (accessible uniquement via le lien direct).",
	},
	{
		q: "Qu'est-ce que BattleFeat ?",
		a: "BattleFeat est un mini-jeu de chaîne de featurings. Le principe : partir d'un artiste et enchaîner des collaborations connues. Jouez seul contre l'IA ou en duel multijoueur.",
	},
	{
		q: "Un artiste ou un morceau n'est pas disponible. Pourquoi ?",
		a: "Le catalogue dépend de ce que Deezer indexe. Certains artistes ou titres peuvent ne pas être disponibles à la recherche. Essayez différentes orthographes ou recherchez via l'album.",
	},
	{
		q: "Comment signaler un problème ou contacter l'équipe ?",
		a: "Envoyez un e-mail à contact@musiklash.com. Nous répondons généralement sous 48 heures.",
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
						href="mailto:contact@musiklash.com"
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
