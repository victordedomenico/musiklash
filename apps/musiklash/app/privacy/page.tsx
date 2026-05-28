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
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Responsable du traitement
            </h2>
            <p>
              Le responsable du traitement est MusiKlash. Pour toute question relative aux donnees
              personnelles :{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Donnees traitees
            </h2>
            <p>
              Selon votre utilisation, nous traitons notamment : e-mail de compte, identifiant utilisateur,
              pseudo, donnees de session/authentification, contenus crees (brackets, tierlists, blindtests,
              scores), preferences (theme/langue), journal de consentement cookies (choix + date), et
              donnees techniques strictement necessaires au fonctionnement du service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Finalites et bases legales
            </h2>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <table className="min-w-full text-sm">
                <thead style={{ background: "var(--surface-2)" }}>
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Finalite</th>
                    <th className="px-4 py-3 font-semibold">Base legale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">Creation de compte et authentification</td>
                    <td className="px-4 py-3">Execution du contrat</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">Sauvegarde de vos contenus et progression</td>
                    <td className="px-4 py-3">Execution du contrat</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">Securite, prevention de fraude, integrite technique</td>
                    <td className="px-4 py-3">Interet legitime</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">Memorisation des preferences (theme/langue)</td>
                    <td className="px-4 py-3">Consentement</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">Mesure d&apos;audience (Vercel Analytics)</td>
                    <td className="px-4 py-3">Consentement</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Cookies</h2>
            <p>
              MusiKlash utilise des cookies essentiels (authentification, session, consentement, mode
              invite), des cookies de preferences (theme, langue) et, uniquement avec votre consentement,
              des cookies analytiques via Vercel Analytics.
            </p>
            <p>
              Vous pouvez modifier votre choix a tout moment depuis{" "}
              <a href="/cookies" style={{ color: "var(--accent)" }} className="hover:underline">
                la page de gestion des cookies
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Destinataires et sous-traitants
            </h2>
            <p>
              Vos donnees peuvent etre traitees par des sous-traitants techniques strictement necessaires :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase (authentification et base de donnees).</li>
              <li>Vercel (hebergement et mesure d&apos;audience, si consentement).</li>
              <li>Deezer (fourniture de contenus musicaux et previsualisations).</li>
            </ul>
            <p>
              Nous ne vendons pas vos donnees personnelles et nous ne les partageons pas a des fins
              publicitaires.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Transferts hors Union europeenne
            </h2>
            <p>
              Certains prestataires peuvent traiter des donnees hors UE. Dans ce cas, les transferts sont
              encadres par des garanties appropriees, notamment des clauses contractuelles types de la
              Commission europeenne (SCC) et les mecanismes contractuels proposes par nos sous-traitants.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Durees de conservation
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Compte et contenus : jusqu&apos;a suppression du compte ou demande d&apos;effacement.</li>
              <li>Cookies de consentement/preferences/invite : 12 mois maximum.</li>
              <li>Donnees analytiques : selon la configuration de retention de Vercel Analytics.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Droits des personnes
            </h2>
            <p>Conformement au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acces a vos donnees personnelles.</li>
              <li>Rectification des donnees inexactes.</li>
              <li>Effacement (droit a l&apos;oubli), sous reserve des obligations legales.</li>
              <li>Limitation du traitement dans certains cas.</li>
              <li>Opposition au traitement fonde sur l&apos;interet legitime.</li>
              <li>Portabilite des donnees lorsque applicable.</li>
              <li>Retrait du consentement a tout moment (sans effet retroactif).</li>
            </ul>
            <p>
              Pour exercer vos droits, utilisez{" "}
              <a href="/privacy-rights" style={{ color: "var(--accent)" }} className="hover:underline">
                notre page dediee
              </a>
              {" "}ou ecrivez a{" "}
              <a href="mailto:contact@musiklash.com" style={{ color: "var(--accent)" }} className="hover:underline">
                contact@musiklash.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Reclamation aupres de la CNIL
            </h2>
            <p>
              Si vous estimez, apres nous avoir contactes, que vos droits ne sont pas respectes, vous
              pouvez adresser une reclamation a la{" "}
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

          <section className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Services tiers
            </h2>
            <p>
              Les extraits musicaux proviennent de <strong>l&apos;API Deezer</strong>. Lors de la lecture
              d&apos;un extrait, votre navigateur peut etablir une connexion directe avec les serveurs Deezer.
              Consultez leur{" "}
              <a
                href="https://www.deezer.com/legal/personal-datas"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
                className="hover:underline"
              >
                politique de confidentialite
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
