import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  loginSchema, 
  insertEventSchema, 
  insertClubSchema,
  type AuthResponse,
  type User,
  type EventWithDetails
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Type definition for authenticated request
interface AuthenticatedRequest extends Request {
  user: User;
}

// Middleware to verify JWT token
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.token) {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET) as { userId: string };
            clients.set(decoded.userId, ws);
            console.log(`User ${decoded.userId} authenticated on WebSocket`);
          } catch (error) {
            console.error('WebSocket auth error:', error);
            ws.close();
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from the map when disconnected
      const entries = Array.from(clients.entries());
      for (const [userId, client] of entries) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
      console.log('WebSocket client disconnected');
    });
  });

  // Helper function to broadcast notifications
  const broadcastNotification = (userId: string, notification: any) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      const authResponse: AuthResponse = {
        user: userWithoutPassword,
        token
      };

      res.status(201).json(authResponse);
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      const authResponse: AuthResponse = {
        user: userWithoutPassword,
        token
      };

      res.json(authResponse);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.patch('/api/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updateData = req.body;
      const updatedUser = await storage.updateUser(req.user.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Event routes
  app.get('/api/events', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await storage.getEvents();
      
      // Add user-specific RSVP info
      const eventsWithRSVP = events.map(event => {
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const interested = Array.isArray(event.interested) ? event.interested : [];
        
        return {
          ...event,
          isAttending: attendees.includes(req.user.id),
          isInterested: interested.includes(req.user.id)
        } as EventWithDetails;
      });

      res.json(eventsWithRSVP);
    } catch (error: any) {
      console.error('Get events error:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  app.post('/api/events', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user can create events
      if (!['Organizer', 'Faculty'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to create events' });
      }

      const eventData = insertEventSchema.parse(req.body);
      
      const event = await storage.createEvent({
        ...eventData,
        organizerId: req.user.id,
        organizerName: req.user.name
      });

      // Create notifications for relevant users
      const allUsers = await storage.getClubs(); // This would ideally filter users by club membership
      // For now, we'll just create a sample notification
      await storage.createNotification({
        userId: req.user.id, // This should be broadcast to relevant users
        title: 'New Event Created',
        message: `${event.title} has been scheduled`,
        type: 'event',
        eventId: event.id
      });

      res.status(201).json(event);
    } catch (error: any) {
      console.error('Create event error:', error);
      res.status(400).json({ message: error.message || 'Failed to create event' });
    }
  });

  // RSVP routes
  app.post('/api/events/:id/rsvp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'attending' or 'interested'

      if (!['attending', 'interested'].includes(type)) {
        return res.status(400).json({ message: 'Invalid RSVP type' });
      }

      const success = await storage.rsvpEvent(req.user.id, id, type);
      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ message: 'RSVP updated successfully' });
    } catch (error: any) {
      console.error('RSVP error:', error);
      res.status(500).json({ message: 'Failed to update RSVP' });
    }
  });

  app.delete('/api/events/:id/rsvp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.unrsvpEvent(req.user.id, id);
      
      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ message: 'RSVP removed successfully' });
    } catch (error: any) {
      console.error('Remove RSVP error:', error);
      res.status(500).json({ message: 'Failed to remove RSVP' });
    }
  });

  // Club routes
  app.get('/api/clubs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error: any) {
      console.error('Get clubs error:', error);
      res.status(500).json({ message: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/clubs/:name/join', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const success = await storage.joinClub(req.user.id, name);
      
      if (!success) {
        return res.status(404).json({ message: 'Club not found' });
      }

      res.json({ message: 'Successfully joined club' });
    } catch (error: any) {
      console.error('Join club error:', error);
      res.status(500).json({ message: 'Failed to join club' });
    }
  });

  app.post('/api/clubs/:name/leave', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const success = await storage.leaveClub(req.user.id, name);
      
      if (!success) {
        return res.status(404).json({ message: 'Club not found' });
      }

      res.json({ message: 'Successfully left club' });
    } catch (error: any) {
      console.error('Leave club error:', error);
      res.status(500).json({ message: 'Failed to leave club' });
    }
  });

  // Notification routes
  app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationRead(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  return httpServer;
}
