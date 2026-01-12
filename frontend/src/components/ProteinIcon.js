import React, { useState } from "react";

/**
 * Protein screenshot/preview component for use in carousels and previews.
 * Displays a pre-generated screenshot of the 3D protein structure.
 * Falls back to a placeholder if screenshot doesn't exist.
 */
const ProteinIcon = ({
  accession,
  width = "120px",
  height = "120px",
  color = "#3b82f6"
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Try to load screenshot, fall back to placeholder
  let screenshotSrc;
  try {
    screenshotSrc = require(`../images/protein-screenshots/${accession}.png`);
  } catch {
    // Screenshot doesn't exist yet
    screenshotSrc = null;
  }

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Placeholder when screenshot doesn't exist
  if (!screenshotSrc || imageError) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '2px solid #e2e8f0',
          position: 'relative'
        }}
      >
        <svg
          width="60%"
          height="60%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simple protein icon */}
          <path
            d="M30 30 Q 35 35, 30 40 Q 25 45, 30 50"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M50 25 L 55 30 L 50 35 L 55 40"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M70 30 L 75 35 L 70 40 L 75 45"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
          <circle cx="50" cy="65" r="6" fill={color} opacity="0.7" />
        </svg>
        <div style={{
          fontSize: '10px',
          color: '#94a3b8',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Structure Preview
        </div>
      </div>
    );
  }

  // Display screenshot
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}
    >
      {!imageLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            color: '#94a3b8',
            fontSize: '12px'
          }}
        >
          Loading...
        </div>
      )}
      <img
        src={screenshotSrc}
        alt={`${accession} protein structure`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: imageLoaded ? 'block' : 'none'
        }}
      />
    </div>
  );
};

export default ProteinIcon;
