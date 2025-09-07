import { useState } from 'react';
import { Calendar, Filter, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/app-layout';
import EventCard from '@/components/event-card';
import CreateEventDialog from '@/components/create-event-dialog';
import { useAuth } from '@/hooks/use-auth';
import type { EventWithDetails, Club } from '@shared/schema';

export default function Events() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'club' | 'college'>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');

  const { data: events = [], isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ['/api/events'],
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  // Filter and search events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    
    const matchesClub = clubFilter === 'all' || event.club === clubFilter;
    
    return matchesSearch && matchesType && matchesClub;
  });

  // Sort events by date
  const sortedEvents = filteredEvents.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingEvents = sortedEvents.filter(event => 
    new Date(event.date) > new Date()
  );
  
  const pastEvents = sortedEvents.filter(event => 
    new Date(event.date) <= new Date()
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground">Discover and join college events</p>
          </div>
          
          {(user?.role === 'Organizer' || user?.role === 'Faculty') && (
            <CreateEventDialog 
              trigger={
                <Button data-testid="button-create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              }
            />
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-events"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type</label>
                <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="college">College-wide</SelectItem>
                    <SelectItem value="club">Club Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Club</label>
                <Select value={clubFilter} onValueChange={setClubFilter}>
                  <SelectTrigger data-testid="select-club-filter">
                    <SelectValue placeholder="All clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.name}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setClubFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-8">
          {/* Upcoming Events */}
          <div>
            <div className="flex items-center mb-6">
              <Calendar className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-2xl font-bold text-foreground">
                Upcoming Events
              </h2>
              <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                {upcomingEvents.length}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted"></div>
                    <CardContent className="p-6 space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No upcoming events</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || typeFilter !== 'all' || clubFilter !== 'all'
                      ? 'No events match your current filters.'
                      : 'There are no upcoming events at the moment.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <div className="flex items-center mb-6">
                <Calendar className="h-6 w-6 text-muted-foreground mr-2" />
                <h2 className="text-2xl font-bold text-foreground">
                  Past Events
                </h2>
                <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                  {pastEvents.length}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pastEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="opacity-75">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>

              {pastEvents.length > 6 && (
                <div className="text-center mt-6">
                  <Button variant="outline" disabled data-testid="button-load-more-past">
                    View More Past Events
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
