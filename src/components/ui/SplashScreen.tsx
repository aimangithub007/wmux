import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * SplashScreen — shown briefly while app loads registry + layout.
 * Auto-dismisses after 800ms or when onDone is called.
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 600);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 900);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.3s ease",
        pointerEvents: "none",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "linear-gradient(135deg, #1a3a5c 0%, #0d1c2d 100%)",
          border: "1px solid #1f3a5c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          boxShadow: "0 0 32px #58a6ff30",
        }}
      >
        ⊞
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#e6edf3", letterSpacing: "0.02em" }}>
        tiled workspace
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#58a6ff",
              opacity: 0.5,
              animation: `splash-dot 1s ease ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
