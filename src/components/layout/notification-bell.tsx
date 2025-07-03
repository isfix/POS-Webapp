'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { markNotificationAsSeen, markAllNotificationsAsSeen } from '@/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useNotifications } from '@/context/NotificationContext';

export function NotificationBell() {
    const { notifications, unseenCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();


    const handleMarkAsSeen = async (id: string) => {
        try {
            await markNotificationAsSeen(id);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to mark notification as read.', variant: 'destructive' });
        }
    };

    const handleMarkAllAsSeen = async () => {
        try {
            await markAllNotificationsAsSeen();
            toast({ title: 'Success', description: 'All notifications marked as read.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to mark all notifications as read.', variant: 'destructive' });
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8"
                >
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                    {unseenCount > 0 && (
                         <div className="absolute top-1 right-1">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-80 p-0" 
                align="end" 
            >
                <Card className="border-0 shadow-none">
                    <CardHeader className="py-4 px-4">
                        <CardTitle className="text-base">Notifications</CardTitle>
                    </CardHeader>
                    <Separator />
                    <ScrollArea className="h-80">
                        <div className="p-4 space-y-4">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} className="flex items-start gap-3">
                                    <div className={cn("mt-1 flex h-2 w-2 rounded-full", !n.seen ? "bg-primary" : "bg-transparent")} />
                                    <div className="grid gap-1 flex-1">
                                        <p className="text-sm font-medium leading-none">{n.title}</p>
                                        <p className="text-sm text-muted-foreground">{n.body}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!n.seen && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6" 
                                            onClick={() => handleMarkAsSeen(n.id)}
                                            title="Mark as read"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-10">You're all caught up!</p>
                        )}
                        </div>
                    </ScrollArea>
                    {unseenCount > 0 && (
                        <>
                            <Separator />
                            <CardFooter className="py-2 px-4">
                                <Button variant="link" size="sm" className="w-full" onClick={handleMarkAllAsSeen}>
                                    Mark all as read
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </PopoverContent>
        </Popover>
    );
}
