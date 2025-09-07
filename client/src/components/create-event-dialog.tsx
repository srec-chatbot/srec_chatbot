import { useState } from 'react';
import { Plus, Calendar, MapPin, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { insertEventSchema } from '@shared/schema';
import type { Club } from '@shared/schema';
import { z } from 'zod';

const createEventSchema = insertEventSchema.extend({
  date: z.string().min(1, 'Date is required'),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

interface CreateEventDialogProps {
  trigger?: React.ReactNode;
}

export default function CreateEventDialog({ trigger }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      type: 'college',
    },
  });

  const eventType = watch('type');

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventForm) => {
      const eventData = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      return apiRequest('POST', '/api/events', eventData);
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Event created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    createEventMutation.mutate(data);
  };

  // Only show for authorized users
  if (!user || !['Organizer', 'Faculty'].includes(user.role)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full" data-testid="button-open-create-event">
            <Plus className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event for the SREC community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter event title"
              data-testid="input-event-title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe your event"
              rows={3}
              data-testid="textarea-event-description"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                {...register('date')}
                data-testid="input-event-date"
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                {...register('venue')}
                placeholder="Event location"
                data-testid="input-event-venue"
              />
              {errors.venue && (
                <p className="text-sm text-destructive">{errors.venue.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => setValue('type', value as 'club' | 'college')}
            >
              <SelectTrigger data-testid="select-event-type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College-wide Event</SelectItem>
                <SelectItem value="club">Club Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {eventType === 'club' && (
            <div className="space-y-2">
              <Label htmlFor="club">Club</Label>
              <Select onValueChange={(value) => setValue('club', value)}>
                <SelectTrigger data-testid="select-event-club">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.name}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.club && (
                <p className="text-sm text-destructive">{errors.club.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-create-event"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEventMutation.isPending}
              data-testid="button-submit-create-event"
            >
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
