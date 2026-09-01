// backend/src/routes/literature.js
//
// GET /api/literature          — list papers (graph payload)
// GET /api/literature/status — fixture / load state
// GET /api/literature/item/:doiEncoded — single paper (DOI via encodeURIComponent)
import { Router } from 'express';
import {
  getLiteraturePaper,
  getLiteratureStatus,
  listLiteraturePapers,
} from '../lib/literatureCache.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = await getLiteratureStatus();
    res.json(status);
  } catch (err) {
    console.error('literature status failed:', err.message || err);
    res.status(500).json({ status: 'error', reason: 'internal' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const [papers, status] = await Promise.all([
      listLiteraturePapers(),
      getLiteratureStatus(),
    ]);
    res.json({ papers, status });
  } catch (err) {
    console.error('literature list failed:', err.message || err);
    res.status(500).json({ error: 'Failed to load literature' });
  }
});

router.get('/item/:doiEncoded', async (req, res) => {
  try {
    let doi;
    try {
      doi = decodeURIComponent(req.params.doiEncoded || '');
    } catch {
      return res.status(400).json({ error: 'Invalid DOI encoding' });
    }
    if (!doi) return res.status(400).json({ error: 'DOI required' });

    const paper = await getLiteraturePaper(doi);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const all = await listLiteraturePapers();
    const inSet = new Set(all.map(p => p.doi.toLowerCase()));
    const outgoing = (paper.citations_in_dataset || [])
      .filter(d => inSet.has(String(d).toLowerCase()))
      .map(d => {
        const hit = all.find(
          p => p.doi.toLowerCase() === String(d).toLowerCase(),
        );
        return hit
          ? { doi: hit.doi, paper_title: hit.paper_title }
          : { doi: d, paper_title: null };
      });

    res.json({ paper, outgoing_citations: outgoing });
  } catch (err) {
    console.error('literature item failed:', err.message || err);
    res.status(500).json({ error: 'Failed to load paper' });
  }
});

export default router;
