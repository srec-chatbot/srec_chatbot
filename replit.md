# SREC Connect - College Social & Event Platform

## Overview

SREC Connect is a college-exclusive social platform for Sri Ramakrishna Engineering College (SREC) students. The platform enables students, faculty, and organizers to connect through events, clubs, and real-time notifications. Users can register with @srec.ac.in emails only, select roles, join clubs, browse and create events, and receive personalized notifications based on their interests.

Key features include:
- Email-restricted authentication (@srec.ac.in domain only)
- Role-based access control (Student, Faculty, Organizer)
- Club management and membership system
- Event creation and RSVP functionality
- Real-time notifications via WebSockets
- Personalized event feeds based on club memberships
- Responsive design with modern UI components

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected/public route components
- **State Management**: TanStack Query for server state management with React hooks for local state
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **Authentication**: Context-based auth provider with JWT token management in localStorage

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with consistent error handling and request/response logging
- **Real-time Communication**: WebSocket server for live notifications using ws library
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Middleware**: Custom authentication middleware for protected routes

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Normalized tables for users, events, clubs, and notifications
- **Connection**: Neon Database serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for database schema management and migrations
- **Development Storage**: In-memory storage implementation for development/testing

### Authentication and Authorization
- **Registration**: Email domain validation for @srec.ac.in addresses only
- **JWT Implementation**: Secure token generation with user ID payload
- **Role-based Access**: Three user roles (Student, Faculty, Organizer) with different permissions
- **Protected Routes**: Client-side route protection with automatic redirects
- **Session Management**: Token-based sessions with automatic token validation

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with schema validation

### Development Tools
- **Vite**: Frontend build tool with hot module replacement and optimized builds
- **TypeScript**: Static type checking across frontend, backend, and shared schemas
- **ESBuild**: Fast JavaScript bundler for production server builds

### UI and Design
- **Radix UI**: Headless UI components for accessibility and keyboard navigation
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Consistent icon library for UI elements
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### Data Fetching and Validation
- **TanStack Query**: Server state management with caching, background updates, and error handling
- **React Hook Form**: Form state management with performance optimization
- **Zod**: Runtime type validation for API requests and responses
- **Drizzle Zod**: Integration between Drizzle schemas and Zod validation

### Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time notifications
- **Custom WebSocket Client**: React hook for managing WebSocket connections with reconnection logic

### Development and Deployment
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Runtime Error Overlay**: Development error reporting and debugging tools