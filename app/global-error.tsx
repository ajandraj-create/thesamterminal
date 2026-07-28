"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0B0B0F", color: "#f5f5f5", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ color: "#22E565", fontFamily: "monospace", fontSize: 13 }}>TheSamTerminal</p>
          <h1 style={{ fontSize: 22, marginTop: 8 }}>Something went wrong</h1>
          <p style={{ color: "#7A7A82", fontSize: 14, marginTop: 8 }}>The app encountered an unexpected error.</p>
          <button onClick={reset} style={{ marginTop: 20, padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(34,229,101,0.4)", background: "rgba(34,229,101,0.1)", color: "#22E565", cursor: "pointer", fontWeight: 600 }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
