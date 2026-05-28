import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — AnimeKlash" };

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
              AnimeKlash est édité par une structure indépendante.<br />
              Contact : <a href="mailto:contact@animeklash.com" style={{ color: "var(--accent)" }} className="hover:underline">contact@animeklash.com</a>
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
              <a href="mailto:contact@animeklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@animeklash.com
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
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Contenus tiers</h2>
            <p>
              Les métadonnées proviennent d&apos;<strong>AniList</strong> ; les extraits d&apos;openings et
              d&apos;endings sont fournis par <strong>AnimeThemes.moe</strong>. AnimeKlash n&apos;héberge
              aucun fichier audio ni les visuels des œuvres. Tous les droits restent la propriété de leurs
              ayants droit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (design, code, textes, logo) est protégé par le droit
              d&apos;auteur © 2026 AnimeKlash. Toute reproduction sans autorisation est strictement
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
