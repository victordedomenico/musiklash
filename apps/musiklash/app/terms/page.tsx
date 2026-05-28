import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation — MusiKlash" };

export default function TermsPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Conditions d&apos;utilisation</h1>
        <p style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Acceptation</h2>
            <p>
              En utilisant MusiKlash, vous acceptez les présentes conditions. Si vous n&apos;êtes pas
              d&apos;accord, veuillez ne pas utiliser la plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Accès au service</h2>
            <p>
              MusiKlash est accessible gratuitement. La création d&apos;un compte est requise pour
              créer et sauvegarder du contenu. Nous nous réservons le droit de suspendre ou de
              supprimer un compte qui violerait ces conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenu utilisateur</h2>
            <p>
              Vous êtes responsable du contenu que vous créez et publiez. Il est interdit de
              publier du contenu offensant, discriminatoire ou portant atteinte aux droits de tiers.
              Nous nous réservons le droit de supprimer tout contenu non conforme sans préavis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Propriété intellectuelle</h2>
            <p>
              Le contenu musical est fourni par l&apos;API Deezer et reste la propriété des ayants droit.
              L&apos;interface, le code et les éléments de MusiKlash sont protégés par le droit d&apos;auteur
              © 2026 MusiKlash.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Limitation de responsabilité</h2>
            <p>
              MusiKlash est fourni &quot;en l&apos;état&quot;, sans garantie d&apos;aucune sorte. Nous ne pouvons être
              tenus responsables d&apos;une interruption de service, de la disponibilité des extraits
              musicaux Deezer, ni d&apos;un quelconque préjudice résultant de l&apos;utilisation de la
              plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Modifications</h2>
            <p>
              Nous pouvons modifier ces conditions à tout moment. Les utilisateurs seront informés
              des changements significatifs par e-mail ou via la plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contact</h2>
            <p>
              Pour toute question concernant ces conditions :{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
