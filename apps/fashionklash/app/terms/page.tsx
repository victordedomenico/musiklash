import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation — BookKlash" };

export default function TermsPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Conditions d&apos;utilisation</h1>
        <p style={{ color: "var(--muted)" }}>Dernière mise à jour : mai 2026</p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Acceptation</h2>
            <p>
              En utilisant BookKlash, vous acceptez les présentes conditions. Si vous n&apos;êtes pas
              d&apos;accord, veuillez ne pas utiliser la plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Accès au service</h2>
            <p>
              BookKlash est accessible gratuitement. La création d&apos;un compte peut être requise pour
              créer et sauvegarder du contenu. Nous nous réservons le droit de suspendre ou de
              supprimer un compte qui violerait ces conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Propriété intellectuelle</h2>
            <p>
              Les couvertures et métadonnées proviennent d&apos;Open Library et Google Books et restent la
              propriété de leurs ayants droit. BookKlash n&apos;héberge aucun fichier numérique de livre.
              L&apos;interface et le code sont protégés par le droit d&apos;auteur © 2026 BookKlash.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contact</h2>
            <p>
              Pour toute question :{" "}
              <a href="mailto:contact@bookklash.app" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@bookklash.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
