import { 
  type User, 
  type InsertUser, 
  type Event, 
  type InsertEvent,
  type Club,
  type InsertClub,
  type Notification,
  type InsertNotification,
  type EventWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Event methods
  getEvents(): Promise<EventWithDetails[]>;
  getEventById(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  getEventsByUser(userId: string): Promise<Event[]>;
  getEventsByClub(club: string): Promise<Event[]>;
  
  // Club methods
  getClubs(): Promise<Club[]>;
  getClubByName(name: string): Promise<Club | undefined>;
  createClub(club: InsertClub): Promise<Club>;
  joinClub(userId: string, clubName: string): Promise<boolean>;
  leaveClub(userId: string, clubName: string): Promise<boolean>;
  
  // RSVP methods
  rsvpEvent(userId: string, eventId: string, type: 'attending' | 'interested'): Promise<boolean>;
  unrsvpEvent(userId: string, eventId: string): Promise<boolean>;
  
  // Notification methods
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private events: Map<string, Event> = new Map();
  private clubs: Map<string, Club> = new Map();
  private notifications: Map<string, Notification> = new Map();

  constructor() {
    // Initialize with some default clubs
    this.initializeDefaultClubs();
  }

  private initializeDefaultClubs() {
    const defaultClubs = [
      { name: "Coding Club", description: "Programming and software development", category: "Technical" },
      { name: "Robotics Club", description: "Robotics and automation projects", category: "Technical" },
      { name: "Cultural Society", description: "Arts, music, and cultural activities", category: "Cultural" },
      { name: "Sports Club", description: "Athletic and sports activities", category: "Sports" },
      { name: "Photography Club", description: "Photography and visual arts", category: "Creative" },
    ];

    defaultClubs.forEach(club => {
      const id = randomUUID();
      this.clubs.set(id, {
        id,
        name: club.name,
        description: club.description || null,
        category: club.category,
        adminId: null,
        members: [],
        createdAt: new Date(),
      });
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      clubs: [] as string[],
      avatar: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Event methods
  async getEvents(): Promise<EventWithDetails[]> {
    const events = Array.from(this.events.values());
    return events.map(event => ({
      ...event,
      attendeeCount: Array.isArray(event.attendees) ? event.attendees.length : 0,
      interestedCount: Array.isArray(event.interested) ? event.interested.length : 0,
    }));
  }

  async getEventById(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      ...insertEvent,
      id,
      type: insertEvent.type || 'college',
      attendees: [],
      interested: [],
      createdAt: new Date(),
      image: insertEvent.image || null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async getEventsByUser(userId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.organizerId === userId);
  }

  async getEventsByClub(club: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.club === club);
  }

  // Club methods
  async getClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values());
  }

  async getClubByName(name: string): Promise<Club | undefined> {
    return Array.from(this.clubs.values()).find(club => club.name === name);
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = randomUUID();
    const club: Club = {
      ...insertClub,
      id,
      adminId: insertClub.adminId || null,
      members: [],
      createdAt: new Date(),
      description: insertClub.description || null,
    };
    this.clubs.set(id, club);
    return club;
  }

  async joinClub(userId: string, clubName: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const club = await this.getClubByName(clubName);
    
    if (!user || !club) return false;

    // Add club to user's clubs
    const userClubs = Array.isArray(user.clubs) ? user.clubs : [];
    if (!userClubs.includes(clubName)) {
      userClubs.push(clubName);
      await this.updateUser(userId, { clubs: userClubs });
    }

    // Add user to club members
    const clubMembers = Array.isArray(club.members) ? club.members : [];
    if (!clubMembers.includes(userId)) {
      clubMembers.push(userId);
      this.clubs.set(club.id, { ...club, members: clubMembers });
    }

    return true;
  }

  async leaveClub(userId: string, clubName: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const club = await this.getClubByName(clubName);
    
    if (!user || !club) return false;

    // Remove club from user's clubs
    const userClubs = Array.isArray(user.clubs) ? user.clubs : [];
    const updatedUserClubs = userClubs.filter(c => c !== clubName);
    await this.updateUser(userId, { clubs: updatedUserClubs });

    // Remove user from club members
    const clubMembers = Array.isArray(club.members) ? club.members : [];
    const updatedClubMembers = clubMembers.filter(m => m !== userId);
    this.clubs.set(club.id, { ...club, members: updatedClubMembers });

    return true;
  }

  // RSVP methods
  async rsvpEvent(userId: string, eventId: string, type: 'attending' | 'interested'): Promise<boolean> {
    const event = this.events.get(eventId);
    if (!event) return false;

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    const interested = Array.isArray(event.interested) ? event.interested : [];

    // Remove from both lists first
    const newAttendees = attendees.filter(id => id !== userId);
    const newInterested = interested.filter(id => id !== userId);

    // Add to appropriate list
    if (type === 'attending') {
      newAttendees.push(userId);
    } else {
      newInterested.push(userId);
    }

    const updatedEvent = {
      ...event,
      attendees: newAttendees,
      interested: newInterested,
    };

    this.events.set(eventId, updatedEvent);
    return true;
  }

  async unrsvpEvent(userId: string, eventId: string): Promise<boolean> {
    const event = this.events.get(eventId);
    if (!event) return false;

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    const interested = Array.isArray(event.interested) ? event.interested : [];

    const updatedEvent = {
      ...event,
      attendees: attendees.filter(id => id !== userId),
      interested: interested.filter(id => id !== userId),
    };

    this.events.set(eventId, updatedEvent);
    return true;
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      read: false,
      createdAt: new Date(),
      userId: insertNotification.userId || null,
      eventId: insertNotification.eventId || null,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    this.notifications.set(id, { ...notification, read: true });
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const userNotifications = await this.getNotifications(userId);
    userNotifications.forEach(notification => {
      this.notifications.set(notification.id, { ...notification, read: true });
    });
    return true;
  }
}

export const storage = new MemStorage();
