/**
 * Automated protein structure screenshot generator
 *
 * This script uses Puppeteer to:
 * 1. Load a protein structure in Molstar
 * 2. Render it with optimal viewing angle
 * 3. Capture a screenshot
 * 4. Save it as a PNG file
 *
 * Usage:
 *   node scripts/generate-protein-screenshots.js <accession>
 *   node scripts/generate-protein-screenshots.js --all  # Generate for all proteins with PDB data
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCREENSHOT_DIR = path.join(__dirname, '../../frontend/src/images/protein-screenshots');
const SCREENSHOT_WIDTH = 400;
const SCREENSHOT_HEIGHT = 400;
const VIEWPORT_SCALE = 2; // For higher quality (retina)

/**
 * Create the screenshot directory if it doesn't exist
 */
async function ensureScreenshotDir() {
  try {
    await fs.access(SCREENSHOT_DIR);
  } catch {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    console.log(`Created directory: ${SCREENSHOT_DIR}`);
  }
}

/**
 * Generate a screenshot for a single protein
 */
async function generateScreenshot(accession, pdbUrl) {
  console.log(`\nGenerating screenshot for ${accession}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport for high-quality screenshots
    await page.setViewport({
      width: SCREENSHOT_WIDTH * VIEWPORT_SCALE,
      height: SCREENSHOT_HEIGHT * VIEWPORT_SCALE,
      deviceScaleFactor: 1
    });

    // Create a simple HTML page with Molstar
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://unpkg.com/molstar@latest/build/viewer/molstar.css" type="text/css">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    #viewer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <script src="https://unpkg.com/molstar@latest/build/viewer/molstar.js"></script>
  <script>
    (async () => {
      const viewer = await molstar.Viewer.create('viewer', {
        layoutIsExpanded: false,
        layoutShowControls: false,
        layoutShowRemoteState: false,
        layoutShowSequence: false,
        layoutShowLog: false,
        layoutShowLeftPanel: false,
        viewportShowExpand: false,
        viewportShowSelectionMode: false,
        viewportShowAnimation: false,
      });

      // Load PDB structure
      try {
        await viewer.loadPdb('${pdbUrl}');

        // Wait for structure to load and render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Apply cartoon representation
        const data = viewer.plugin.managers.structure.hierarchy.current.structures[0];
        if (data) {
          await viewer.plugin.builders.structure.representation.addRepresentation(data, {
            type: 'cartoon',
            color: 'sequence-id'
          });
        }

        // Focus camera and wait for render
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Signal ready for screenshot
        window.screenshotReady = true;
      } catch (error) {
        console.error('Error loading structure:', error);
        window.screenshotError = true;
      }
    })();
  </script>
</body>
</html>
    `;

    await page.setContent(html);

    // Wait for the structure to be ready
    await page.waitForFunction(
      () => window.screenshotReady || window.screenshotError,
      { timeout: 30000 }
    );

    const hasError = await page.evaluate(() => window.screenshotError);
    if (hasError) {
      throw new Error('Failed to load protein structure in Molstar');
    }

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${accession}.png`);
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: SCREENSHOT_WIDTH * VIEWPORT_SCALE,
        height: SCREENSHOT_HEIGHT * VIEWPORT_SCALE
      }
    });

    console.log(`✓ Saved screenshot: ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    console.error(`✗ Failed to generate screenshot for ${accession}:`, error.message);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Get all proteins with PDB structures from database
 */
async function getProteinsWithStructures() {
  const result = await pool.query(`
    SELECT DISTINCT accession, pdb_url
    FROM pdb
    WHERE pdb_url IS NOT NULL
    ORDER BY accession
  `);
  return result.rows;
}

/**
 * Get a specific protein's PDB URL
 */
async function getProteinPdbUrl(accession) {
  const result = await pool.query(
    'SELECT pdb_url FROM pdb WHERE accession = $1 LIMIT 1',
    [accession]
  );
  return result.rows.length > 0 ? result.rows[0].pdb_url : null;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  await ensureScreenshotDir();

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage:
  node generate-protein-screenshots.js <accession>         Generate for specific protein
  node generate-protein-screenshots.js --all               Generate for all proteins
  node generate-protein-screenshots.js --featured          Generate for featured proteins only
    `);
    process.exit(0);
  }

  try {
    if (args[0] === '--all') {
      console.log('Fetching all proteins with PDB structures...');
      const proteins = await getProteinsWithStructures();
      console.log(`Found ${proteins.length} proteins with structures`);

      for (const protein of proteins) {
        await generateScreenshot(protein.accession, protein.pdb_url);
      }

      console.log(`\n✓ Generated ${proteins.length} screenshots`);
    } else if (args[0] === '--featured') {
      // Generate only for featured proteins
      const featured = ['WP_054022242.1', 'WP_054022242.1_M1'];
      console.log('Generating screenshots for featured proteins...');

      for (const accession of featured) {
        const pdbUrl = await getProteinPdbUrl(accession);
        if (pdbUrl) {
          await generateScreenshot(accession, pdbUrl);
        } else {
          console.log(`✗ No PDB structure found for ${accession}`);
        }
      }
    } else {
      // Generate for specific accession
      const accession = args[0];
      const pdbUrl = await getProteinPdbUrl(accession);

      if (!pdbUrl) {
        console.error(`✗ No PDB structure found for ${accession}`);
        process.exit(1);
      }

      await generateScreenshot(accession, pdbUrl);
    }

    console.log('\n✓ Screenshot generation complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
