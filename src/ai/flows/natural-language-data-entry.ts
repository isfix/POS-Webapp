// src/ai/flows/natural-language-data-entry.ts
'use server';

/**
 * @fileOverview Parses natural language input to pre-fill form data.
 *
 * - aiPoweredDataEntry - A function that takes natural language input and returns structured data.
 * - AiPoweredDataEntryInput - The input type for the aiPoweredDataEntry function.
 * - AiPoweredDataEntryOutput - The output type for the aiPoweredDataEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiPoweredDataEntryInputSchema = z.object({
  naturalLanguageInput: z
    .string()
    .describe('The natural language input to parse for form data.'),
});
export type AiPoweredDataEntryInput = z.infer<typeof AiPoweredDataEntryInputSchema>;

const AiPoweredDataEntryOutputSchema = z.object({
  formData: z
    .record(z.any())
    .describe('The structured data extracted from the natural language input.'),
});
export type AiPoweredDataEntryOutput = z.infer<typeof AiPoweredDataEntryOutputSchema>;

export async function aiPoweredDataEntry(input: AiPoweredDataEntryInput): Promise<AiPoweredDataEntryOutput> {
  return aiPoweredDataEntryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiPoweredDataEntryPrompt',
  input: {schema: AiPoweredDataEntryInputSchema},
  output: {schema: AiPoweredDataEntryOutputSchema},
  prompt: `You are an AI assistant that parses natural language input to pre-fill form data.

  Given the following natural language input:
  {{naturalLanguageInput}}

  Extract the relevant information and return it as a JSON object.
  The keys of the JSON object should correspond to the fields in the form.
  If a field cannot be extracted from the input, set its value to null.
  Ensure that the output is a valid JSON object.
  `, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const aiPoweredDataEntryFlow = ai.defineFlow(
  {
    name: 'aiPoweredDataEntryFlow',
    inputSchema: AiPoweredDataEntryInputSchema,
    outputSchema: AiPoweredDataEntryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
