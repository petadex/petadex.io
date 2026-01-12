import React, { useState, useEffect, useMemo } from "react";
import { Link } from "gatsby";
import Protein3DMolViewer from "./Protein3DMolViewer";

const FeaturedPETases = ({ sequences, loading }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Hard-coded featured PETases
  const ISPETASE_ACCESSION = "WP_054022242.1";
  const FASTPETASE_ACCESSION = "WP_054022242.1_M1";

  // Find the hard-coded sequences
  const isPETase = sequences.find(seq => seq.accession === ISPETASE_ACCESSION);
  const fastPETase = sequences.find(seq => seq.accession === FASTPETASE_ACCESSION);

  // Select random PETase that meets criteria:
  // - in_gene_metadata === true
  // - in_sra_metadata === true
  // - not one of the two hard-coded ones
  const randomPETase = useMemo(() => {
    const eligible = sequences.filter(seq =>
      seq.in_gene_metadata === true &&
      seq.in_sra_metadata === true &&
      seq.accession !== ISPETASE_ACCESSION &&
      seq.accession !== FASTPETASE_ACCESSION
    );

    if (eligible.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * eligible.length);
    return eligible[randomIndex];
  }, [sequences]);

  // Create slides array
  const slides = [
    { seq: isPETase, label: "IsPETase", badgeColor: "#3b82f6" },
    { seq: fastPETase, label: "Fast-PETase", badgeColor: "#10b981" },
    { seq: randomPETase, label: "Featured PETase", badgeColor: "#f59e0b" }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || loading) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, loading, slides.length]);

  // Helper to get display name (synonym or accession)
  const getDisplayName = (seq, fallbackLabel) => {
    if (!seq) return fallbackLabel;

    // If synonyms exist and is an array with at least one item
    if (seq.synonyms && Array.isArray(seq.synonyms) && seq.synonyms.length > 0) {
      return seq.synonyms[0];
    }

    return fallbackLabel;
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  // Render a single card
  const renderCard = (slideData) => {
    const { seq, label, badgeColor } = slideData;

    if (!seq) {
      return (
        <div style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "2rem",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px"
        }}>
          <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
            {loading ? "Loading..." : "Not found"}
          </p>
        </div>
      );
    }

    return (
      <Link
        to={`/sequence/${seq.accession}`}
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          border: "2px solid #e2e8f0",
          borderRadius: "12px",
          padding: "2rem",
          backgroundColor: "white",
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "all 0.3s",
          boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
          minHeight: "300px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
          e.currentTarget.style.borderColor = badgeColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.08)";
          e.currentTarget.style.borderColor = "#e2e8f0";
        }}
      >
        {/* Badge */}
        <div style={{
          backgroundColor: badgeColor,
          color: "white",
          padding: "0.4rem 1rem",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: "600",
          marginBottom: "1rem",
          letterSpacing: "0.5px"
        }}>
          {label}
        </div>

        {/* 3D Protein Viewer */}
        <div style={{
          marginBottom: "1.25rem"
        }}>
          <Protein3DMolViewer
            accession={seq.accession}
            width="120px"
            height="120px"
            backgroundColor="#ffffff"
          />
        </div>

        {/* Name/Label */}
        <h3 style={{
          fontSize: "1.3rem",
          fontWeight: "600",
          color: "#2c3e50",
          margin: "0 0 0.5rem 0",
          textAlign: "center"
        }}>
          {getDisplayName(seq, label)}
        </h3>

        {/* Accession */}
        <p style={{
          fontSize: "0.85rem",
          color: "#64748b",
          margin: "0",
          fontFamily: "monospace"
        }}>
          {seq.accession}
        </p>
      </Link>
    );
  };

  if (loading) {
    return (
      <section style={{
        marginBottom: "0.1rem",
        paddingTop: "0.1rem",
        paddingBottom: "1.25rem",
        paddingLeft: "1.25rem",
        paddingRight: "1.25rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px"
      }}>
        <h2 style={{
          fontSize: "0.5rem",
          color: "#2c3e50",
          marginBottom: "0.5rem",
          textAlign: "center"
        }}>
          Featured PETases
        </h2>
        <p style={{ textAlign: "center", color: "#64748b" }}>Loading featured PETases...</p>
      </section>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <section style={{
      marginBottom: "2rem",
      paddingTop: "1.5rem",
      paddingBottom: "1.5rem",
      paddingLeft: "1.25rem",
      paddingRight: "1.25rem",
      backgroundColor: "#f8fafc",
      borderRadius: "12px"
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        color: "#2c3e50",
        marginBottom: "1.5rem",
        textAlign: "center",
        fontWeight: "700"
      }}>
        Featured PETases
      </h2>

      {/* Carousel Container */}
      <div style={{
        position: "relative",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        {/* Slide */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "350px",
          transition: "opacity 0.3s ease-in-out"
        }}>
          {renderCard(currentSlideData)}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={goToPrevious}
          aria-label="Previous slide"
          style={{
            position: "absolute",
            left: "-10px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "white",
            border: "2px solid #e2e8f0",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.2s",
            fontSize: "1.2rem",
            color: "#2c3e50",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ‹
        </button>

        <button
          onClick={goToNext}
          aria-label="Next slide"
          style={{
            position: "absolute",
            right: "-10px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "white",
            border: "2px solid #e2e8f0",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.2s",
            fontSize: "1.2rem",
            color: "#2c3e50",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ›
        </button>
      </div>

      {/* Dots Indicator */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.75rem",
        marginTop: "1.5rem"
      }}>
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: currentSlide === index ? slide.badgeColor : "#cbd5e1",
              cursor: "pointer",
              transition: "all 0.3s",
              transform: currentSlide === index ? "scale(1.2)" : "scale(1)"
            }}
            onMouseEnter={(e) => {
              if (currentSlide !== index) {
                e.currentTarget.style.backgroundColor = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              if (currentSlide !== index) {
                e.currentTarget.style.backgroundColor = "#cbd5e1";
              }
            }}
          />
        ))}
      </div>

      {/* Auto-play toggle */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "1rem"
      }}>
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          style={{
            fontSize: "0.75rem",
            color: "#64748b",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
            transition: "color 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#2c3e50";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#64748b";
          }}
        >
          {isAutoPlaying ? "⏸ Pause" : "▶ Play"} auto-rotation
        </button>
      </div>
    </section>
  );
};

export default FeaturedPETases;
