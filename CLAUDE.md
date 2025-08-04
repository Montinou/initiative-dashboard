# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint (note: ignores errors during builds)

### Package Management
Uses both npm and pnpm (lock files present for both). Prefer npm for consistency with package.json scripts.

## Project Architecture

### Framework & Stack
- **Next.js 15.2.4** with App Router architecture
- **React 19** with TypeScript
- **Tailwind CSS** with custom configuration for glassmorphism design system
- **Radix UI** components for accessible UI primitives
- **Recharts** for data visualization

### Directory Structure
```
app/                 # Next.js app router pages
├── globals.css      # Global styles with glassmorphism theme
├── layout.tsx       # Root layout with metadata
└── page.tsx         # Main page rendering DashboardOverview

components/
├── ui/              # Radix UI components (40+ components)
└── theme-provider.tsx

dashboard.tsx        # Main dashboard component (1155 lines)
├── Sample data and business logic
├── Glassmorphism scrollbar styles
├── 4 main views: overview, initiatives, areas, analytics
└── AI chat bot integration

lib/
└── utils.ts         # Utility functions (likely cn helper)

hooks/               # Custom React hooks
├── use-mobile.tsx
└── use-toast.ts
```

### Key Configuration
- **TypeScript**: Configured with Next.js plugin, strict mode, absolute imports via `@/*`
- **Tailwind**: Extended theme with glassmorphism colors, chart colors, sidebar colors, custom animations
- **Next.js Config**: ESLint and TypeScript errors ignored during builds, unoptimized images

### Design System
The application uses a glassmorphism design with:
- Backdrop blur effects and transparency
- Purple to cyan gradient theme
- Custom scrollbar styling
- Responsive design (mobile-first approach)
- Dark theme with glass morphic elements

### Data Architecture
Currently uses mock data defined in `dashboard.tsx`:
- 11 sample initiatives with progress tracking
- 6 business areas with objectives and metrics
- Chart data for visualizations
- Trend data for analytics

### Component Patterns
- Uses `"use client"` directives for client-side interactivity
- Animated counters and progress components
- Responsive design with mobile/desktop variants
- State management with React hooks (no external state library)

## Important Notes
- No test framework configured
- ESLint and TypeScript checks disabled in build process
- Heavy use of Tailwind utilities with custom glassmorphism classes
- Single large dashboard component handles all business logic
- AI chat bot with contextual responses based on dashboard data

## Development Guidelines
- Do not run linter