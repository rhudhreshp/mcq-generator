"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  // Colors based on theme
  const bg = darkMode ? "#0f172a" : "#f4f6f8";
  const cardBg = darkMode ? "#020617" : "#ffffff";
  const textColor = darkMode ? "#ffffff" : "#000000";
  const muted = darkMode ? "#cbd5f5" : "#555";

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bg,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          padding: "40px",
          borderRadius: "12px",
          backgroundColor: cardBg,
          boxShadow: darkMode
            ? "0 10px 40px rgba(0,0,0,0.7)"
            : "0 10px 30px rgba(0,0,0,0.1)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Dark / Light Toggle */}
        <div style={{ position: "absolute", top: "20px", right: "20px" }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "none",
              border: `1px solid ${muted}`,
              color: textColor,
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "12px",
            color: textColor,
          }}
        >
          MCQ Generator
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "16px",
            color: muted,
            marginBottom: "30px",
          }}
        >
          Upload a PDF and automatically generate high-quality multiple-choice
          questions using AI.
        </p>

        {/* CTA */}
        <Link href="/mcqgen">
          <button
            style={{
              padding: "12px 28px",
              fontSize: "16px",
              fontWeight: 600,
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Go to MCQ Generator
          </button>
        </Link>
      </div>
    </main>
  );
}
