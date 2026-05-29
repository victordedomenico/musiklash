"use client";

/**
 * Minimal global error boundary. Provides its own <html>/<body> (it replaces
 * the root layout when the root layout itself throws). Pure client component —
 * no server APIs — so it prerenders cleanly. Without an explicit file, Next 16
 * prerenders a default /_global-error that intermittently throws
 * "Expected workStore to be initialized" during static export.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a12",
          color: "white",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          Une erreur est survenue
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
          {error?.digest ? `Référence : ${error.digest}` : "Réessaie dans un instant."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
