'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, setDoc, doc, orderBy, limit, writeBatch } from 'firebase/firestore';
import { runGenerateDailyInsights } from '@/ai/flows/generate-daily-insights';
import type { DailyInsightsOutput } from '@/ai/flows/generate-daily-insights';
import { subDays, format } from 'date-fns';

export type DailyInsight = Omit<DailyInsightsOutput, 'notifications'> & {
    id: string;
    timestamp: Timestamp;
};

// This is the main action to trigger the analysis
export async function generateAndStoreDailyAnalysis(): Promise<DailyInsight | null> {
    try {
        // 1. Fetch Data from Firestore
        const fourteenDaysAgo = subDays(new Date(), 14);
        const salesQuery = query(collection(db, 'orders'), where('timestamp', '>=', fourteenDaysAgo));
        const inventoryQuery = query(collection(db, 'inventory'));
        const assetsQuery = query(collection(db, 'assets'));

        const [salesSnapshot, inventorySnapshot, assetsSnapshot] = await Promise.all([
            getDocs(salesQuery),
            getDocs(inventoryQuery),
            getDocs(assetsQuery),
        ]);
        
        // 2. Process data for the AI flow
        const salesData = salesSnapshot.docs.flatMap(doc => {
            const order = doc.data();
            return order.items.map((item: any) => ({
                name: item.name,
                quantity: item.quantity,
                profit: (item.price - item.costPrice) * item.quantity,
                date: (order.timestamp as Timestamp).toDate().toISOString(),
            }));
        });
        
        const inventoryData = inventorySnapshot.docs.map(doc => {
            const item = doc.data();
            return {
                name: item.name,
                quantity: item.quantity,
                minThreshold: item.minThreshold,
                lastUpdated: (item.lastUpdated as Timestamp).toDate().toISOString(),
            };
        });
        
        const assetData = assetsSnapshot.docs.map(doc => {
            const asset = doc.data();
            return {
                name: asset.name,
                status: asset.status,
                assignedTo: asset.assignedTo,
                maintenanceDate: asset.maintenanceDate ? (asset.maintenanceDate as Timestamp).toDate().toISOString() : undefined,
                purchaseDate: (asset.purchaseDate as Timestamp).toDate().toISOString(),
            };
        });

        // 3. Call the AI Flow
        const insightsAndNotifications = await runGenerateDailyInsights({ salesData, inventoryData, assetData });
        
        const { notifications, ...insights } = insightsAndNotifications;
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const insightDocRef = doc(db, 'dailyInsights', today);
        const insightData = {
            ...insights,
            timestamp: Timestamp.now(),
        };

        const batch = writeBatch(db);

        // Set the insight document
        batch.set(insightDocRef, insightData);

        // Add new notification documents
        if (notifications && notifications.length > 0) {
            notifications.forEach(notification => {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    ...notification,
                    seen: false,
                    timestamp: Timestamp.now(),
                });
            });
        }
        
        await batch.commit();

        return { id: today, ...insightData };

    } catch (error) {
        console.error("Error generating daily analysis:", error);
        throw new Error("Failed to generate daily analysis.");
    }
}

// Action to get the latest insight
export async function getLatestDailyInsight(): Promise<DailyInsight | null> {
    try {
        const q = query(collection(db, 'dailyInsights'), orderBy('timestamp', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as DailyInsight;
    } catch (error) {
        console.error("Error fetching latest daily insight:", error);
        return null;
    }
}
