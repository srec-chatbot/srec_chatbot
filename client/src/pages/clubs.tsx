import { useState } from 'react';
import { Users, Plus, Minus, Search, Star, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Club } from '@shared/schema';

export default function Clubs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const joinClubMutation = useMutation({
    mutationFn: async (clubName: string) => {
      return apiRequest('POST', `/api/clubs/${encodeURIComponent(clubName)}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      toast({
        title: "Success!",
        description: "You have joined the club successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join club.",
        variant: "destructive",
      });
    },
  });

  const leaveClubMutation = useMutation({
    mutationFn: async (clubName: string) => {
      return apiRequest('POST', `/api/clubs/${encodeURIComponent(clubName)}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      toast({
        title: "Left club",
        description: "You have left the club successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave club.",
        variant: "destructive",
      });
    },
  });

  const userClubs = Array.isArray(user?.clubs) ? user.clubs : [];
  const categories = ['all', ...Array.from(new Set(clubs.map(club => club.category)))];

  // Filter clubs
  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (club.description && club.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || club.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const joinedClubs = filteredClubs.filter(club => userClubs.includes(club.name));
  const availableClubs = filteredClubs.filter(club => !userClubs.includes(club.name));

  const handleJoinClub = (clubName: string) => {
    joinClubMutation.mutate(clubName);
  };

  const handleLeaveClub = (clubName: string) => {
    leaveClubMutation.mutate(clubName);
  };

  const getClubIcon = (category: string) => {
    const icons = {
      'Technical': '💻',
      'Cultural': '🎭',
      'Sports': '⚽',
      'Creative': '🎨',
      'Academic': '📚',
    };
    return icons[category as keyof typeof icons] || '🔗';
  };

  const getMemberCount = (club: Club) => {
    return Array.isArray(club.members) ? club.members.length : 0;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-muted rounded mb-4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clubs</h1>
            <p className="text-muted-foreground">Join clubs and connect with like-minded students</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" data-testid="text-joined-count">
              {userClubs.length} Joined
            </Badge>
            <Badge variant="outline" data-testid="text-available-count">
              {clubs.length} Total
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Find Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search clubs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-clubs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
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
                    setCategoryFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Clubs */}
        {joinedClubs.length > 0 && (
          <div>
            <div className="flex items-center mb-6">
              <Star className="h-6 w-6 text-accent mr-2" />
              <h2 className="text-2xl font-bold text-foreground">My Clubs</h2>
              <span className="ml-2 px-2 py-1 bg-accent text-accent-foreground rounded-full text-sm">
                {joinedClubs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedClubs.map((club) => (
                <Card key={club.id} className="border-accent/20 bg-accent/5" data-testid={`card-joined-club-${club.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{getClubIcon(club.category)}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-club-name-${club.id}`}>
                            {club.name}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {club.category}
                          </Badge>
                        </div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">
                        Joined
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4" data-testid={`text-club-description-${club.id}`}>
                      {club.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-member-count-${club.id}`}>
                          {getMemberCount(club)} members
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLeaveClub(club.name)}
                        disabled={leaveClubMutation.isPending}
                        data-testid={`button-leave-${club.id}`}
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Leave
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Clubs */}
        <div>
          <div className="flex items-center mb-6">
            <Users className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-2xl font-bold text-foreground">
              {joinedClubs.length > 0 ? 'Discover More Clubs' : 'Available Clubs'}
            </h2>
            <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded-full text-sm">
              {availableClubs.length}
            </span>
          </div>

          {availableClubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableClubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-shadow" data-testid={`card-available-club-${club.id}`}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-2xl">{getClubIcon(club.category)}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-club-name-${club.id}`}>
                          {club.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {club.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4" data-testid={`text-club-description-${club.id}`}>
                      {club.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-member-count-${club.id}`}>
                          {getMemberCount(club)} members
                        </span>
                      </div>
                      
                      <Button
                        onClick={() => handleJoinClub(club.name)}
                        disabled={joinClubMutation.isPending}
                        size="sm"
                        data-testid={`button-join-${club.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {searchTerm || categoryFilter !== 'all' 
                    ? 'No clubs found' 
                    : 'All clubs joined!'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== 'all'
                    ? 'No clubs match your current filters.'
                    : 'You have joined all available clubs. Great job staying involved!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
