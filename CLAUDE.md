# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Invozen GST is a GST invoicing and compliance workspace for Indian small businesses. It's a full-stack application with:
- **Frontend**: Next.js 16.2.4 (App Router) with React 19, TypeScript, Tailwind CSS 4, Zustand for state management
- **Backend**: Node.js (TypeScript) - currently minimal, most logic is client-side
- **AI Integration**: Groq SDK (llama-3.3-70b-versatile) for GST assistance, HSN/SAC lookups, invoice validation, and business insights

## Architecture

### Frontend Structure (`frontend/`)

**Route Groups:**
- `(auth)` - Authentication pages: login, signup, forgot-password
- `(app)` - Protected app routes with AppShell layout (Sidebar + TopBar + MobileTabBar)

**Key Directories:**
- `app/components/` - All React components organized by domain
  - `ui/` - Reusable UI components (Button, Input, Modal, Toast, DataTable, etc.)
  - `layout/` - AppShell, Sidebar, TopBar, MobileTabBar
  - `sections/` - Landing page sections
  - Domain-specific: `invoices/`, `customers/`, `payments/`, `reports/`, `ai/`
- `lib/` - Business logic and state management
  - `store/` - Zustand stores for each domain (authStore, invoiceStore, customerStore, etc.)
  - `gst/` - GST calculation, validation, formatting, GSTR-1/3B report generation
  - `utils/` - Utility functions (cn, formatters, ID generation)
  - `mock/` - Mock data for development (auto-seeded on auth)
- `types/` - TypeScript type definitions for all domains
- `app/api/ai/` - Next.js API routes for Claude AI features
  - `chat/` - AI assistant chat
  - `hsn/` - HSN/SAC code suggestions
  - `insights/` - Business insights generation
  - `validate/` - Invoice data validation

### State Management

All state is managed via Zustand stores with persistence:
- `authStore` - User authentication and onboarding status
- `businessStore` - Business profile and GST settings
- `invoiceStore`, `customerStore`, `itemStore`, `paymentStore`, etc. - Domain-specific data
- `aiStore` - AI chat panel state and history
- `uiStore` - UI preferences (sidebar collapse, etc.)

### GST Business Logic (`frontend/lib/gst/`)

Critical GST calculation and compliance modules:
- `calculator.ts` - GST tax calculations (CGST/SGST for intra-state, IGST for inter-state)
- `validator.ts` - GSTIN validation, HSN/SAC validation
- `gstr1.ts` - GSTR-1 report generation (B2B, B2CS, CDNR, HSN summary)
- `gstr3b.ts` - GSTR-3B report generation (ITC claims, tax liability)
- `formatter.ts` - Indian number formatting, amount in words
- `constants.ts` - State codes, GST rates, HSN/SAC codes

### Invoice Flow

1. Invoice creation uses `InvoiceFormClient.tsx` with react-hook-form
2. Line items auto-calculate GST using `calculateLineItem()` from `gst/calculator.ts`
3. Supply type (intra/inter state) determines CGST+SGST vs IGST split
4. Invoice totals computed via `calculateInvoiceTotals()`
5. Invoice stored in `invoiceStore` (Zustand with localStorage persistence)
6. Mock data mode: all data exists client-side, no backend API calls

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
```

### Backend
Currently placeholder - no active backend services. All business logic runs in frontend.

## Key Conventions

### TypeScript Path Aliases
Use `@/` for imports from frontend root:
```typescript
import { useAuthStore } from '@/lib/store/authStore'
import { Button } from '@/app/components/ui/Button'
```

### Component Patterns
- Server Components: default for pages
- Client Components: marked with `'use client'` when using hooks, state, or browser APIs
- Form components typically use react-hook-form with Zod validation
- Client components have `*Client.tsx` suffix when paired with server page

### Styling
- Tailwind CSS 4 (note: newer version with potential breaking changes)
- Custom CSS variables in `globals.css` for brand colors (`--brand-*`, `--text-*`, `--bg-*`)
- Dark mode not implemented
- Indian rupee symbol: `₹` (U+20B9)
- Use `cn()` utility from `@/lib/utils/cn` for conditional classes

### GST-Specific Rules
- GSTIN format: 2-digit state code + 10-digit PAN + entity code + checksum (e.g., `29ABCDE1234F1Z5`)
- Intra-state supply: CGST + SGST (each half of total tax)
- Inter-state supply: IGST (full tax)
- HSN codes: 4-8 digits for goods, SAC codes: 6 digits for services
- E-invoice (IRN) required for B2B invoices above ₹5 lakhs (currently placeholder UI)
- GSTR-1: monthly/quarterly return for outward supplies
- GSTR-3B: monthly return for tax payment and ITC claims

## AI Features

All AI routes require `GROQ_API_KEY` environment variable (get free key at https://console.groq.com/keys).

**Chat Assistant** (`/api/ai/chat`):
- System prompt includes business context (revenue, outstanding, GST collected, ITC)
- Responds to GST compliance questions, filing guidance, ITC advice
- Uses streaming responses for real-time feedback

**HSN Lookup** (`/api/ai/hsn`):
- Suggests HSN/SAC codes based on product/service description
- Returns structured data with code, description, and GST rate

**Invoice Validation** (`/api/ai/validate`):
- Checks invoice data for common errors
- Validates GST calculations, GSTIN format, place of supply
- Returns warnings and suggestions

**Insights** (`/api/ai/insights`):
- Analyzes business data to generate actionable insights
- Cash flow predictions, overdue analysis, GST liability forecasts

## Testing & Data

Currently using mock data for all features:
- Mock data auto-seeds on login (see `lib/mock/seed.ts`)
- No backend database or API currently connected
- All CRUD operations update Zustand stores with localStorage persistence
- To reset data: clear localStorage and refresh

## Notes for Development

- Next.js 16+ has breaking changes - check `frontend/AGENTS.md` warning before using outdated patterns
- All monetary amounts stored and calculated in rupees with 2 decimal precision
- Date formats: ISO 8601 strings for storage, `date-fns` for display formatting
- GST calculations must round to 2 decimal places at each step (see `roundToTwo()` in calculator)
- Invoice numbers auto-generated but editable (pattern: `INV-YYYY-NNNN`)
- Place of Supply: 2-digit state code + state name (e.g., `29-Karnataka`)
