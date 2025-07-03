'use client';
import { useState, useRef, useEffect, type FormEvent } from 'react';
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
  prompt: z.string().min(1, 'Message cannot be empty.'),
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
      toast({ title: 'Error', description: errors.prompt.message, variant: 'destructive' });
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
        title: 'Error',
        description: 'An error occurred while processing your request.',
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
    // Disable the buttons for the message that was actioned
    const updatedMessages = messages.map(m => m.id === messageId ? {...m, confirmationStatus: 'confirmed'} : m);
    
    const userConfirmMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: 'User confirmed the action.' };
    const messagesWithConfirmation = [...updatedMessages, userConfirmMessage];
    setMessages(messagesWithConfirmation);

    const historyForConfirmation: ConversationHistory = updatedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        // For history, we need the original AI question with the token if it was a confirmation
        content: msg.isConfirmationRequest ? `${CONFIRMATION_TOKEN} ${msg.content}` : msg.content,
    }));

    await executeAgentTurn('User confirmed the action.', historyForConfirmation);
  }

  const handleCancel = (messageId: string) => {
     setMessages(prev => prev.map(m => m.id === messageId ? {...m, confirmationStatus: 'cancelled'} : m));
     const assistantResponseMessage: Message = { id: `asst-${Date.now()}`, role: 'assistant', content: "Okay, I've cancelled that request." };
     setMessages(prev => [...prev, assistantResponseMessage]);
  }


  return (
    <Card className="h-full flex flex-col max-h-[calc(100vh-12rem)]">
      <CardContent className="flex-grow p-4 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <Bot className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Hello, I'm Aura!</h2>
                <p className="text-sm sm:text-base">I can help you manage your cafe. Try asking me to:</p>
                <ul className="list-disc list-inside mt-2 text-left text-xs sm:text-sm">
                  <li>"Add 'Iced Latte' to Coffee for $4.50"</li>
                  <li>"How many 'Robusta Beans' in stock?"</li>
                  <li>"Delete the 'Muffin' from the menu"</li>
                </ul>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={cn(
                    'flex items-start gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
                 {message.isConfirmationRequest && message.confirmationStatus === 'pending' && (
                    <div className="flex gap-2 mt-2 ml-11">
                        <Button size="sm" onClick={() => handleConfirm(message.id)}>Confirm</Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(message.id)}>Cancel</Button>
                    </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-2 sm:p-4 border-t">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full items-center gap-2"
        >
          <Textarea
            {...register('prompt')}
            placeholder="Type your message here..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }
            }}
          />
          <Button type="submit" disabled={isLoading} size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
