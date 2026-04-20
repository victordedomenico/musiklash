import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité — MusiKlash" };

export default function PrivacyPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Politique de confidentialité</h1>
        <p style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="mt-10 space-y-8" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Données collectées</h2>
            <p>
              Lors de la création d&apos;un compte, nous collectons uniquement votre adresse e-mail et un
              mot de passe (stocké sous forme hashée). Aucune donnée de paiement n&apos;est collectée —
              MusiKlash est entièrement gratuit.
            </p>
            <p>
              Les brackets, tierlists et blindtests que vous créez sont stockés dans notre base de
              données et associés à votre compte.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Utilisation des données</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Vous authentifier sur la plateforme.</li>
              <li>Sauvegarder et afficher vos créations.</li>
              <li>Vous permettre de gérer votre bibliothèque.</li>
            </ul>
            <p>Nous ne vendons, ne louons et ne partageons pas vos données avec des tiers à des fins commerciales.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Cookies</h2>
            <p>
              MusiKlash utilise des cookies techniques indispensables au fonctionnement de la
              plateforme (session d&apos;authentification, préférences de langue et de thème). Aucun
              cookie publicitaire ou de traçage tiers n&apos;est utilisé.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Services tiers</h2>
            <p>
              Les extraits musicaux proviennent de <strong>l&apos;API Deezer</strong>. Lors de la lecture
              d&apos;un extrait, votre navigateur peut établir une connexion directe avec les serveurs Deezer.
              Consultez la{" "}
              <a href="https://www.deezer.com/legal/personal-datas" target="_blank" rel="noreferrer"
                style={{ color: "var(--accent)" }} className="hover:underline">
                politique de confidentialité de Deezer
              </a>
              {" "}pour plus d&apos;informations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de
              suppression de vos données. Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
