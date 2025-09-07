import { useState } from 'react';
import { User, Edit, Save, X, Calendar, Users, Mail, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import AppLayout from '@/components/app-layout';
import EventCard from '@/components/event-card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { EventWithDetails, Club } from '@shared/schema';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['Student', 'Faculty', 'Organizer']),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: events = [] } = useQuery<EventWithDetails[]>({
    queryKey: ['/api/events'],
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      role: (user?.role as 'Student' | 'Faculty' | 'Organizer') || 'Student',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      return apiRequest('PATCH', '/api/auth/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const userClubs = Array.isArray(user?.clubs) ? user.clubs : [];
  const userClubObjects = clubs.filter(club => userClubs.includes(club.name));

  // Get user's events (events they're attending or interested in)
  const userEvents = events.filter(event => 
    event.isAttending || event.isInterested
  );

  // Get events organized by user
  const organizedEvents = events.filter(event => 
    event.organizerId === user?.id
  );

  const formatJoinDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const onSubmit = (data: UpdateProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancelEdit = () => {
    reset({
      name: user?.name || '',
      role: (user?.role as 'Student' | 'Faculty' | 'Organizer') || 'Student',
    });
    setIsEditing(false);
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      'Student': <GraduationCap className="h-4 w-4" />,
      'Faculty': <Shield className="h-4 w-4" />,
      'Organizer': <Users className="h-4 w-4" />,
    };
    return icons[role as keyof typeof icons] || <User className="h-4 w-4" />;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'Student': 'bg-primary text-primary-foreground',
      'Faculty': 'bg-secondary text-secondary-foreground',
      'Organizer': 'bg-accent text-accent-foreground',
    };
    return colors[role as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <Avatar className="w-24 h-24 mx-auto md:mx-0">
                <AvatarImage src={user?.avatar || ''} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          {...register('name')}
                          data-testid="input-edit-name"
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={user?.role}
                          onValueChange={(value) => setValue('role', value as any)}
                        >
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Student">Student</SelectItem>
                            <SelectItem value="Faculty">Faculty</SelectItem>
                            <SelectItem value="Organizer">Event Organizer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={updateProfileMutation.isPending || !isDirty}
                        data-testid="button-save-profile"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleCancelEdit}
                        data-testid="button-cancel-edit"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground" data-testid="text-profile-name">
                        {user?.name}
                      </h1>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        data-testid="button-edit-profile"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-center md:justify-start space-x-4 text-muted-foreground mb-4">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm" data-testid="text-profile-email">{user?.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          Joined {formatJoinDate(user?.createdAt || undefined)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center md:justify-start">
                      <Badge className={getRoleColor(user?.role || 'Student')} data-testid="text-profile-role">
                        {getRoleIcon(user?.role || 'Student')}
                        <span className="ml-1">{user?.role}</span>
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-clubs-count">
                    {userClubs.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Clubs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-events-count">
                    {userEvents.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Events</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-organized-count">
                    {organizedEvents.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Organized</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Clubs */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  My Clubs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userClubObjects.length > 0 ? (
                  <div className="space-y-3">
                    {userClubObjects.map((club) => (
                      <div key={club.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-xs">🔗</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm" data-testid={`text-joined-club-${club.id}`}>
                              {club.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{club.category}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Array.isArray(club.members) ? club.members.length : 0} members
                        </Badge>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/clubs'}
                      data-testid="button-manage-clubs"
                    >
                      Manage Clubs
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No clubs joined yet</p>
                    <Button 
                      onClick={() => window.location.href = '/clubs'}
                      data-testid="button-join-clubs"
                    >
                      Join Clubs
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Events */}
            {userEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">My Events</h2>
                <div className="space-y-4">
                  {userEvents.slice(0, 3).map((event) => (
                    <EventCard key={`user-${event.id}`} event={event} />
                  ))}
                  {userEvents.length > 3 && (
                    <div className="text-center">
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/events'}
                        data-testid="button-view-all-events"
                      >
                        View All My Events ({userEvents.length})
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organized Events */}
            {organizedEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Events I Organized</h2>
                <div className="space-y-4">
                  {organizedEvents.slice(0, 3).map((event) => (
                    <EventCard key={`organized-${event.id}`} event={event} />
                  ))}
                  {organizedEvents.length > 3 && (
                    <div className="text-center">
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/events'}
                        data-testid="button-view-organized-events"
                      >
                        View All Organized Events ({organizedEvents.length})
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {userEvents.length === 0 && organizedEvents.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by joining some events or creating your own!
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={() => window.location.href = '/events'}
                      data-testid="button-browse-events"
                    >
                      Browse Events
                    </Button>
                    {(user?.role === 'Organizer' || user?.role === 'Faculty') && (
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/events'}
                        data-testid="button-create-event"
                      >
                        Create Event
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your SREC Connect account
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                data-testid="button-sign-out"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
