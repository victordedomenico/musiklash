import type { Metadata } from "next";

export const metadata: Metadata = { title: "Droits d'auteur — MusiKlash" };

export default function CopyrightPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Droits d&apos;auteur</h1>
        <p style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenu musical</h2>
            <p>
              MusiKlash n&apos;héberge aucun fichier audio. Les extraits musicaux (30 secondes)
              sont fournis directement par l&apos;<strong>API Deezer</strong> via des URL de streaming
              temporaires. Les œuvres musicales restent la propriété exclusive de leurs ayants droit
              respectifs (artistes, labels, éditeurs).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenu de la plateforme</h2>
            <p>
              Le code source, le design, les textes et les éléments graphiques de MusiKlash sont
              protégés par le droit d&apos;auteur © 2026 MusiKlash. Toute reproduction, même partielle,
              est interdite sans autorisation écrite préalable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenu généré par les utilisateurs</h2>
            <p>
              Les brackets, tierlists et blindtests créés par les utilisateurs leur appartiennent.
              En les rendant publics, ils accordent à MusiKlash une licence non exclusive d&apos;affichage
              sur la plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Signalement</h2>
            <p>
              Si vous estimez que du contenu sur MusiKlash porte atteinte à vos droits, contactez-nous
              à{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
              . Nous traiterons votre demande dans les meilleurs délais.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
