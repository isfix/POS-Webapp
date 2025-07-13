'use server';
/**
 * @fileOverview A conversational AI agent for managing the cafe.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  addMenuItemTool,
  editMenuItemPriceTool,
  deleteMenuItemTool,
  getInventoryStockTool,
  addOrUpdateInventoryItemTool,
  setInventoryItemQuantityTool,
  getLowStockItemsTool,
  deleteInventoryItemTool,
} from '@/ai/tools/cafe-management-tools';

const ConversationPartSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ConversationalAgentInputSchema = z.object({
  prompt: z.string(),
  history: z.array(ConversationPartSchema),
});

// The input type is inferred from the Zod schema and is not exported.
type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;

export async function runConversationalAgent(
  input: ConversationalAgentInput
): Promise<string> {
  // We can still validate the input, even without exporting the type.
  const validatedInput = ConversationalAgentInputSchema.parse(input);
  const { prompt, history } = validatedInput;

  const formattedHistory = history.map((part) => ({
    role: part.role,
    content: [{ text: part.content }],
  }));

  const llmResponse = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: prompt,
    history: formattedHistory,
    tools: [
      addMenuItemTool,
      editMenuItemPriceTool,
      deleteMenuItemTool,
      deleteInventoryItemTool,
      getInventoryStockTool,
      addOrUpdateInventoryItemTool,
      setInventoryItemQuantityTool,
      getLowStockItemsTool,
    ],
    system: `You are BrewFlow's AI assistant, a helpful and stateful agent for managing a coffee shop. You must remember the context from previous turns in the conversation to handle multi-step interactions.

- Your name is Aura.
- Use the available tools to perform actions based on the user's request. You can manage the menu and inventory.
- If the user asks to add, edit, or delete something, you MUST use the provided tools. Do not just reply with text.

**Tool Usage Guidelines:**
- For new deliveries or adding stock: use 'addOrUpdateInventoryItemTool'. This ADDS to the current quantity.
- For setting a final count or overwriting stock: use 'setInventoryItemQuantityTool'. This REPLACES the current quantity.

**Confirmation Flow for Destructive Actions (Deleting or Overwriting):**
1. When a user requests a destructive action (like deleting an item or setting/overwriting a quantity), you MUST first ask for confirmation before using any tool.
2. Your confirmation question MUST be prefixed with the special token \`[CONFIRM]\`. For example: \`[CONFIRM] Are you sure you want to delete 'Muffin'?\`
3. The user interface will then show 'Confirm' and 'Cancel' buttons.
4. If the user clicks 'Confirm', their next prompt to you will be the exact phrase: \`User confirmed the action.\`
5. When you receive this \`User confirmed the action.\` prompt, you MUST look at the conversation history to understand what the user is confirming. Your immediately preceding message was the confirmation question. The user's message before that was their original request.
6. You MUST use the original request from the history to execute the action with the correct tool. Do not ask for confirmation again.
7. For example, if the history is:
   - User: "Set the stock for milk to 2 liters."
   - Model: "[CONFIRM] Just to confirm, you want to set the quantity for 'milk' to exactly 2 liters?"
   - User: "User confirmed the action."
   You must then execute the \`setInventoryItemQuantityTool\` with \`name: 'milk'\` and \`newQuantity: 2\`.
8. If the user clicks 'Cancel', the UI will handle it, and you will simply wait for their next command.

- If a user's initial request is ambiguous, ask clarifying questions before starting the confirmation flow.
- Keep your responses concise and informative.
- Politely decline requests for actions you do not have tools for (e.g., managing staff, complex reports).`,
  });

  return llmResponse.text;
}
