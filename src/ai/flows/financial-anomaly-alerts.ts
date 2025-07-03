'use server';

/**
 * @fileOverview AI-driven analysis tool that proactively discovers trends and generates automated alerts when financial abnormalities occur within the store.
 *
 * - generateFinancialAnomalyAlerts - A function that handles the generation of financial anomaly alerts.
 * - FinancialAnomalyAlertsInput - The input type for the generateFinancialAnomalyAlerts function.
 * - FinancialAnomalyAlertsOutput - The return type for the generateFinancialAnomalyAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialAnomalyAlertsInputSchema = z.object({
  salesData: z.string().describe('The sales data of the store.'),
  expensesData: z.string().describe('The expenses data of the store.'),
  marketResearchData: z.string().describe('The market research data.'),
});
export type FinancialAnomalyAlertsInput = z.infer<typeof FinancialAnomalyAlertsInputSchema>;

const FinancialAnomalyAlertsOutputSchema = z.object({
  alerts: z
    .string()
    .describe(
      'Financial abnormality alerts based on predictive analysis, linear regression, moving averages, market research, delphi method, and horizontal/vertical/ratio/trend/variance analysis.'
    ),
});
export type FinancialAnomalyAlertsOutput = z.infer<typeof FinancialAnomalyAlertsOutputSchema>;

export async function generateFinancialAnomalyAlerts(
  input: FinancialAnomalyAlertsInput
): Promise<FinancialAnomalyAlertsOutput> {
  return financialAnomalyAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAnomalyAlertsPrompt',
  input: {schema: FinancialAnomalyAlertsInputSchema},
  output: {schema: FinancialAnomalyAlertsOutputSchema},
  prompt: `You are an AI-driven analysis tool that proactively discovers trends and generates automated alerts when financial abnormalities occur within the store.

  Consider percentage of sales estimates, linear regression, moving averages, market research, delphi method, and horizontal/vertical/ratio/trend/variance analysis.

  Generate alerts for financial abnormalities, if any. If there are no anomalies, return an empty string.

  Sales Data: {{{salesData}}}
  Expenses Data: {{{expensesData}}}
  Market Research Data: {{{marketResearchData}}}
  `,
});

const financialAnomalyAlertsFlow = ai.defineFlow(
  {
    name: 'financialAnomalyAlertsFlow',
    inputSchema: FinancialAnomalyAlertsInputSchema,
    outputSchema: FinancialAnomalyAlertsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
