/**
 * Sampler - Three sampling strategies for selecting representative logs.
 */
import { LLMLog } from './logStore';

export type SamplingStrategy = 'uniform' | 'stratified' | 'signal-boosted';

/**
 * Uniform random sampling.
 */
function uniformSample(logs: LLMLog[], n: number): LLMLog[] {
  const shuffled = [...logs].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Stratified sampling: ensures representation from each feature/model combination.
 */
function stratifiedSample(logs: LLMLog[], n: number): LLMLog[] {
  const groups: Record<string, LLMLog[]> = {};
  logs.forEach(log => {
    const key = `${log.feature}__${log.model}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });

  const result: LLMLog[] = [];
  const groupKeys = Object.keys(groups);
  const perGroup = Math.max(1, Math.floor(n / groupKeys.length));

  groupKeys.forEach(key => {
    const shuffled = groups[key].sort(() => Math.random() - 0.5);
    result.push(...shuffled.slice(0, perGroup));
  });

  return result.slice(0, n);
}

/**
 * Signal-boosted sampling: oversample negative feedback and high latency interactions.
 */
function signalBoostedSample(logs: LLMLog[], n: number): LLMLog[] {
  // Give 3x weight to negative feedback, 2x to retries/high latency
  const weighted: { log: LLMLog; weight: number }[] = logs.map(log => {
    let weight = 1;
    if (log.userFeedback === 'negative') weight = 3;
    if (log.latencyMs > 1500) weight = Math.max(weight, 2);
    return { log, weight };
  });

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const result: LLMLog[] = [];
  const selected = new Set<string>();

  while (result.length < n && result.length < logs.length) {
    let r = Math.random() * totalWeight;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0 && !selected.has(w.log.id)) {
        result.push(w.log);
        selected.add(w.log.id);
        break;
      }
    }
  }

  return result;
}

export function sampleLogs(logs: LLMLog[], n: number, strategy: SamplingStrategy): LLMLog[] {
  switch (strategy) {
    case 'uniform': return uniformSample(logs, n);
    case 'stratified': return stratifiedSample(logs, n);
    case 'signal-boosted': return signalBoostedSample(logs, n);
  }
}
