'use server';
/**
 * @fileOverview An AI flow to generate an automated financial projection based on historical data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AutomatedFinancialProjectionInputSchema = z.object({
  historicalSales: z.string().describe('A JSON string of historical sales data over the last 90 days. Each entry includes date, revenue, and profit.'),
  inventoryLevels: z.string().describe('A JSON string of current inventory levels, including item name, quantity, and unit.'),
  menuItems: z.string().describe('A JSON string of all menu items with their name, price, and cost price.'),
  historicalExpenses: z.string().describe('A JSON string of historical expenses over the last 90 days. Each entry includes date, category, and amount.'),
});
export type AutomatedFinancialProjectionInput = z.infer<typeof AutomatedFinancialProjectionInputSchema>;

const AutomatedFinancialProjectionOutputSchema = z.object({
    projectedRevenue: z.number().describe("The total projected revenue for the next 30 days."),
    projectedProfit: z.number().describe("The total projected profit for the next 30 days."),
    revenueTrendAnalysis: z.string().describe("A brief analysis (2-3 sentences) of the historical revenue trend, noting any growth, decline, or seasonality."),
    profitMarginAnalysis: z.string().describe("A brief analysis (2-3 sentences) of the historical profit margins and factors that might be influencing it, considering both COGS and operational expenses."),
    topPerformingItems: z.array(z.string()).describe("A list of the top 3-5 menu items expected to be the main drivers of revenue in the next 30 days."),
    recommendations: z.string().describe("One or two actionable recommendations for the business based on the financial analysis (e.g., 'Consider a promotion for slow-moving items' or 'Restock on key ingredients for top sellers')."),
    confidenceScore: z.number().min(0).max(1).describe("The AI's confidence in this projection, from 0.0 (not confident) to 1.0 (very confident), based on the quality and consistency of historical data."),
});
export type AutomatedFinancialProjectionOutput = z.infer<typeof AutomatedFinancialProjectionOutputSchema>;

export async function runAutomatedFinancialProjection(input: AutomatedFinancialProjectionInput): Promise<AutomatedFinancialProjectionOutput> {
  const validatedInput = AutomatedFinancialProjectionInputSchema.parse(input);
  return automatedFinancialProjectionFlow(validatedInput);
}

const projectionPrompt = ai.definePrompt({
    name: 'automatedFinancialProjectionPrompt',
    input: { schema: AutomatedFinancialProjectionInputSchema },
    output: { schema: AutomatedFinancialProjectionOutputSchema },
    prompt: `You are an expert financial analyst for a cafe named BrewFlow. Your task is to generate a 30-day financial forecast based on the provided historical data.

    **Analysis Instructions:**

    1.  **Analyze Revenue and Profit:** Review the historical sales data. Calculate the average daily revenue and profit. Identify any clear upward or downward trends, or weekly patterns (e.g., busy weekends).
    2.  **Analyze Expenses:** Review the historical expense data to understand operational costs.
    3.  **Project Future Performance:** Based on the trends in sales and expenses, project the total revenue and profit for the next 30 days. Be realistic; if trends are flat, don't project significant growth unless there's a clear reason. Your profit projection must account for both COGS (from sales data) and operational expenses.
    4.  **Identify Key Drivers:** Look at the menu item costs and prices alongside sales data to determine which items are the most profitable and popular. These will be your top-performing items.
    5.  **Provide Actionable Insights:** Based on your entire analysis, provide concise, practical recommendations. For example, if profit margins are shrinking due to rising expenses, suggest a review of spending.
    6.  **Assess Confidence:** Evaluate the consistency of the provided data. If sales are highly erratic or data is sparse, assign a lower confidence score. If sales are stable and predictable, assign a higher score.

    **Input Data:**

    -   **Historical Sales (JSON):** {{{historicalSales}}}
    -   **Historical Expenses (JSON):** {{{historicalExpenses}}}
    -   **Current Inventory (JSON):** {{{inventoryLevels}}}
    -   **Menu Item Details (JSON):** {{{menuItems}}}

    Please provide your analysis in the required JSON output format.
    `,
});

const automatedFinancialProjectionFlow = ai.defineFlow(
  {
    name: 'automatedFinancialProjectionFlow',
    inputSchema: AutomatedFinancialProjectionInputSchema,
    outputSchema: AutomatedFinancialProjectionOutputSchema,
  },
  async (input) => {
    const { output } = await projectionPrompt(input);
    return output!;
  }
);