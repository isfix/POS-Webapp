'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, setDoc, Timestamp, where, orderBy, limit } from 'firebase/firestore';
import { format, startOfDay, endOfDay } from 'date-fns';

export type DailySummary = {
    id: string; // YYYY-MM-DD
    timestamp: Timestamp;
    totalRevenue: number;
    totalOrders: number;
    topItems: { name: string; quantity: number }[];
    lowStockCount: number;
    maintenanceAssetsCount: number;
    // For expansion
    lowStockItems: string[];
    maintenanceAssets: string[];
};

// This action generates the summary for a specific day.
// In a real scenario, a Cloud Function would call this for `new Date()`.
export async function generateDailySummaryForDate(date: Date): Promise<DailySummary> {
    try {
        const start = startOfDay(date);
        const end = endOfDay(date);
        const dateId = format(date, 'yyyy-MM-dd');

        // 1. Aggregate Sales Data
        const salesQuery = query(collection(db, 'orders'), where('timestamp', '>=', start), where('timestamp', '<=', end));
        const salesSnapshot = await getDocs(salesQuery);

        let totalRevenue = 0;
        const itemCounts: { [key: string]: number } = {};
        salesSnapshot.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.grossRevenue || 0;
            order.items.forEach((item: any) => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const topItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));

        // 2. Aggregate Inventory Data
        const inventoryQuery = query(collection(db, 'inventory'));
        const inventorySnapshot = await getDocs(inventoryQuery);
        const lowStockItems: string[] = [];
        inventorySnapshot.forEach(doc => {
            const item = doc.data();
            if (item.quantity <= item.minThreshold) {
                lowStockItems.push(item.name);
            }
        });

        // 3. Aggregate Asset Data
        const assetsQuery = query(collection(db, 'assets'), where('status', '==', 'In Repair'));
        const assetsSnapshot = await getDocs(assetsQuery);
        const maintenanceAssets = assetsSnapshot.docs.map(doc => doc.data().name);

        // 4. Construct Summary
        const summaryData = {
            timestamp: Timestamp.fromDate(date),
            totalRevenue,
            totalOrders: salesSnapshot.size,
            topItems,
            lowStockCount: lowStockItems.length,
            maintenanceAssetsCount: maintenanceAssets.length,
            lowStockItems,
            maintenanceAssets
        };

        // 5. Store Summary in Firestore
        const summaryDocRef = doc(db, 'dailySummaries', dateId);
        await setDoc(summaryDocRef, summaryData);
        
        return { id: dateId, ...summaryData };

    } catch (error) {
        console.error(`Error generating summary for ${format(date, 'yyyy-MM-dd')}:`, error);
        throw new Error("Failed to generate daily summary.");
    }
}

// This action fetches the last 10 summaries for the dashboard.
export async function getLatestDailySummaries(count: number = 10): Promise<DailySummary[]> {
    try {
        const q = query(collection(db, 'dailySummaries'), orderBy('timestamp', 'desc'), limit(count));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return [];
        }

        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailySummary));
    } catch (error) {
        console.error("Error fetching daily summaries:", error);
        return [];
    }
}
