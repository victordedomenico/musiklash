import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — FightKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        FightKlash est édité par une structure indépendante. Les données MMA proviennent de{" "}
        <a href="https://api-sports.io/documentation/mma/v1" target="_blank" rel="noreferrer">
          API-Sports MMA
        </a>{" "}
        et, en complément, de{" "}
        <a href="https://www.mediawiki.org/wiki/API:Main_page" target="_blank" rel="noreferrer">
          Wikipedia
        </a>
        . FightKlash n&apos;héberge aucun flux vidéo ni retransmission de combat.
      </p>
      <p>
        Utilisation de l&apos;API API-Sports conformément aux{" "}
        <a href="https://api-sports.io/terms" target="_blank" rel="noreferrer">
          conditions API-Sports
        </a>
        .
      </p>
    </div>
  );
}
