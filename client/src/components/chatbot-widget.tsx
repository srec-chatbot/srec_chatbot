import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ChatbotWidget() {
  const handleStartChat = () => {
    // Placeholder for future chatbot integration
    alert('Chatbot feature coming soon! This will be integrated with AI assistance for college queries.');
  };

  return (
    <Card className="bg-gradient-to-r from-secondary to-accent text-white border-0">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot className="h-8 w-8" />
        </div>
        <h3 className="font-semibold text-lg mb-2">SREC Assistant</h3>
        <p className="text-sm opacity-90 mb-4">
          Need help with events, clubs, or college info?
        </p>
        <Button
          onClick={handleStartChat}
          variant="secondary"
          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
          data-testid="button-start-chat"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Start Chat
        </Button>
        <p className="text-xs opacity-75 mt-3">
          Coming Soon - AI-powered assistance
        </p>
      </CardContent>
    </Card>
  );
}
