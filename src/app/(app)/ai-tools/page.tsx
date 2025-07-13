import { ConversationalAgent } from '@/components/ai/conversational-agent';

export default function AiToolsPage() {
  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-bold">Aura AI Agent</h1>
        <p className="text-muted-foreground">
          Your conversational assistant for managing cafe operations.
        </p>
      </div>
      <ConversationalAgent />
    </div>
  );
}
