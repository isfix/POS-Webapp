'use server';

import { runConversationalAgent } from '@/ai/flows/conversational-agent';
import { dataEntryTool as runDataEntryTool } from '@/ai/flows/data-entry-tool';
import { generateFinancialAnomalyAlerts as runFinancialAnomalyAlerts } from '@/ai/flows/financial-anomaly-alerts';
import { aiPoweredDataEntry } from '@/ai/flows/natural-language-data-entry';
import { runGenerateDailyInsights } from '@/ai/flows/generate-daily-insights';
import { runAutomatedFinancialProjection } from '@/ai/flows/automated-financial-projection';

// This type definition now lives here and is safe to export.
export type ConversationHistory = {
  role: 'user' | 'model';
  content: string;
}[];

export async function runAgent(
  prompt: string,
  history: ConversationHistory
) {
  return await runConversationalAgent({ prompt, history });
}

export { runDataEntryTool, runFinancialAnomalyAlerts, aiPoweredDataEntry, runGenerateDailyInsights, runAutomatedFinancialProjection };
