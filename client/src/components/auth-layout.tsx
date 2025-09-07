import { ReactNode } from 'react';
import { GraduationCap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatbotWidget from '@/components/chatbot-widget';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex">
      {/* Left side - Brand and Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-primary-foreground text-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SREC Connect</h1>
              <p className="text-primary-foreground/80 text-sm">Sri Ramakrishna Engineering College</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              Connect, Engage, Excel Together
            </h2>
            <p className="text-xl text-primary-foreground/90">
              Your college social hub for events, clubs, and community building.
            </p>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">🎯</span>
                </div>
                <p className="text-primary-foreground/90">Discover events from your favorite clubs</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">🔔</span>
                </div>
                <p className="text-primary-foreground/90">Get real-time notifications</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">👥</span>
                </div>
                <p className="text-primary-foreground/90">Connect with fellow SRECians</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot Widget */}
        <div className="mt-8">
          <ChatbotWidget />
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">SREC Connect</h1>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          {/* Mobile Chatbot */}
          <div className="lg:hidden mt-8">
            <ChatbotWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
