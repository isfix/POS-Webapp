'use server';

/**
 * @fileOverview An AI agent for automatically inputting and adjusting data related to cafe updates from staff announcements.
 *
 * - dataEntryTool - A function that handles the data entry process based on staff announcements.
 * - DataEntryToolInput - The input type for the dataEntryTool function.
 * - DataEntryToolOutput - The return type for the dataEntryTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataEntryToolInputSchema = z.object({
  staffAnnouncement: z
    .string()
    .describe('The staff announcement containing updates to the cafe.'),
});
export type DataEntryToolInput = z.infer<typeof DataEntryToolInputSchema>;

const DataEntryToolOutputSchema = z.object({
  dataUpdateSummary: z
    .string()
    .describe('A summary of the data updates based on the staff announcement.'),
  updatedData: z.record(z.any()).describe('The specific data that was updated, in JSON format.'),
});
export type DataEntryToolOutput = z.infer<typeof DataEntryToolOutputSchema>;

export async function dataEntryTool(input: DataEntryToolInput): Promise<DataEntryToolOutput> {
  return dataEntryToolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dataEntryToolPrompt',
  input: {schema: DataEntryToolInputSchema},
  output: {schema: DataEntryToolOutputSchema},
  prompt: `You are an AI assistant designed to automatically input and adjust data related to updates to a cafe from staff announcements.

  Analyze the staff announcement provided, identify the key data points that need to be updated, and return a summary of the updates and the specific data that was updated in JSON format.

  Staff Announcement: {{{staffAnnouncement}}}

  Ensure that the JSON output is well-formatted and easy to parse.
`,
});

const dataEntryToolFlow = ai.defineFlow(
  {
    name: 'dataEntryToolFlow',
    inputSchema: DataEntryToolInputSchema,
    outputSchema: DataEntryToolOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
