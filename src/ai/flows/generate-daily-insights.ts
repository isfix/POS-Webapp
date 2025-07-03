'use server';
/**
 * @fileOverview An AI flow to generate daily operational insights and notifications for the cafe.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SalesDataItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  profit: z.number(),
  date: z.string(),
});

const InventoryDataItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  minThreshold: z.number(),
  lastUpdated: z.string(),
});

const AssetDataItemSchema = z.object({
  name: z.string(),
  status: z.string(),
  assignedTo: z.string().optional(),
  maintenanceDate: z.string().optional(),
  purchaseDate: z.string(),
});

const DailyInsightsInputSchema = z.object({
  salesData: z.array(SalesDataItemSchema).describe('Sales data for the last 14 days.'),
  inventoryData: z.array(InventoryDataItemSchema).describe('Current inventory levels.'),
  assetData: z.array(AssetDataItemSchema).describe('Current asset status.'),
});

const NotificationSchema = z.object({
    title: z.string().describe("A short, catchy title for the notification."),
    body: z.string().describe("A concise, one-sentence description of the alert, suitable for a notification dropdown."),
    type: z.enum(['low_stock', 'slow_moving', 'idle_asset', 'profit_anomaly']).describe("The category of the notification."),
});


const DailyInsightsOutputSchema = z.object({
    lowStockItems: z.array(z.string()).describe("Actionable alerts for inventory items where the quantity is at or below the minimum threshold. Format: '[Item Name] is low (quantity/threshold)!'"),
    topSellingItems: z.array(z.string()).describe("List of the top 3 selling items by quantity sold in the last 7 days. Format: '[Item Name] (Sold [Total Quantity])'"),
    slowMovingItems: z.array(z.string()).describe("List of menu items that have not sold at all in the last 7 days. Format: '[Item Name]'"),
    idleAssets: z.array(z.string()).describe("List of assets that are 'Active' but are not assigned to anyone and have no scheduled maintenance. Format: '[Asset Name]'"),
    profitAnomalies: z.array(z.string()).describe("Alerts for items with high sales volume but unusually low total profit, or other profit-related issues. Format: '[Item Name] has high sales but low profit.'"),
    overallSummary: z.string().describe("A brief, 1-2 sentence summary of the most critical operational insights for the day."),
    notifications: z.array(NotificationSchema).describe("A list of structured notifications for the user based on the most critical findings."),
});
export type DailyInsightsOutput = z.infer<typeof DailyInsightsOutputSchema>;

// This is the main function that will be called by the server action.
export async function runGenerateDailyInsights(input: z.infer<typeof DailyInsightsInputSchema>): Promise<DailyInsightsOutput> {
  const validatedInput = DailyInsightsInputSchema.parse(input);
  return dailyInsightsFlow(validatedInput);
}

const insightsPrompt = ai.definePrompt({
    name: 'dailyInsightsPrompt',
    input: { schema: DailyInsightsInputSchema },
    output: { schema: DailyInsightsOutputSchema },
    prompt: `You are an expert cafe operations analyst for a cafe called BrewFlow. Your task is to analyze the provided data and generate actionable insights and notifications for the cafe manager. Today's date is ${new Date().toDateString()}.

    You will be given JSON data for sales, inventory, and assets. Based on this data, you must identify key operational issues and highlights.

    **Analysis Criteria & Output Generation:**

    1.  **Low Stock:** Analyze the inventory data. Identify every item where the current 'quantity' is less than or equal to its 'minThreshold'.
        - For the 'lowStockItems' array: Create a descriptive string for each. Format: '[Item Name] is low (quantity/threshold)!'
        - For the 'notifications' array: For each low stock item, create a notification object with type 'low_stock'. Title: "Low Stock Alert", Body: "Restock [Item Name] soon."

    2.  **Top Sellers:** From the sales data of the last 7 days, identify the top 3 selling menu items based on total quantity sold.
        - Add them to the 'topSellingItems' array. Format: '[Item Name] (Sold [Total Quantity])'

    3.  **Slow Movers:** Analyze the sales data. Identify any menu item that has sold zero units in the last 7 days.
        - Add their names to the 'slowMovingItems' array.
        - For each slow-moving item, create a notification object in the 'notifications' array with type 'slow_moving'. Title: "Slow Mover", Body: "Consider promoting or removing [Item Name]."

    4.  **Idle Assets:** Analyze the asset data. Identify any asset whose status is 'Active' but has no value for 'assignedTo'.
        - Add their names to the 'idleAssets' array.
        - For each idle asset, create a notification object in the 'notifications' array with type 'idle_asset'. Title: "Idle Asset", Body: "[Asset Name] is not assigned to anyone."
        
    5.  **Profit Anomalies:** Analyze the sales data. Look for items that have a high sales quantity but a disproportionately low total profit.
        - Mention these in the 'profitAnomalies' array.
        - For each, create a notification object in the 'notifications' array with type 'profit_anomaly'. Title: "Profit Anomaly", Body: "Review the pricing for [Item Name]."
        
    6.  **Overall Summary:** Write a very brief, 1-2 sentence summary of the most critical findings for the day. This should be a high-level overview.

    7.  **Notifications:** Consolidate the most critical findings into the 'notifications' array as described above. If there are no critical findings, this array should be empty.


    Here is the data:
    - Sales (last 14 days): {{{json salesData}}}
    - Inventory: {{{json inventoryData}}}
    - Assets: {{{json assetData}}}
    `,
});

const dailyInsightsFlow = ai.defineFlow(
  {
    name: 'dailyInsightsFlow',
    inputSchema: DailyInsightsInputSchema,
    outputSchema: DailyInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await insightsPrompt(input);
    return output!;
  }
);
