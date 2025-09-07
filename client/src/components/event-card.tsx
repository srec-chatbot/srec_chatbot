import { useState } from 'react';
import { Calendar, MapPin, Check, CalendarPlus, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { EventWithDetails } from '@shared/schema';

interface EventCardProps {
  event: EventWithDetails;
}

export default function EventCard({ event }: EventCardProps) {
  const [isRSVPing, setIsRSVPing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rsvpMutation = useMutation({
    mutationFn: async ({ type }: { type: 'attending' | 'interested' }) => {
      setIsRSVPing(true);
      if (event.isAttending || event.isInterested) {
        // Remove current RSVP first
        await apiRequest('DELETE', `/api/events/${event.id}/rsvp`);
      }
      if (!((event.isAttending && type === 'attending') || (event.isInterested && type === 'interested'))) {
        await apiRequest('POST', `/api/events/${event.id}/rsvp`, { type });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "RSVP Updated",
        description: "Your event preference has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRSVPing(false);
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleRSVP = (type: 'attending' | 'interested') => {
    rsvpMutation.mutate({ type });
  };

  const getEventImage = () => {
    // Default images based on event type/club
    const defaultImages = {
      'Coding Club': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
      'Robotics Club': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
      'Cultural Society': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
      default: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400'
    };
    
    return event.image || defaultImages[event.club as keyof typeof defaultImages] || defaultImages.default;
  };

  return (
    <Card className="overflow-hidden event-card fade-in" data-testid={`card-event-${event.id}`}>
      {/* Event Header Image */}
      <div className="h-48 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary">
          <img 
            src={getEventImage()} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute top-4 right-4">
          <Badge className={event.type === 'club' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}>
            {event.type === 'club' ? 'Club Event' : 'College-wide'}
          </Badge>
        </div>
        {event.club && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg">
            <div className="text-sm font-medium" data-testid={`text-club-${event.id}`}>{event.club}</div>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Event Title and Description */}
        <div className="mb-4">
          <h3 className="font-bold text-xl mb-2 text-foreground" data-testid={`text-title-${event.id}`}>
            {event.title}
          </h3>
          <p className="text-muted-foreground" data-testid={`text-description-${event.id}`}>
            {event.description}
          </p>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Calendar className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid={`text-date-${event.id}`}>
                {formatDate(event.date)}
              </p>
              <p className="text-xs text-muted-foreground" data-testid={`text-time-${event.id}`}>
                {formatTime(event.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <MapPin className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid={`text-venue-${event.id}`}>
                {event.venue}
              </p>
              <p className="text-xs text-muted-foreground">SREC Campus</p>
            </div>
          </div>
        </div>

        {/* Event Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant={event.isAttending ? "default" : "outline"}
              size="sm"
              onClick={() => handleRSVP('attending')}
              disabled={isRSVPing}
              className={event.isAttending ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : ''}
              data-testid={`button-attending-${event.id}`}
            >
              {event.isAttending ? <Check className="h-4 w-4 mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              <span>Going</span>
              <Badge variant="secondary" className="ml-2" data-testid={`text-attendees-${event.id}`}>
                {event.attendeeCount}
              </Badge>
            </Button>
            
            <Button
              variant={event.isInterested ? "default" : "outline"}
              size="sm"
              onClick={() => handleRSVP('interested')}
              disabled={isRSVPing}
              className={event.isInterested ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              data-testid={`button-interested-${event.id}`}
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              <span>Interested</span>
              <Badge variant="secondary" className="ml-2" data-testid={`text-interested-${event.id}`}>
                {event.interestedCount}
              </Badge>
            </Button>

            <Button variant="ghost" size="sm" data-testid={`button-share-${event.id}`}>
              <Share className="h-4 w-4 mr-1" />
              <span className="text-sm">Share</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground text-sm">
            <span>By</span>
            <span className="font-medium" data-testid={`text-organizer-${event.id}`}>{event.organizerName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
