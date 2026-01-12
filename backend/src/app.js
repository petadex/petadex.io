// backend/src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import fastaaRoutes from './routes/fastaa.js';
import aaSeqFeaturesRoutes from './routes/aaSeqFeatures.js';
import geneMetadataRoutes from './routes/geneMetadata.js';
import plateDataRoutes from './routes/plateData.js';
import geneDetailsRoutes from './routes/geneDetails.js';
import pdbRoutes from './routes/pdb.js';
import enzymesRoutes from './routes/enzymes.js';
import { pool } from './db.js';

const app = express();

app.use(cors({
  origin: [
    'https://petadex.net',
    'https://www.petadex.net',
    'http://localhost:8000',
    'http://localhost:9000',
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
app.use('/api/enzymes', enzymesRoutes);

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
const spec = YAML.load('./docs/openapi.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;