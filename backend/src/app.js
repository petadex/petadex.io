// backend/src/app.js
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const __dirname = dirname(fileURLToPath(import.meta.url));

import fastaaRoutes from './routes/fastaa.js';
import aaSeqFeaturesRoutes from './routes/aaSeqFeatures.js';
import geneMetadataRoutes from './routes/geneMetadata.js';
import plateDataRoutes from './routes/plateData.js';
import geneDetailsRoutes from './routes/geneDetails.js';
import pdbRoutes from './routes/pdb.js';
import structureRoutes from './routes/structure.js';
import sraRoutes from './routes/sra.js';
import enzymesRoutes from './routes/enzymes.js';
import searchRoutes from './routes/search.js';
import atlasRoutes from './routes/atlas.js';
import familyRoutes from './routes/family.js';
import saraViewerRoutes from './routes/saraViewer.js';
import petadexDomainsRoutes from './routes/petadexDomains.js';
import resolveRoutes from './routes/resolve.js';
import clusterRoutes from './routes/cluster.js';
import orfRoutes from './routes/orf.js';
import kineticsRoutes from './routes/kinetics.js';
import { pool } from './db.js';

const app = express();

app.use(compression());
app.use(cors({
  origin: [
    'https://petadex.net',
    'https://www.petadex.net',
    'https://petadex.org',
    'https://www.petadex.org',
    'https://api.petadex.org',
    'http://localhost:8000',
    'http://localhost:9000',
    'http://localhost:3000',
    'http://ec2-44-222-238-66.compute-1.amazonaws.com:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/api/fastaa', fastaaRoutes);
app.use('/api/aa-seq-features', aaSeqFeaturesRoutes);
app.use('/api/gene-metadata', geneMetadataRoutes);
app.use('/api/plate-data', plateDataRoutes);
app.use('/api/gene-details', geneDetailsRoutes);
app.use('/api/pdb', pdbRoutes);
app.use('/api/structure', structureRoutes);
app.use('/api/sra', sraRoutes);
app.use('/api/enzymes', enzymesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/atlas', atlasRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/sara-viewer', saraViewerRoutes);
app.use('/api/petadex-domains', petadexDomainsRoutes);
app.use('/api/resolve', resolveRoutes);
app.use('/api/cluster', clusterRoutes);
app.use('/api/orf', orfRoutes);
app.use('/api/kinetics', kineticsRoutes);

// Root: no HTML UI — API lives under /api/*. Browsers hitting :3001/ alone see this instead of "Cannot GET /".
app.get('/', (req, res) => {
  res.type('json').json({
    service: 'PETadex API',
    health: '/health',
    docs: '/docs',
    api: '/api',
  });
});

// (Optional) health check route
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error' });
  }
});

// Serve OpenAPI docs if you like
const spec = YAML.load(join(__dirname, '../docs/openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
