# Invozen GST Backend

Express.js + TypeScript + Prisma backend for Invozen GST invoicing platform.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use Railway/Supabase)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Use PostgreSQL for production-like development
DATABASE_URL="postgresql://user:password@localhost:5432/invozen_dev?schema=public"

# Or use SQLite for quick local testing
# DATABASE_URL="file:./prisma/invozen.db"

# Clerk (get from https://dashboard.clerk.com)
CLERK_SECRET_KEY=sk_test_your_key_here

# Other variables
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Set Up Database

#### Option A: Local PostgreSQL

Install PostgreSQL locally, then:

```bash
# Create database
createdb invozen_dev

# Run migrations
npm run migrate

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

#### Option B: Use SQLite for Development

Update `.env`:
```bash
DATABASE_URL="file:./prisma/invozen.db"
```

Then run migrations:
```bash
npm run migrate
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run migrate` | Run Prisma migrations (production) |
| `npm run db:migrate` | Run migrations in development |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:studio` | Open Prisma Studio |

## Database Migrations

### Creating Migrations

When you change the Prisma schema:

```bash
npm run migration:create
```

This creates a new migration file without applying it.

### Applying Migrations

**Development:**
```bash
npm run db:migrate
```

**Production:**
```bash
npm run migrate
```

## Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app setup
│   ├── index.ts            # Server entry point
│   ├── config.ts           # Environment configuration
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client instance
│   │   ├── response.ts     # API response helpers
│   │   ├── id.ts           # ID generation utility
│   │   ├── cloudinary/     # File upload service
│   │   │   └── index.ts
│   │   ├── einvoice/       # E-invoice (IRN) service
│   │   │   └── nicIrp.ts
│   │   └── validation/     # Zod validation schemas
│   │       └── invoice.ts
│   ├── middleware/
│   │   ├── auth.ts         # Clerk JWT validation
│   │   ├── errorHandler.ts # Global error handler
│   │   ├── rateLimit.ts    # Rate limiting
│   │   └── singleUser.ts   # Single-user enforcement (MVP)
│   └── routes/
│       ├── index.ts        # Route aggregator
│       ├── business.ts     # Business profile & logo upload
│       ├── invoices.ts     # Invoice CRUD + IRN generation
│       ├── customers.ts    # Customer management
│       ├── items.ts        # Product/service items
│       ├── payments.ts     # Payment records
│       ├── vendors.ts      # Supplier management
│       └── ... (18+ route files)
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── scripts/
│   └── migrate-to-postgres.ts  # SQLite → PostgreSQL migration
├── package.json
└── tsconfig.json
```

## API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Health Check
```
GET /health
```

### Business Profile
```
GET    /business              # Get business profile
PUT    /business              # Create/update profile
POST   /business/upload-logo  # Upload business logo
```

### Invoices
```
GET    /invoices              # List invoices (with filters)
POST   /invoices              # Create invoice
GET    /invoices/:id          # Get single invoice
PUT    /invoices/:id          # Update invoice
DELETE /invoices/:id          # Delete invoice
POST   /invoices/bulk         # Bulk operations
POST   /invoices/:id/generate-irn  # Generate e-invoice IRN
POST   /invoices/:id/cancel-irn    # Cancel IRN
```

### Customers
```
GET    /customers             # List customers
POST   /customers             # Create customer
GET    /customers/:id         # Get customer
PUT    /customers/:id         # Update customer
DELETE /customers/:id         # Delete customer
```

Similar CRUD endpoints exist for:
- `/items` - Products/services
- `/payments` - Payment records
- `/vendors` - Suppliers
- `/purchases` - Purchase invoices
- `/expenses` - Expense tracking
- `/quotations` - Quotations
- `/credit-notes` - Credit notes
- `/debit-notes` - Debit notes
- `/recurring` - Recurring invoices
- `/notifications` - Notifications
- `/filings` - GST filing records
- `/audit` - Audit logs
- `/attachments` - File attachments
- `/inventory` - Stock management
- `/ca-clients` - CA portal

## Authentication

All API endpoints (except `/health`) require Clerk JWT authentication.

**Request Header:**
```
Authorization: Bearer <clerk_jwt_token>
```

The `requireAuth` middleware validates the token and extracts `userId` from the JWT payload.

## Deploying On Vercel

This backend can run as Vercel Node functions without changing the Express route tree.

1. Deploy the `backend/` folder as its own Vercel project.
2. Set the required environment variables in Vercel, especially `DATABASE_URL`, `CLERK_SECRET_KEY`, and `FRONTEND_URL`.
3. Run Prisma migrations against the production database before or during deployment with `prisma migrate deploy`.
4. Use `/api/v1/*` for the REST API and `/health` for the health check. Vercel rewrites `/` and `/health` to the health function.

Notes:
- File uploads already use Cloudinary and in-memory parsing, which is compatible with serverless deployment.
- The Prisma client is generated during install via `postinstall`, and `vercel-build` also runs `prisma generate` before the TypeScript build.
- If the frontend is hosted separately, update `FRONTEND_URL` to that deployed origin so CORS stays open for the app.

## Security Features

### Rate Limiting
- General API: 100 requests per 15 minutes
- E-invoice (IRN): 50 requests per hour
- Authentication: 5 requests per 15 minutes

### Input Validation
- Zod schemas validate all incoming data
- Prevents SQL injection, XSS, and malformed requests

### CORS
- Whitelist-based origin validation
- Only configured frontend URLs allowed

### Security Headers
- Helmet.js for secure HTTP headers
- Content Security Policy (CSP)
- XSS protection

### Audit Logging
- All critical operations logged to `AuditEntry` table
- Includes IP address, user agent, timestamp

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/invozen` |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes | `sk_test_xxx` or `sk_live_xxx` |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | `http://localhost:3000` |
| `NODE_ENV` | Environment | No | `development` or `production` |
| `PORT` | Server port | No | `4000` (default) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No* | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No* | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No* | - |
| `NIC_IRP_ENVIRONMENT` | E-invoice environment | No* | `sandbox` or `production` |
| `NIC_IRP_USERNAME` | NIC IRP username | No* | - |
| `NIC_IRP_PASSWORD` | NIC IRP password | No* | - |
| `NIC_IRP_GSTIN` | Your GSTIN | No* | `29ABCDE1234F1Z5` |
| `NIC_IRP_CLIENT_ID` | NIC IRP client ID | No* | - |
| `NIC_IRP_CLIENT_SECRET` | NIC IRP client secret | No* | - |

*Required for specific features (logo upload, e-invoice generation)

## Database Schema

The application uses 22 Prisma models for multi-tenant GST invoicing:

**Core Models:**
- `BusinessProfile` - Business information (1 per user)
- `Customer` - Customer records
- `Item` - Products/services catalog
- `Invoice` - Sales invoices
- `Payment` - Payment transactions
- `Vendor` - Supplier records
- `PurchaseInvoice` - Vendor bills

**GST Compliance:**
- `FilingRecord` - GSTR-1, GSTR-3B filing status
- `EWayBill` - E-way bill records
- `ConsolidatedEWayBill` - Consolidated e-way bills

**Advanced Features:**
- `Quotation` - Customer quotations
- `CreditNote` - Sales returns
- `DebitNote` - Purchase returns
- `RecurringTemplate` - Recurring invoice templates
- `RecurringLog` - Recurring execution history
- `Expense` - Expense tracking
- `Notification` - User notifications
- `AuditEntry` - Audit trail
- `Attachment` - File attachments
- `InventoryMovement` - Stock movements
- `InventorySnapshot` - Current stock levels
- `CAClient` - CA portal users

All models are indexed by `userId` for multi-tenancy.

## Testing

### Manual Testing with cURL

**Health Check:**
```bash
curl http://localhost:4000/health
```

**Get Business Profile (requires auth):**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:4000/api/v1/business
```

### Testing with Postman

1. Import the API collection (create one if needed)
2. Set `BASE_URL` variable to `http://localhost:4000/api/v1`
3. Add `Authorization` header with Clerk JWT token
4. Test endpoints

## Troubleshooting

### Database Connection Failed

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
- Ensure PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env`
- Verify database exists: `psql -l`

### Prisma Client Generation Failed

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npm run db:generate
```

### Migration Failed

**Error:** `P3005: The database schema is not empty`

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually drop all tables
psql -d invozen_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then re-run migrations
npm run migrate
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::4000`

**Solution:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or use different port in .env
PORT=4001
```

## Production Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed production deployment guide.

**Quick checklist:**
- [ ] Set `NODE_ENV=production`
- [ ] Use production Clerk keys (`sk_live_`)
- [ ] Use PostgreSQL (not SQLite)
- [ ] Set all required environment variables
- [ ] Run `npm run migrate` before starting server
- [ ] Enable HTTPS
- [ ] Set up monitoring and alerts
- [ ] Configure database backups

## Contributing

This is a production application. Code changes should:
- Follow existing TypeScript patterns
- Include proper error handling
- Add Zod validation for new endpoints
- Update Prisma schema for database changes
- Include audit logging for critical operations

## License

Proprietary - All Rights Reserved
