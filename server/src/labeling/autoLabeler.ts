/**
 * Auto-Labeling Pipeline
 * Uses LLM-as-judge to score interaction quality and generate golden references.
 */
import { ChatOpenAI } from "@langchain/openai";
import { LLMLog } from "../ingestion/logStore";
import { v4 as uuidv4 } from 'uuid';

export interface EvalTestCase {
  id: string;
  sourceLogId: string;
  prompt: string;
  goldenAnswer: string;
  qualityScore: number; // 1-5
  difficulty: 'simple' | 'moderate' | 'hard' | 'adversarial';
  category: string;
  keyAssertions: string[];
  antiAssertions: string[]; // Things the response must NOT contain
  confidence: number; // 0-1 labeling confidence
  status: 'auto-approved' | 'pending-review' | 'human-approved' | 'rejected';
  createdAt: string;
}

const evalDataset: EvalTestCase[] = [];

export function getEvalDataset(): EvalTestCase[] {
  return evalDataset;
}

export function getEvalDatasetSize(): number {
  return evalDataset.length;
}

export function updateTestCaseStatus(id: string, status: EvalTestCase['status']) {
  const tc = evalDataset.find(t => t.id === id);
  if (tc) tc.status = status;
}

/**
 * Auto-label a single log entry using LLM-as-judge.
 */
export async function autoLabelLog(log: LLMLog): Promise<EvalTestCase> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const labelingPrompt = `You are an expert AI evaluator. Analyze this LLM interaction and produce structured labels.

User Prompt: ${log.prompt}
LLM Response: ${log.response}
User Feedback: ${log.userFeedback}

Produce a JSON object with:
{
  "qualityScore": <1-5, how good was this response?>,
  "difficulty": <"simple"|"moderate"|"hard"|"adversarial">,
  "category": <brief category label like "password-reset", "billing", "code-review">,
  "goldenAnswer": <what the ideal response should be>,
  "keyAssertions": [<list of facts the response MUST contain>],
  "antiAssertions": [<list of things the response must NOT contain, e.g. hallucinations>],
  "confidence": <0.0-1.0, how confident are you in these labels?>
}

Return ONLY valid JSON.`;

  try {
    const result = await model.invoke([["user", labelingPrompt]]);
    const content = result.content as string;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const labels = JSON.parse(jsonMatch[0]);
    
    const testCase: EvalTestCase = {
      id: uuidv4(),
      sourceLogId: log.id,
      prompt: log.prompt,
      goldenAnswer: labels.goldenAnswer || log.response,
      qualityScore: labels.qualityScore || 3,
      difficulty: labels.difficulty || 'moderate',
      category: labels.category || log.feature,
      keyAssertions: labels.keyAssertions || [],
      antiAssertions: labels.antiAssertions || [],
      confidence: labels.confidence || 0.5,
      status: labels.confidence > 0.8 ? 'auto-approved' : 'pending-review',
      createdAt: new Date().toISOString()
    };

    evalDataset.push(testCase);
    return testCase;
  } catch (err: any) {
    // Fallback: create a test case from the log without LLM labeling
    const testCase: EvalTestCase = {
      id: uuidv4(),
      sourceLogId: log.id,
      prompt: log.prompt,
      goldenAnswer: log.response,
      qualityScore: log.userFeedback === 'positive' ? 4 : log.userFeedback === 'negative' ? 2 : 3,
      difficulty: 'moderate',
      category: log.feature,
      keyAssertions: [],
      antiAssertions: [],
      confidence: 0.3,
      status: 'pending-review',
      createdAt: new Date().toISOString()
    };

    evalDataset.push(testCase);
    return testCase;
  }
}

/**
 * Check if a new test case is a near-duplicate of existing ones.
 * Uses a simple character-level Jaccard similarity as a proxy.
 */
export function isDuplicate(prompt: string, threshold: number = 0.92): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const newTokens = new Set(normalize(prompt));
  
  for (const existing of evalDataset) {
    const existingTokens = new Set(normalize(existing.prompt));
    const intersection = new Set([...newTokens].filter(t => existingTokens.has(t)));
    const union = new Set([...newTokens, ...existingTokens]);
    const similarity = intersection.size / union.size;
    if (similarity > threshold) return true;
  }
  
  return false;
}
