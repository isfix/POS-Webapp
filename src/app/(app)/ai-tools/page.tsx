import { ConversationalAgent } from '@/components/ai/conversational-agent';
import { NlpDataEntry } from '@/components/ai/nlp-data-entry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Wand2 } from 'lucide-react';

export default function AiToolsPage() {
  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-xl font-bold text-foreground">Asisten AI POS</h1>
        <p className="text-xs text-muted-foreground">
          Kelola menu, cek stok persediaan, dan catat data operasional menggunakan instruksi bahasa alami.
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="chat" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">
            <Bot className="h-3.5 w-3.5 mr-1.5" />
            Percakapan Asisten AI
          </TabsTrigger>
          <TabsTrigger value="nlp" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            Input Cepat Bahasa Alami
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ConversationalAgent />
        </TabsContent>

        <TabsContent value="nlp">
          <NlpDataEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
}
