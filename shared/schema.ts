import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Student"), // Student, Faculty, Organizer
  clubs: jsonb("clubs").default(sql`'[]'::jsonb`), // Array of club names
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  adminId: varchar("admin_id").references(() => users.id),
  members: jsonb("members").default(sql`'[]'::jsonb`), // Array of user IDs
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  venue: text("venue").notNull(),
  club: text("club"), // Club name, null for college-wide events
  type: text("type").notNull().default("college"), // "club" or "college"
  organizerId: varchar("organizer_id").references(() => users.id),
  organizerName: text("organizer_name").notNull(),
  image: text("image"),
  attendees: jsonb("attendees").default(sql`'[]'::jsonb`), // Array of user IDs who are going
  interested: jsonb("interested").default(sql`'[]'::jsonb`), // Array of user IDs who are interested
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "event", "club", "general"
  read: boolean("read").default(false),
  eventId: varchar("event_id").references(() => events.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith("@srec.ac.in"),
    "Only @srec.ac.in emails are allowed"
  ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Student", "Faculty", "Organizer"]).default("Student"),
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
  members: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  attendees: true,
  interested: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Club = typeof clubs.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Response types
export type AuthResponse = {
  user: Omit<User, 'password'>;
  token: string;
};

export type EventWithDetails = Event & {
  attendeeCount: number;
  interestedCount: number;
  isAttending?: boolean;
  isInterested?: boolean;
};
