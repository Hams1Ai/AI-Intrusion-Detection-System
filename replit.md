# AI Intrusion Detection System

## Overview

This is a gamified SOC (Security Operations Center) analyst training application that simulates intrusion detection decision-making. Users analyze network traffic flows and make decisions to either ignore or block them, receiving immediate feedback based on the accuracy of their choices. The system presents network flows with risk scores from an XGBoost classifier and recommended actions from a PPO reinforcement learning agent, allowing users to compare their decisions against AI models.

The application uses a cyberpunk/futuristic design aesthetic with neon accents, inspired by sci-fi security dashboards, to create an engaging training environment for security analysts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- React Router (wouter) for lightweight client-side routing
- TanStack Query for server state management and API caching

**UI Framework:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom cyberpunk theme
- Orbitron and Inter fonts for futuristic typography
- Custom CSS variables for theming (neon cyan, green, red accents)

**Design Pattern:**
The frontend follows a component-based architecture with clear separation between:
- Pages: High-level route components (`game.tsx`, `not-found.tsx`)
- UI Components: Reusable shadcn components in `components/ui/`
- Shared Types: TypeScript schemas in `shared/schema.ts` using Zod validation

**State Management Strategy:**
- Server state managed through TanStack Query with disabled refetching (single-page game session)
- Local component state for UI interactions
- No global state management needed due to simple application flow

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Node.js runtime with ES modules
- HTTP server for API endpoints (no WebSocket integration currently)

**API Design:**
RESTful endpoints following a simple request-response pattern:
- `GET /api/next-flow` - Retrieves a randomly generated network flow for analysis
- `POST /api/submit-decision` - Submits user's decision and calculates reward
- `GET /api/session-stats` - Retrieves cumulative session statistics

**Data Flow:**
1. Client requests network flow data
2. Server generates simulated flow with risk scores and labels
3. User makes decision (ignore/block)
4. Server validates decision, calculates reward based on true label
5. Server updates session statistics and returns result
6. Client displays feedback and updates UI

**Business Logic:**
The reward calculation implements a security-focused scoring system:
- Correctly ignoring normal traffic: +10 points
- Incorrectly ignoring an attack: -10 points (security breach penalty)
- Correctly blocking an attack: +8 points
- Incorrectly blocking normal traffic: -5 points (user impact penalty)

This asymmetric reward structure emphasizes security over convenience, penalizing missed attacks more heavily than false positives.

### Data Storage Solutions

**Current Implementation:**
- In-memory storage for session state (no persistence between server restarts)
- Session statistics maintained in server memory
- Flow data generated on-demand (no static dataset currently loaded)

**Database Configuration:**
- Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- Schema defined in `shared/schema.ts`
- Connection string via `DATABASE_URL` environment variable
- Migration support through Drizzle Kit

**Design Decision:**
The application currently uses simulated data generation rather than loading from a CSV file as originally planned. The `storage.ts` module contains a `generateSimulatedFlow()` function that creates realistic network flow data with correlated risk scores and labels. This approach was chosen for:
- Simplified deployment (no external data dependencies)
- Consistent testing environment
- Easier demonstration and prototyping

However, the architecture supports database integration through Drizzle ORM if persistent storage of game sessions, user progress, or real network flow datasets is needed in the future.

### External Dependencies

**UI Component Libraries:**
- Radix UI primitives (dialogs, dropdowns, tooltips, etc.) for accessible, unstyled components
- Lucide React for consistent iconography
- class-variance-authority and clsx for conditional styling utilities
- embla-carousel-react for potential carousel implementations

**State Management:**
- TanStack React Query v5 for server state synchronization and caching
- React Hook Form with Zod resolvers for potential form validation

**Styling:**
- Tailwind CSS v3 with custom configuration
- PostCSS for CSS processing
- Autoprefixer for browser compatibility

**Build Tools:**
- Vite for fast development and optimized production builds
- esbuild for server-side bundling (reduces syscalls for faster cold starts)
- TypeScript compiler for type checking

**Development Tools (Replit-specific):**
- @replit/vite-plugin-runtime-error-modal for development error overlay
- @replit/vite-plugin-cartographer for code navigation
- @replit/vite-plugin-dev-banner for development environment indication

**Session Management:**
- Express-session with connect-pg-simple for PostgreSQL session storage (configured but not actively used with current in-memory approach)

**Validation:**
- Zod for runtime type validation and schema definition
- drizzle-zod for database schema validation

**Future Integration Points:**
The attached design documents reference ML models (XGBoost classifier, PPO RL agent) that would be loaded as external dependencies if the backend were implemented in Python/Flask. The current Node.js implementation simulates this functionality, but the architecture could be extended to call a Python microservice or ML API for real model predictions.