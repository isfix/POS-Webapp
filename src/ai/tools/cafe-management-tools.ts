'use server';
/**
 * @fileOverview Genkit tools for interacting with the Firestore database.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

// Tool to add a new menu item
export const addMenuItemTool = ai.defineTool(
  {
    name: 'addMenuItem',
    description: 'Adds a new item to the cafe menu.',
    inputSchema: z.object({
      name: z.string().describe('The name of the menu item.'),
      category: z.string().describe('The category of the item (e.g., Coffee, Tea, Snack).'),
      price: z.number().describe('The price of the item.'),
      availability: z.boolean().default(true).describe('Whether the item is available for sale.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const batch = writeBatch(db);
      
      const newItemRef = doc(collection(db, 'menuItems'));
      const newItemData = {
        ...input,
        name: input.name.toLowerCase(),
        category: input.category.toLowerCase(),
      };
      batch.set(newItemRef, newItemData);
      
      const actionLog = `AI added new item '${input.name}' to the menu.`;
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
          user: 'Aura AI',
          action: actionLog,
          timestamp: Timestamp.now(),
      });
      
      await batch.commit();
      
      return `Successfully added "${input.name}" to the menu.`;
    } catch (e) {
      console.error(e);
      return 'Failed to add menu item due to an unexpected error.';
    }
  }
);

// Tool to edit the price of an existing menu item
export const editMenuItemPriceTool = ai.defineTool(
  {
    name: 'editMenuItemPrice',
    description: "Edits the price of an existing menu item.",
    inputSchema: z.object({
      name: z.string().describe("The name of the item to edit."),
      newPrice: z.number().describe("The new price for the item."),
    }),
    outputSchema: z.string(),
  },
  async ({ name, newPrice }) => {
    try {
      const q = query(collection(db, 'menuItems'), where('name', '==', name.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return `Could not find an item named "${name}".`;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { price: newPrice });
      });

      const actionLog = `AI updated price of '${name}' to Rp ${newPrice}.`;
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
          user: 'Aura AI',
          action: actionLog,
          timestamp: Timestamp.now(),
      });
      
      await batch.commit();
      
      return `Successfully updated the price of "${name}" to Rp ${newPrice}.`;
    } catch (e) {
      console.error(e);
      return 'Failed to update menu item due to an unexpected error.';
    }
  }
);

// Tool to delete a menu item
export const deleteMenuItemTool = ai.defineTool(
    {
        name: 'deleteMenuItem',
        description: 'Deletes an item from the menu.',
        inputSchema: z.object({
            name: z.string().describe('The name of the menu item to delete.'),
        }),
        outputSchema: z.string(),
    },
    async ({ name }) => {
        try {
            const q = query(collection(db, 'menuItems'), where('name', '==', name.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return `Could not find an item named "${name}" to delete.`;
            }

            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            const actionLog = `AI deleted item '${name}' from the menu.`;
            const logRef = doc(collection(db, 'activityLogs'));
            batch.set(logRef, {
                user: 'Aura AI',
                action: actionLog,
                timestamp: Timestamp.now(),
            });

            await batch.commit();

            return `Successfully deleted "${name}" from the menu.`;
        } catch (e) {
            console.error(e);
            return 'Failed to delete menu item due to an unexpected error.';
        }
    }
);

// Tool to delete an inventory item
export const deleteInventoryItemTool = ai.defineTool(
    {
        name: 'deleteInventoryItem',
        description: 'Deletes an item from the inventory.',
        inputSchema: z.object({
            name: z.string().describe('The name of the inventory item to delete.'),
        }),
        outputSchema: z.string(),
    },
    async ({ name }) => {
        try {
            const lowercasedName = name.toLowerCase();
            const q = query(collection(db, 'inventory'), where('name', '==', lowercasedName));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return `Could not find an inventory item named "${name}" to delete.`;
            }

            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            const actionLog = `AI deleted inventory item '${name}'.`;
            const logRef = doc(collection(db, 'activityLogs'));
            batch.set(logRef, {
                user: 'Aura AI',
                action: actionLog,
                timestamp: Timestamp.now(),
            });

            await batch.commit();

            return `Successfully deleted "${name}" from the inventory.`;
        } catch (e) {
            console.error(e);
            return 'Failed to delete inventory item due to an unexpected error.';
        }
    }
);


// Tool to get the stock level of an inventory item
export const getInventoryStockTool = ai.defineTool(
    {
        name: 'getInventoryStock',
        description: 'Checks the current stock level of a specific inventory item.',
        inputSchema: z.object({
            name: z.string().describe("The name of the inventory item to check."),
        }),
        outputSchema: z.string(),
    },
    async ({ name }) => {
        try {
            const q = query(collection(db, 'inventory'), where('name', '==', name.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return `Could not find an inventory item named "${name}".`;
            }
            
            const item = querySnapshot.docs[0].data();
            return `There are ${item.quantity} ${item.unitType} of ${item.name} left in stock.`;

        } catch (e) {
            console.error(e);
            return 'Failed to retrieve inventory stock due to an unexpected error.';
        }
    }
);

// Tool to add or update an inventory item
export const addOrUpdateInventoryItemTool = ai.defineTool(
  {
    name: 'addOrUpdateInventoryItem',
    description: 'Adds quantity to an item in the inventory. If the item exists, its quantity is increased by the specified amount. If not, a new item is created with some sensible defaults. Use this for new deliveries or when adding stock.',
    inputSchema: z.object({
      name: z.string().describe('The name of the inventory item.'),
      quantity: z.number().describe('The quantity to add to the stock.'),
      unitType: z.string().describe('The unit of measurement (e.g., kg, pack, item).'),
    }),
    outputSchema: z.string(),
  },
  async ({ name, quantity, unitType }) => {
    try {
      const lowercasedName = name.toLowerCase();
      const q = query(collection(db, 'inventory'), where('name', '==', lowercasedName));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let actionLog = '';

      if (querySnapshot.empty) {
        // Create new item since it doesn't exist
        const newItemRef = doc(collection(db, 'inventory')); // Auto-generate ID
        batch.set(newItemRef, {
          name: lowercasedName,
          quantity,
          unitType: unitType.toLowerCase(),
          category: 'Ingredients', // Default category
          minThreshold: 10, // Default threshold
          costPerUnit: 0, // Default cost
          lastUpdated: Timestamp.now(),
        });
        actionLog = `AI added new item '${name}' (${quantity} ${unitType}) to inventory.`;
      } else {
        // Update existing item's quantity
        const docRef = querySnapshot.docs[0].ref;
        const currentData = querySnapshot.docs[0].data();
        const newQuantity = (currentData.quantity || 0) + quantity;
        batch.update(docRef, { 
            quantity: newQuantity,
            lastUpdated: Timestamp.now()
        });
        actionLog = `AI updated inventory for '${name}'. Added ${quantity} ${unitType}, new total: ${newQuantity}.`;
      }
      
      // Log the action to the central activity log
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
          user: 'Aura AI',
          action: actionLog,
          timestamp: Timestamp.now(),
      });

      await batch.commit();
      return actionLog; // Return the log message as confirmation to the user

    } catch (e) {
      console.error(e);
      return 'Failed to update inventory due to an unexpected error.';
    }
  }
);

// New tool to set/overwrite the quantity of an inventory item
export const setInventoryItemQuantityTool = ai.defineTool(
  {
    name: 'setInventoryItemQuantity',
    description: 'Sets or overwrites the quantity of an existing inventory item to a specific number. Use this when a user wants to declare a final count, not add to it.',
    inputSchema: z.object({
      name: z.string().describe('The name of the inventory item.'),
      newQuantity: z.number().describe('The new total quantity for the item.'),
    }),
    outputSchema: z.string(),
  },
  async ({ name, newQuantity }) => {
    try {
      const lowercasedName = name.toLowerCase();
      const q = query(collection(db, 'inventory'), where('name', '==', lowercasedName));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      if (querySnapshot.empty) {
        return `Could not find an inventory item named "${name}" to update. You can add it as a new item.`;
      }
      
      const docRef = querySnapshot.docs[0].ref;
      const currentData = querySnapshot.docs[0].data();
      const oldQuantity = currentData.quantity || 0;

      batch.update(docRef, { 
          quantity: newQuantity,
          lastUpdated: Timestamp.now()
      });

      const actionLog = `AI set quantity for '${name}' from ${oldQuantity} to ${newQuantity}.`;
      
      // Log the action to the central activity log
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
          user: 'Aura AI',
          action: actionLog,
          timestamp: Timestamp.now(),
      });

      await batch.commit();
      return `Successfully set quantity for "${name}" to ${newQuantity}.`;

    } catch (e) {
      console.error(e);
      return 'Failed to set inventory quantity due to an unexpected error.';
    }
  }
);


// Tool to get all items that are low in stock
export const getLowStockItemsTool = ai.defineTool(
    {
        name: 'getLowStockItems',
        description: 'Retrieves a list of all inventory items that are at or below their minimum stock threshold.',
        inputSchema: z.object({}), // No input needed
        outputSchema: z.string(),
    },
    async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'inventory'));
            const lowStockItems: string[] = [];

            querySnapshot.forEach((doc) => {
                const item = doc.data();
                if (item.quantity <= item.minThreshold) {
                    lowStockItems.push(`${item.name} (only ${item.quantity} ${item.unitType} left)`);
                }
            });

            if (lowStockItems.length === 0) {
                return 'No items are currently low on stock.';
            }

            return `The following items are low on stock: ${lowStockItems.join(', ')}.`;

        } catch (e) {
            console.error(e);
            return 'Failed to retrieve low stock items due to an unexpected error.';
        }
    }
);
