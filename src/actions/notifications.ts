'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export async function markNotificationAsSeen(notificationId: string): Promise<void> {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { seen: true });
    } catch (error) {
        console.error("Error marking notification as seen:", error);
        throw new Error("Could not update notification status.");
    }
}

export async function markAllNotificationsAsSeen(): Promise<void> {
    try {
        const q = query(collection(db, 'notifications'), where('seen', '==', false));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, { seen: true });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error marking all notifications as seen:", error);
        throw new Error("Could not update notification statuses.");
    }
}
