// srecconnect/server/routes.ts
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertEventSchema,
  insertClubSchema,
  type AuthResponse,
  type User,
  type EventWithDetails,
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ---- Email (SMTP) transporter ----
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false otherwise
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Type definition for authenticated request
interface AuthenticatedRequest extends Request {
  user: User;
}

// Middleware to verify JWT token for protected APIs
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    (req as AuthenticatedRequest).user = user;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Helper: send verification email
async function sendVerificationEmail(toEmail: string) {
  const appBase = process.env.APP_URL || "http://localhost:5000";
  // Sign a short-lived token that contains only the email
  const token = jwt.sign({ email: toEmail }, JWT_SECRET, { expiresIn: "24h" });
  const verifyLink = `${appBase}/api/auth/verify?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: "Verify your SREC Connect account",
    text: `Welcome to SREC Connect!\n\nPlease verify your email by clicking the link below:\n${verifyLink}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5">
        <p>Welcome to <strong>SREC Connect</strong>!</p>
        <p>Please verify your email by clicking the button below:</p>
        <p>
          <a href="${verifyLink}" style="background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
            Verify Email
          </a>
        </p>
        <p>Or open this link:<br><a href="${verifyLink}">${verifyLink}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ---------------------------
  // WebSocket setup
  // ---------------------------
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Map<string, WebSocket>();

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth" && data.token) {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET) as { userId: string };
            clients.set(decoded.userId, ws);
          } catch {
            ws.close();
          }
        }
      } catch {
        // ignore malformed WS messages
      }
    });

    ws.on("close", () => {
      for (const [userId, client] of Array.from(clients.entries())) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
    });
  });

  // Helper function to send a notification to a user over WS (if connected)
  const broadcastNotification = (userId: string, notification: any) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "notification", data: notification }));
    }
  };

  // ---------------------------
  // AUTH ROUTES
  // ---------------------------

  // REGISTER (with email verification)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Extra guard (schema already enforces domain, but keep backend hard-check)
      if (!userData.email.toLowerCase().endsWith("@srec.ac.in")) {
        return res.status(400).json({ message: "Only @srec.ac.in emails are allowed" });
      }

      // Does user already exist?
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create as UNVERIFIED first
      // NOTE: We add `isVerified` without breaking your existing types by casting to any.
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        ...( { isVerified: false } as any ),
      });

      // Send verification email
      await sendVerificationEmail(userData.email);

      // Do NOT log the user in yet; ask them to verify
      res.status(200).json({
        message: "Registration successful. Check your @srec.ac.in inbox to verify your email.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error?.message || "Registration failed" });
    }
  });

  // RESEND VERIFICATION (optional convenience)
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });

      // If already verified, no need to send
      // @ts-expect-error (the User type may not contain isVerified; we handle loosely)
      if (user.isVerified) {
        return res.status(200).json({ message: "Account already verified" });
      }

      await sendVerificationEmail(email);
      res.json({ message: "Verification email sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // VERIFY EMAIL (via emailed link)
  app.get("/api/auth/verify", async (req, res) => {
    try {
      const token = req.query.token as string | undefined;
      if (!token) return res.status(400).json({ message: "Missing token" });

      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      const user = await storage.getUserByEmail(decoded.email);
      if (!user) return res.status(400).json({ message: "Invalid token" });

      // @ts-expect-error (User type may not declare isVerified)
      if (user.isVerified) {
        return res.status(200).json({ message: "Account already verified" });
      }

      await storage.updateUser(user.id, ({ isVerified: true } as any));
      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error) {
      res.status(400).json({ message: "Invalid or expired token" });
    }
  });

  // LOGIN (blocked until verified)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Block login until verified
      // @ts-expect-error (User type may not declare isVerified)
      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in." });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      const { password: _, ...userWithoutPassword } = user as any;
      const authResponse: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      res.json(authResponse);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error?.message || "Login failed" });
    }
  });

  // CURRENT USER
  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { password, ...userWithoutPassword } = (req.user as any) || {};
    res.json(userWithoutPassword);
  });

  // UPDATE PROFILE
  app.patch("/api/auth/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updateData = req.body;
      const updatedUser = await storage.updateUser(req.user.id, updateData as any);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = (updatedUser as any) || {};
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ---------------------------
  // EVENT ROUTES
  // ---------------------------
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await storage.getEvents();

      // Add user-specific RSVP info
      const eventsWithRSVP = events.map((event) => {
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const interested = Array.isArray(event.interested) ? event.interested : [];

        return {
          ...event,
          isAttending: attendees.includes(req.user.id),
          isInterested: interested.includes(req.user.id),
        } as EventWithDetails;
      });

      res.json(eventsWithRSVP);
    } catch (error: any) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only Organizer or Faculty can create events
      if (!["Organizer", "Faculty"].includes(req.user.role as any)) {
        return res.status(403).json({ message: "Not authorized to create events" });
      }

      const eventData = insertEventSchema.parse(req.body);

      const event = await storage.createEvent({
        ...eventData,
        organizerId: req.user.id,
        organizerName: req.user.name,
      });

      // Example notification (send to creator only here; adapt to your membership rules)
      await storage.createNotification({
        userId: req.user.id,
        title: "New Event Created",
        message: `${event.title} has been scheduled`,
        type: "event",
        eventId: event.id,
      });

      // Push over websocket (to creator)
      broadcastNotification(req.user.id, {
        title: "New Event Created",
        message: `${event.title} has been scheduled`,
      });

      res.status(201).json(event);
    } catch (error: any) {
      console.error("Create event error:", error);
      res.status(400).json({ message: error?.message || "Failed to create event" });
    }
  });

  // RSVP routes
  app.post("/api/events/:id/rsvp", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'attending' or 'interested'

      if (!["attending", "interested"].includes(type)) {
        return res.status(400).json({ message: "Invalid RSVP type" });
      }

      const success = await storage.rsvpEvent(req.user.id, id, type);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({ message: "RSVP updated successfully" });
    } catch (error: any) {
      console.error("RSVP error:", error);
      res.status(500).json({ message: "Failed to update RSVP" });
    }
  });

  app.delete("/api/events/:id/rsvp", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.unrsvpEvent(req.user.id, id);

      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({ message: "RSVP removed successfully" });
    } catch (error: any) {
      console.error("Remove RSVP error:", error);
      res.status(500).json({ message: "Failed to remove RSVP" });
    }
  });

  // ---------------------------
  // CLUB ROUTES
  // ---------------------------
  app.get("/api/clubs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error: any) {
      console.error("Get clubs error:", error);
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.post("/api/clubs/:name/join", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const success = await storage.joinClub(req.user.id, name);

      if (!success) {
        return res.status(404).json({ message: "Club not found" });
      }

      res.json({ message: "Successfully joined club" });
    } catch (error: any) {
      console.error("Join club error:", error);
      res.status(500).json({ message: "Failed to join club" });
    }
  });

  app.post("/api/clubs/:name/leave", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const success = await storage.leaveClub(req.user.id, name);

      if (!success) {
        return res.status(404).json({ message: "Club not found" });
      }

      res.json({ message: "Successfully left club" });
    } catch (error: any) {
      console.error("Leave club error:", error);
      res.status(500).json({ message: "Failed to leave club" });
    }
  });

  // ---------------------------
  // NOTIFICATION ROUTES
  // ---------------------------
  app.get("/api/notifications", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationRead(id);

      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  return httpServer;
}
