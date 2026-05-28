import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exercer mes droits RGPD — MusiKlash" };

const CONTACT_EMAIL = "contact@musiklash.com";

function buildMailto(subject: string) {
  const body = [
    "Bonjour,",
    "",
    "Je souhaite exercer mon droit RGPD suivant :",
    "- [ ] Acces",
    "- [ ] Rectification",
    "- [ ] Effacement",
    "- [ ] Limitation",
    "- [ ] Opposition",
    "- [ ] Portabilite",
    "",
    "Mon identifiant de compte (email) :",
    "",
    "Precision de ma demande :",
    "",
    "Merci.",
  ].join("\n");

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function PrivacyRightsPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Exercer mes droits RGPD</h1>
        <p style={{ color: "var(--muted)" }}>
          Cette page vous permet de demander l&apos;acces, la correction, l&apos;effacement ou l&apos;export de
          vos donnees personnelles.
        </p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Vos droits
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Droit d&apos;acces et de rectification.</li>
              <li>Droit a l&apos;effacement (droit a l&apos;oubli).</li>
              <li>Droit a la limitation et a l&apos;opposition.</li>
              <li>Droit a la portabilite des donnees (si applicable).</li>
              <li>Droit de retirer votre consentement cookies a tout moment.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Demande par e-mail
            </h2>
            <p>
              Vous pouvez envoyer votre demande a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }} className="hover:underline">
                {CONTACT_EMAIL}
              </a>
              . Pour accelerer le traitement, utilisez le modele pre-rempli ci-dessous.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <a href={buildMailto("Demande RGPD - MusiKlash")} className="btn-primary">
                Ouvrir un e-mail pre-rempli
              </a>
              <a href="/cookies" className="btn-ghost">
                Modifier mes cookies
              </a>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Delais de traitement
            </h2>
            <p>
              Nous accusons reception de votre demande et repondons dans un delai maximum d&apos;un mois,
              conformement au RGPD. Une verification d&apos;identite peut etre demandee pour proteger vos
              donnees.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Recours
            </h2>
            <p>
              En cas de desaccord, vous pouvez egalement saisir la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
                className="hover:underline"
              >
                CNIL
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
