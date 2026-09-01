'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { markNotificationAsSeen, markAllNotificationsAsSeen } from '@/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { cn, parseSafeDate } from '@/lib/utils';
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
            toast({ title: 'Gagal', description: 'Gagal menandai notifikasi sudah dibaca.', variant: 'destructive' });
        }
    };

    const handleMarkAllAsSeen = async () => {
        try {
            await markAllNotificationsAsSeen();
            toast({ title: 'Berhasil', description: 'Semua notifikasi ditandai sudah dibaca.' });
        } catch (error) {
            toast({ title: 'Gagal', description: 'Gagal memperbarui notifikasi.', variant: 'destructive' });
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-foreground"
                >
                    <Bell className="h-4 w-4" />
                    <span className="sr-only">Notifikasi</span>
                    {unseenCount > 0 && (
                         <div className="absolute top-1 right-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-80 p-0 shadow-lg border border-border" 
                align="end" 
            >
                <Card className="border-0 shadow-none">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-bold">Pemberitahuan</CardTitle>
                    </CardHeader>
                    <Separator />
                    <ScrollArea className="h-72">
                        <div className="p-3 space-y-3">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <div className={cn("mt-1.5 flex h-2 w-2 rounded-full shrink-0", !n.seen ? "bg-primary" : "bg-transparent")} />
                                    <div className="grid gap-0.5 flex-1">
                                        <p className="text-xs font-semibold leading-tight">{n.title}</p>
                                        <p className="text-xs text-muted-foreground">{n.body}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {formatDistanceToNow(parseSafeDate(n.timestamp), { addSuffix: true, locale: idLocale })}
                                        </p>
                                    </div>
                                    {!n.seen && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 text-muted-foreground hover:text-foreground" 
                                            onClick={() => handleMarkAsSeen(n.id)}
                                            title="Tandai sudah dibaca"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-muted-foreground py-8">Tidak ada notifikasi baru.</p>
                        )}
                        </div>
                    </ScrollArea>
                    {unseenCount > 0 && (
                        <>
                            <Separator />
                            <CardFooter className="py-2 px-4">
                                <Button variant="ghost" size="sm" className="w-full text-xs font-semibold text-primary" onClick={handleMarkAllAsSeen}>
                                    Tandai semua sudah dibaca
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </PopoverContent>
        </Popover>
    );
}
