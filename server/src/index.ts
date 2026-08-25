import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { seedDemoLogs, getAllLogs, getLogCount, ingestLog } from './ingestion/logStore';
import { sampleLogs, SamplingStrategy } from './ingestion/sampler';
import { kMeansClustering, detectAnomalies } from './analysis/clusterer';
import { autoLabelLog, getEvalDataset, getEvalDatasetSize, updateTestCaseStatus, isDuplicate } from './labeling/autoLabeler';
import { runEval, getEvalRuns, detectRegressions } from './eval/evalRunner';

const app = express();
app.use(cors());
app.use(express.json());

// Seed demo logs on startup
seedDemoLogs();
console.log(`Seeded ${getLogCount()} demo production logs.`);

// Simple embedding proxy using character n-grams (for demo without a model download)
function simpleEmbed(text: string): number[] {
  const dim = 64;
  const vec = new Array(dim).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    vec[i % dim] += normalized.charCodeAt(i) / 128;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / (norm || 1));
}

// --- LOG ENDPOINTS ---

app.get('/api/logs', (_req, res) => {
  res.json({ logs: getAllLogs(), total: getLogCount() });
});

app.post('/api/logs', (req, res) => {
  try {
    const id = ingestLog(req.body);
    res.json({ id, total: getLogCount() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SAMPLING ---

app.post('/api/sample', (req, res) => {
  const { strategy, count } = req.body as { strategy: SamplingStrategy; count: number };
  const sampled = sampleLogs(getAllLogs(), count || 10, strategy || 'uniform');
  res.json({ sampled, count: sampled.length });
});

// --- CLUSTERING ---

app.post('/api/cluster', (req, res) => {
  const { k } = req.body as { k: number };
  const logs = getAllLogs();
  const items = logs.map(l => ({ id: l.id, embedding: simpleEmbed(l.prompt) }));
  const clusters = kMeansClustering(items, k || 4);
  const anomalies = detectAnomalies(clusters, 0.6);

  // Enrich clusters with prompt text
  const logMap = new Map(logs.map(l => [l.id, l]));
  const enriched = clusters.map(c => ({
    ...c,
    members: c.members.map(m => ({
      ...m,
      prompt: logMap.get(m.id)?.prompt || '',
      feature: logMap.get(m.id)?.feature || ''
    })),
    centroid: undefined // Don't send raw centroid to frontend
  }));

  res.json({ clusters: enriched, anomalies });
});

// --- AUTO-LABELING ---

app.post('/api/auto-label', async (req, res) => {
  const { strategy, count } = req.body as { strategy: SamplingStrategy; count: number };
  const sampled = sampleLogs(getAllLogs(), count || 5, strategy || 'signal-boosted');
  
  const results = [];
  for (const log of sampled) {
    if (isDuplicate(log.prompt)) {
      results.push({ logId: log.id, status: 'skipped-duplicate' });
      continue;
    }
    const tc = await autoLabelLog(log);
    results.push({ logId: log.id, testCaseId: tc.id, status: tc.status });
  }

  res.json({ labeled: results, datasetSize: getEvalDatasetSize() });
});

// --- EVAL DATASET ---

app.get('/api/eval-dataset', (_req, res) => {
  res.json({ dataset: getEvalDataset(), total: getEvalDatasetSize() });
});

app.post('/api/eval-dataset/:id/approve', (req, res) => {
  updateTestCaseStatus(req.params.id, 'human-approved');
  res.json({ success: true });
});

app.post('/api/eval-dataset/:id/reject', (req, res) => {
  updateTestCaseStatus(req.params.id, 'rejected');
  res.json({ success: true });
});

// --- EVAL RUNNER ---

app.post('/api/eval/run', async (req, res) => {
  const { model } = req.body;
  try {
    const run = await runEval(model || 'gpt-4o-mini');
    res.json({ run });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/eval/runs', (_req, res) => {
  res.json({ runs: getEvalRuns() });
});

app.get('/api/eval/regressions', (_req, res) => {
  res.json(detectRegressions());
});

// --- STATS ---

app.get('/api/stats', (_req, res) => {
  const dataset = getEvalDataset();
  const byStatus = {
    'auto-approved': dataset.filter(t => t.status === 'auto-approved').length,
    'pending-review': dataset.filter(t => t.status === 'pending-review').length,
    'human-approved': dataset.filter(t => t.status === 'human-approved').length,
    'rejected': dataset.filter(t => t.status === 'rejected').length,
  };
  const byCategory: Record<string, number> = {};
  dataset.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  const byDifficulty: Record<string, number> = {};
  dataset.forEach(t => {
    byDifficulty[t.difficulty] = (byDifficulty[t.difficulty] || 0) + 1;
  });

  res.json({
    totalLogs: getLogCount(),
    totalTestCases: getEvalDatasetSize(),
    totalEvalRuns: getEvalRuns().length,
    byStatus,
    byCategory,
    byDifficulty
  });
});

const PORT = process.env.PORT || 4005;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Eval Dataset Generator API running on port ${PORT}`);
  });
}

export default app;
