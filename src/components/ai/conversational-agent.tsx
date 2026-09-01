'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { runAgent, type ConversationHistory } from '@/actions/ai';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const chatSchema = z.object({
  prompt: z.string().min(1, 'Pesan tidak boleh kosong.'),
});
type ChatInput = z.infer<typeof chatSchema>;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isConfirmationRequest?: boolean;
  confirmationStatus?: 'pending' | 'confirmed' | 'cancelled';
};

const CONFIRMATION_TOKEN = '[CONFIRM]';

export function ConversationalAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatInput>({
    resolver: zodResolver(chatSchema),
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    if (errors.prompt) {
      toast({ title: 'Perhatian', description: errors.prompt.message, variant: 'destructive' });
    }
  }, [errors.prompt, toast]);

  const executeAgentTurn = async (prompt: string, currentHistory: ConversationHistory) => {
    setIsLoading(true);
    try {
      const assistantResponse = await runAgent(prompt, currentHistory);
      const isConfirmation = assistantResponse.startsWith(CONFIRMATION_TOKEN);
      const content = isConfirmation ? assistantResponse.replace(CONFIRMATION_TOKEN, '').trim() : assistantResponse;

      const newAssistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: content,
        isConfirmationRequest: isConfirmation,
        confirmationStatus: isConfirmation ? 'pending' : undefined,
      };
      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error('Error running agent:', error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat memproses permintaan AI.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ChatInput> = async (data) => {
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: data.prompt };

    const currentHistory: ConversationHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: msg.content,
    }));
    
    setMessages((prev) => [...prev, userMessage]);
    reset();

    await executeAgentTurn(data.prompt, currentHistory);
  };
  
  const handleConfirm = async (messageId: string) => {
    const updatedMessages: Message[] = messages.map(m => m.id === messageId ? ({ ...m, confirmationStatus: 'confirmed' as const }) : m);
    
    const userConfirmMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: 'User confirmed the action.' };
    const messagesWithConfirmation: Message[] = [...updatedMessages, userConfirmMessage];
    setMessages(messagesWithConfirmation);

    const historyForConfirmation: ConversationHistory = updatedMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: msg.isConfirmationRequest ? `${CONFIRMATION_TOKEN} ${msg.content}` : msg.content,
    }));

    await executeAgentTurn('User confirmed the action.', historyForConfirmation);
  };

  const handleCancel = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? ({ ...m, confirmationStatus: 'cancelled' as const }) : m));
    const assistantResponseMessage: Message = { id: `asst-${Date.now()}`, role: 'assistant', content: "Baik, permintaan tersebut telah dibatalkan." };
    setMessages(prev => [...prev, assistantResponseMessage]);
  };

  return (
    <Card className="h-full flex flex-col max-h-[calc(100vh-12rem)] border border-border shadow-sm bg-card">
      <CardContent className="flex-grow p-4 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-3 pr-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <Bot className="h-10 w-10 mb-3 text-primary" />
                <h2 className="text-base font-bold text-foreground mb-1">Asisten AI POS</h2>
                <p className="text-xs">Asisten cerdas untuk operasional kasir dan toko. Coba tanyakan hal seperti:</p>
                <ul className="list-disc list-inside mt-2 text-left text-xs space-y-1 bg-secondary/50 p-3 rounded-lg border border-border">
                  <li>"Tambah menu 'Croissant Butter' kategori Pastry seharga 25.000"</li>
                  <li>"Berapa sisa stok 'Tepung Terigu' di gudang?"</li>
                  <li>"Bahan apa saja yang stoknya sudah menipis hari ini?"</li>
                </ul>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={cn(
                    'flex items-start gap-2.5',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0 border border-primary/30">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs"><Bot className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-3.5 py-2 text-xs whitespace-pre-wrap leading-relaxed shadow-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-secondary text-foreground border border-border'
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-7 w-7 shrink-0 border border-border">
                      <AvatarFallback className="bg-muted text-foreground text-xs"><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
                {message.isConfirmationRequest && message.confirmationStatus === 'pending' && (
                  <div className="flex gap-2 mt-2 ml-10">
                    <Button size="sm" onClick={() => handleConfirm(message.id)} className="h-7 text-xs font-bold bg-primary text-primary-foreground">
                      Ya, Lanjutkan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCancel(message.id)} className="h-7 text-xs">
                      Batalkan
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2.5 justify-start">
                <Avatar className="h-7 w-7 shrink-0 border border-primary/30">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-secondary border border-border rounded-xl px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t border-border bg-card">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full items-center gap-2"
        >
          <Textarea
            {...register('prompt')}
            placeholder="Ketik instruksi atau pertanyaan untuk Asisten AI..."
            className="flex-1 resize-none h-9 min-h-[36px] text-xs py-2 bg-background border-border"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }
            }}
          />
          <Button type="submit" disabled={isLoading} size="icon" className="h-9 w-9 bg-primary text-primary-foreground shadow-sm shrink-0">
            <Send className="h-4 w-4" />
            <span className="sr-only">Kirim</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
