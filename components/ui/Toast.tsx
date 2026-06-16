"use client";

import { useEffect, useState } from "react";

export type ToastProps = {
  message: string;
  action?: { label: string; href: string };
  duration?: number;
  onDismiss: () => void;
};

export default function Toast({ message, action, duration = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "1rem"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease, transform 0.25s ease",
        zIndex: 80,
        background: "color-mix(in srgb, var(--surface) 95%, black 5%)",
        border: "1px solid var(--border-strong)",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        whiteSpace: "nowrap",
        fontSize: "0.875rem",
      }}
    >
      <span style={{ color: "var(--foreground)" }}>{message}</span>
      {action && (
        <a
          href={action.href}
          style={{
            color: "var(--accent)",
            fontWeight: 600,
            textDecoration: "underline",
            flexShrink: 0,
          }}
        >
          {action.label}
        </a>
      )}
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        aria-label="Fermer"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          padding: "0 0.25rem",
          fontSize: "1rem",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
