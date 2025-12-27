"use client";

import { useState, useEffect } from "react";


export default function GeneratePage() {
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [mcqCount, setMcqCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  


useEffect(() => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    setDarkMode(true);
  }
}, []);

  const handleGenerate = async () => {
    if (!file) {
      alert("Please upload a PDF first");
      return;
    }
    setProgress(0);
    setLoading(true);
    setDownloadReady(false);
    let progressValue = 0;

const progressInterval = setInterval(() => {
  progressValue += Math.random() * 8; // smooth random increments
  if (progressValue >= 90) {
    progressValue = 90; // cap until backend finishes
    clearInterval(progressInterval);
  }
  setProgress(Math.floor(progressValue));
}, 500);

    
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("mcqCount", mcqCount.toString());

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
 
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        setDownloadReady(true);
        setDownloadUrl(data.downloadUrl);
      } else {
        alert("Backend returned an error");
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      alert("Failed to send PDF to backend");
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? "#0f172a" : "#f4f6f8";
  const cardBg = darkMode ? "#020617" : "#ffffff";
  const textColor = darkMode ? "#ffffff" : "#000000";
  const muted = darkMode ? "#cbd5f5" : "#555";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: bg,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          backgroundColor: cardBg,
          padding: "30px",
          borderRadius: "10px",
          boxShadow: darkMode
            ? "0 10px 40px rgba(0,0,0,0.7)"
            : "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        {/* Dark mode toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
           onClick={() => {
  const newMode = !darkMode;
  setDarkMode(newMode);
  localStorage.setItem("theme", newMode ? "dark" : "light");
}}

            style={{
              background: "none",
              border: "1px solid",
              borderColor: muted,
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

        {/* Header */}
        <h1
          style={{
            marginBottom: "10px",
            fontWeight: 700,
            color: textColor,
            textAlign: "center",
          }}
        >
          MCQ Generator
        </h1>

        <p
          style={{
            textAlign: "center",
            color: muted,
            marginBottom: "30px",
          }}
        >
          Upload a PDF and automatically generate multiple-choice questions.
        </p>

        {/* PDF Upload */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: 600, color: textColor, display: "block" }}>
            Upload PDF
          </label>

          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{
              marginTop: "8px",
              width: "100%",
              color: textColor,
            }}
          />
        </div>

        {/* MCQ Count */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: 600, color: textColor, display: "block" }}>
            Number of MCQs
          </label>

          <input
            type="number"
            min={1}
            max={30}
            value={mcqCount}
            onChange={(e) => setMcqCount(Number(e.target.value))}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              backgroundColor: darkMode ? "#020617" : "#fff",
              color: textColor,
            }}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#555" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Generating..." : "Generate MCQs"}
        </button>
        {loading && (
  <div style={{ marginTop: "20px" }}>
    <div
      style={{
        height: "10px",
        width: "100%",
        backgroundColor: "#e5e7eb",
        borderRadius: "5px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "#2563eb",
          transition: "width 0.4s ease",
        }}
      />
    </div>

    <p
      style={{
        marginTop: "8px",
        textAlign: "center",
        fontSize: "14px",
        color: darkMode ? "#cbd5f5" : "#555",
      }}
    >
      Processing PDF… {progress}%
    </p>
  </div>
)}


        {/* Processing */}
        {loading && (
          <p
            style={{
              marginTop: "20px",
              textAlign: "center",
              fontWeight: 600,
              color: muted,
            }}
          >
            Processing PDF and generating MCQs...
          </p>
        )}

        {/* Download Section */}
        {downloadReady && downloadUrl && (
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <p style={{ color: "#22c55e", fontWeight: 600 }}>
              MCQs generated successfully!
            </p>

            <button
              onClick={() => window.open(downloadUrl, "_blank")}
              style={{
                marginTop: "10px",
                padding: "10px 20px",
                backgroundColor: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Download MCQs PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
