# Protein Screenshot Generator

Automated tool to generate static PNG screenshots of 3D protein structures using Molstar.

## Setup

Install dependencies:
```bash
cd backend
npm install
```

## Usage

### Generate screenshots for featured proteins only
```bash
npm run generate-screenshots:featured
```

### Generate screenshot for a specific protein
```bash
npm run generate-screenshots WP_054022242.1
```

### Generate screenshots for all proteins with PDB structures
```bash
npm run generate-screenshots -- --all
```

## Output

Screenshots are saved to:
```
frontend/src/images/protein-screenshots/<accession>.png
```

Size: 400x400px at 2x resolution for retina displays

## How It Works

1. Launches headless Chrome browser via Puppeteer
2. Creates minimal HTML page with Molstar viewer
3. Loads PDB structure from URL in database
4. Renders protein in cartoon representation with sequence-based coloring
5. Waits for rendering to complete
6. Captures screenshot
7. Saves as PNG file

## Requirements

- Node.js 16+
- Puppeteer (headless Chrome)
- PostgreSQL database with `pdb` table containing `accession` and `pdb_url` columns

## Notes

- Each screenshot takes ~5-10 seconds to generate
- Screenshots are deterministic (same protein = same image)
- Failed generations are logged but don't stop the script
- Existing screenshots are overwritten
