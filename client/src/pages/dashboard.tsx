import { useState } from 'react';
import { Filter, MoreVertical, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/app-layout';
import EventCard from '@/components/event-card';
import CreateEventDialog from '@/components/create-event-dialog';
import ChatbotWidget from '@/components/chatbot-widget';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { EventWithDetails, Notification, Club } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventFilters, setEventFilters] = useState({
    all: true,
    club: false,
    college: false,
  });

  // WebSocket for real-time notifications
  useWebSocket({
    onNotification: (notification) => {
      toast({
        title: notification.title,
        description: notification.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ['/api/events'],
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const userClubs = Array.isArray(user?.clubs) ? user.clubs : [];
  const userClubObjects = clubs.filter(club => userClubs.includes(club.name));

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    if (eventFilters.all) return true;
    if (eventFilters.club && event.type === 'club') return true;
    if (eventFilters.college && event.type === 'college') return true;
    return false;
  });

  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} ago`;
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              {/* Role Badge */}
              <div className="mt-2">
                <Badge className="bg-primary text-primary-foreground">
                  <span className="mr-1">👨‍🎓</span>
                  {user?.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Type Filter */}
              <div>
                <h3 className="font-medium text-sm mb-3">Event Type</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-events"
                      checked={eventFilters.all}
                      onCheckedChange={(checked) =>
                        setEventFilters({ ...eventFilters, all: !!checked })
                      }
                      data-testid="checkbox-all-events"
                    />
                    <label htmlFor="all-events" className="text-sm text-muted-foreground cursor-pointer">
                      All Events
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="club-events"
                      checked={eventFilters.club}
                      onCheckedChange={(checked) =>
                        setEventFilters({ ...eventFilters, club: !!checked })
                      }
                      data-testid="checkbox-club-events"
                    />
                    <label htmlFor="club-events" className="text-sm text-muted-foreground cursor-pointer">
                      Club Events
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="college-events"
                      checked={eventFilters.college}
                      onCheckedChange={(checked) =>
                        setEventFilters({ ...eventFilters, college: !!checked })
                      }
                      data-testid="checkbox-college-events"
                    />
                    <label htmlFor="college-events" className="text-sm text-muted-foreground cursor-pointer">
                      College-wide
                    </label>
                  </div>
                </div>
              </div>

              {/* Followed Clubs */}
              <div>
                <h3 className="font-medium text-sm mb-3">My Clubs</h3>
                <div className="space-y-2">
                  {userClubObjects.length > 0 ? (
                    userClubObjects.map((club) => (
                      <div key={club.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                            <span className="text-xs">🔗</span>
                          </div>
                          <span className="text-sm font-medium" data-testid={`text-club-${club.id}`}>
                            {club.name}
                          </span>
                        </div>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No clubs joined yet</p>
                  )}
                </div>
              </div>

              {/* Add Club Button */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => window.location.href = '/clubs'}
                data-testid="button-join-clubs"
              >
                <span className="mr-2">➕</span>
                Join More Clubs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Event Feed */}
        <div className="lg:col-span-2">
          {/* Create Event Button (Organizer/Admin only) */}
          {(user?.role === 'Organizer' || user?.role === 'Faculty') && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <CreateEventDialog />
              </CardContent>
            </Card>
          )}

          {/* Event Feed Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-2xl text-foreground">Upcoming Events</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" data-testid="button-calendar-view">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" data-testid="button-more-options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Event Cards */}
          <div className="space-y-6">
            {eventsLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted"></div>
                    <CardContent className="p-6 space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-8 bg-muted rounded"></div>
                        <div className="h-8 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No events found</h3>
                  <p className="text-muted-foreground mb-4">
                    {eventFilters.all 
                      ? "There are no upcoming events at the moment." 
                      : "No events match your current filters."}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setEventFilters({ all: true, club: false, college: false })}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Load More Button */}
          {filteredEvents.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline" disabled data-testid="button-load-more">
                <span className="mr-2">↓</span>
                Load More Events
              </Button>
            </div>
          )}
        </div>

        {/* Notifications Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={unreadNotifications.length === 0}
                  data-testid="button-mark-all-read"
                >
                  <span className="text-xs">Mark all read</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${
                      notification.read 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-muted/50 border-accent'
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.read ? 'bg-muted' : 'bg-accent'
                    }`}>
                      <Bell className={`h-4 w-4 ${notification.read ? 'text-muted-foreground' : 'text-accent-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatNotificationTime(notification.createdAt!)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2"></span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chatbot Widget */}
          <ChatbotWidget />
        </div>
      </div>
    </AppLayout>
  );
}
