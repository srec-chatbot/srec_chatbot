import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { GraduationCap, Home, Calendar, Users, Bell, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import type { Notification } from '@shared/schema';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const navItems = [
    { path: '/dashboard', label: 'Feed', icon: Home },
    { path: '/events', label: 'Events', icon: Calendar },
    { path: '/clubs', label: 'Clubs', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <Link href="/dashboard">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-primary-foreground h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-bold text-xl text-foreground">SREC Connect</h1>
                  <p className="text-xs text-muted-foreground">Sri Ramakrishna Engineering College</p>
                </div>
              </div>
            </Link>

            {/* Navigation Items */}
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={`flex items-center space-x-2 transition-colors cursor-pointer ${
                      isActive 
                        ? 'text-primary font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs notification-dot">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ''} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium" data-testid="text-username">{user?.name}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-role">{user?.role}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout}
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Floating Action Button for Mobile */}
      {(user?.role === 'Organizer' || user?.role === 'Faculty') && (
        <Button 
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl md:hidden"
          data-testid="button-create-event-fab"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex flex-col items-center space-y-1 cursor-pointer ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
          
          <Link href="/dashboard">
            <div className="flex flex-col items-center space-y-1 text-muted-foreground cursor-pointer relative">
              <Bell className="h-5 w-5" />
              <span className="text-xs">Alerts</span>
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 notification-dot" />
              )}
            </div>
          </Link>

          <Link href="/profile">
            <div className={`flex flex-col items-center space-y-1 cursor-pointer ${
              location === '/profile' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <User className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
