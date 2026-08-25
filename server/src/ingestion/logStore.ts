/**
 * Log Store - In-memory storage for production LLM interaction logs.
 */
import { v4 as uuidv4 } from 'uuid';

export interface LLMLog {
  id: string;
  prompt: string;
  systemPrompt: string;
  response: string;
  model: string;
  latencyMs: number;
  tokenCount: number;
  userFeedback: 'positive' | 'negative' | 'none';
  feature: string; // which application feature generated this call
  timestamp: string;
}

const logs: LLMLog[] = [];

export function ingestLog(log: Omit<LLMLog, 'id'>): string {
  const id = uuidv4();
  logs.push({ ...log, id });
  return id;
}

export function ingestBatch(entries: Omit<LLMLog, 'id'>[]): number {
  entries.forEach(e => ingestLog(e));
  return entries.length;
}

export function getAllLogs(): LLMLog[] {
  return logs;
}

export function getLogCount(): number {
  return logs.length;
}

/**
 * Seed with synthetic production logs for demo purposes.
 */
export function seedDemoLogs() {
  const features = ['support-classifier', 'summarizer', 'code-reviewer', 'rag-qa'];
  const prompts = [
    { prompt: 'How do I reset my password?', response: 'Go to Settings > Account > Reset Password.', feature: 'rag-qa', feedback: 'positive' as const },
    { prompt: 'Classify this email: "I was charged twice for my subscription"', response: '{"category": "billing", "summary": "Double charge complaint"}', feature: 'support-classifier', feedback: 'positive' as const },
    { prompt: 'Summarize this 10-page contract', response: 'This contract establishes a 2-year SaaS agreement...', feature: 'summarizer', feedback: 'positive' as const },
    { prompt: 'Why is my order delayed?', response: 'I am an AI and cannot access your order system.', feature: 'rag-qa', feedback: 'negative' as const },
    { prompt: 'Review this Python function for bugs', response: 'The function looks correct. No issues found.', feature: 'code-reviewer', feedback: 'negative' as const },
    { prompt: 'What are the payment terms in our vendor agreement?', response: 'Net 30 days from invoice date, with 2% early payment discount.', feature: 'rag-qa', feedback: 'positive' as const },
    { prompt: 'Classify: "My account was hacked and someone changed my email"', response: '{"category": "security", "summary": "Account compromise report"}', feature: 'support-classifier', feedback: 'positive' as const },
    { prompt: 'Classify: "lol ur product sucks"', response: '{"category": "general", "summary": "Negative feedback"}', feature: 'support-classifier', feedback: 'none' as const },
    { prompt: 'Summarize the Q3 earnings report', response: 'Revenue increased 15% YoY to $4.2B. Operating margin improved by 200bps.', feature: 'summarizer', feedback: 'positive' as const },
    { prompt: 'How do I integrate the webhook API?', response: 'Send a POST request to /api/webhooks with your callback URL in the body.', feature: 'rag-qa', feedback: 'positive' as const },
    { prompt: 'What is the meaning of life?', response: '42, according to Douglas Adams.', feature: 'rag-qa', feedback: 'none' as const },
    { prompt: 'Fix this SQL query: SELECT * FORM users', response: 'Change FORM to FROM: SELECT * FROM users', feature: 'code-reviewer', feedback: 'positive' as const },
    { prompt: 'Classify: "I need to upgrade my plan but the button is broken"', response: '{"category": "technical", "summary": "UI bug report for plan upgrade"}', feature: 'support-classifier', feedback: 'positive' as const },
    { prompt: 'Summarize this meeting transcript', response: 'The meeting covered sprint planning. Key decisions: migrate to PostgreSQL by Q2, hire 2 more engineers.', feature: 'summarizer', feedback: 'positive' as const },
    { prompt: 'My app keeps crashing on startup, help!', response: 'Please try clearing your cache and reinstalling the application.', feature: 'rag-qa', feedback: 'negative' as const },
    { prompt: 'Classify: "Thanks for fixing my issue so quickly!"', response: '{"category": "general", "summary": "Positive feedback"}', feature: 'support-classifier', feedback: 'positive' as const },
    { prompt: 'Generate a unit test for this function', response: 'Here is a unit test using Jest...', feature: 'code-reviewer', feedback: 'positive' as const },
    { prompt: 'What are our SLA guarantees?', response: 'We guarantee 99.9% uptime with a 4-hour response time for critical issues.', feature: 'rag-qa', feedback: 'positive' as const },
    { prompt: 'Translate this error log', response: 'The error indicates a null pointer exception in the authentication module.', feature: 'code-reviewer', feedback: 'positive' as const },
    { prompt: 'How can I cancel my subscription?', response: 'To cancel, go to Account Settings and click Cancel Subscription.', feature: 'rag-qa', feedback: 'none' as const },
  ];

  prompts.forEach((p, i) => {
    ingestLog({
      prompt: p.prompt,
      systemPrompt: 'You are a helpful assistant.',
      response: p.response,
      model: i % 3 === 0 ? 'gpt-4o' : 'gpt-4o-mini',
      latencyMs: 200 + Math.floor(Math.random() * 2000),
      tokenCount: 50 + Math.floor(Math.random() * 200),
      userFeedback: p.feedback,
      feature: p.feature,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    });
  });
}
