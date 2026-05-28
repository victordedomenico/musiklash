import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — MusiKlash" };

export default function LegalPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Mentions légales</h1>
        <p style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Éditeur</h2>
            <p>
              MusiKlash est édité par une structure indépendante.<br />
              Contact : <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">contact@musiklash.com</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Hébergement</h2>
            <p>
              La plateforme est hébergée par <strong>Vercel Inc.</strong>, 340 Pine Street, Suite 701,
              San Francisco, CA 94104, États-Unis — <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }} className="hover:underline">vercel.com</a>.
            </p>
            <p>
              La base de données est gérée par <strong>Supabase Inc.</strong> — <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }} className="hover:underline">supabase.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Données personnelles</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
              d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Pour exercer
              ces droits ou pour toute question relative à la vie privée, adressez votre demande à{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
              .
            </p>
            <p>
              Un parcours dedie est disponible sur{" "}
              <a href="/privacy-rights" style={{ color: "var(--accent)" }} className="hover:underline">
                Exercer mes droits RGPD
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenu musical</h2>
            <p>
              Les extraits musicaux sont fournis par l&apos;<strong>API Deezer</strong> (Deezer SA, 24 rue
              de Calais, 75009 Paris). MusiKlash n&apos;héberge aucun fichier audio. Les droits sur les
              œuvres musicales appartiennent à leurs titulaires respectifs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (design, code, textes, logo) est protégé par le droit
              d&apos;auteur © 2026 MusiKlash. Toute reproduction sans autorisation est strictement
              interdite.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Droit applicable</h2>
            <p>
              Les présentes mentions légales sont soumises au droit français. En cas de litige,
              les tribunaux français seront seuls compétents.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
