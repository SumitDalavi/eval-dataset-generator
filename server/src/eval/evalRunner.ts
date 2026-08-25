/**
 * Eval Runner - Runs the accumulated eval dataset against a model endpoint
 * and tracks regression between runs.
 */
import { ChatOpenAI } from "@langchain/openai";
import { EvalTestCase, getEvalDataset } from "../labeling/autoLabeler";
import { v4 as uuidv4 } from 'uuid';

export interface EvalResult {
  testCaseId: string;
  response: string;
  qualityScore: number;
  passed: boolean;
  latencyMs: number;
}

export interface EvalRun {
  id: string;
  model: string;
  timestamp: string;
  results: EvalResult[];
  passRate: number;
  avgQuality: number;
}

const evalRuns: EvalRun[] = [];

export function getEvalRuns(): EvalRun[] {
  return evalRuns;
}

/**
 * Run the full eval dataset against a given model.
 */
export async function runEval(modelName: string = 'gpt-4o-mini'): Promise<EvalRun> {
  const dataset = getEvalDataset().filter(tc => tc.status !== 'rejected');
  
  if (dataset.length === 0) {
    return {
      id: uuidv4(),
      model: modelName,
      timestamp: new Date().toISOString(),
      results: [],
      passRate: 0,
      avgQuality: 0
    };
  }

  const model = new ChatOpenAI({ modelName, temperature: 0.1 });
  const results: EvalResult[] = [];

  for (const tc of dataset) {
    const start = Date.now();
    try {
      const response = await model.invoke([["user", tc.prompt]]);
      const latency = Date.now() - start;
      const content = response.content as string;

      // Simple quality check: LLM-as-judge
      const judge = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
      const judgeResult = await judge.invoke([
        ["user", `Rate this response quality from 1-5.
Question: ${tc.prompt}
Expected: ${tc.goldenAnswer}
Actual: ${content}
Return only a single number 1-5.`]
      ]);
      
      const score = parseInt((judgeResult.content as string).trim()) || 3;
      const passed = score >= 3;

      results.push({
        testCaseId: tc.id,
        response: content,
        qualityScore: score,
        passed,
        latencyMs: latency
      });
    } catch (err: any) {
      results.push({
        testCaseId: tc.id,
        response: `Error: ${err.message}`,
        qualityScore: 0,
        passed: false,
        latencyMs: Date.now() - start
      });
    }
  }

  const passRate = results.filter(r => r.passed).length / results.length;
  const avgQuality = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

  const run: EvalRun = {
    id: uuidv4(),
    model: modelName,
    timestamp: new Date().toISOString(),
    results,
    passRate,
    avgQuality
  };

  evalRuns.push(run);
  return run;
}

/**
 * Detect regressions by comparing the latest run to the previous one.
 */
export function detectRegressions(): { newFailures: string[]; newPasses: string[]; passRateDelta: number } {
  if (evalRuns.length < 2) return { newFailures: [], newPasses: [], passRateDelta: 0 };

  const current = evalRuns[evalRuns.length - 1];
  const previous = evalRuns[evalRuns.length - 2];

  const prevResults = new Map(previous.results.map(r => [r.testCaseId, r]));
  
  const newFailures: string[] = [];
  const newPasses: string[] = [];

  current.results.forEach(r => {
    const prev = prevResults.get(r.testCaseId);
    if (!prev) return;
    if (prev.passed && !r.passed) newFailures.push(r.testCaseId);
    if (!prev.passed && r.passed) newPasses.push(r.testCaseId);
  });

  return {
    newFailures,
    newPasses,
    passRateDelta: current.passRate - previous.passRate
  };
}
