"use client";

/**
 * Last-resort boundary: catches errors thrown in the root layout itself, so it
 * must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f1f5f9",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>The application failed to load</h1>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>
            Please try again. If the problem persists, contact your administrator
            {error.digest ? ` and quote reference ${error.digest}` : ""}.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
