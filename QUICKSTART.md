# Invozen GST - Quick Start Guide

Get your Invozen GST application running in minutes!

---

## 🚀 Fast Setup (5 Minutes)

### Step 1: Run the Setup Script

```bash
cd "D:\testing\Invozen GST"
bash scripts/dev-setup.sh
```

This will:
- Check Node.js version
- Install all dependencies
- Create .env files from templates
- Generate Prisma client

### Step 2: Configure API Keys

#### Frontend (`frontend/.env.local`):

1. **Get Groq API Key** (Free):
   - Visit: https://console.groq.com/keys
   - Sign up and create an API key
   - Copy the key

2. **Get Clerk Keys** (Free):
   - Visit: https://dashboard.clerk.com
   - Create a new application
   - Copy the publishable and secret keys

3. **Edit `frontend/.env.local`:**
   ```env
   GROQ_API_KEY=gsk_your_actual_key_here
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   CLERK_SECRET_KEY=sk_test_your_actual_key_here
   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
   ```

#### Backend (`backend/.env`):

1. **Edit `backend/.env`:**
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL=file:./invozen.db
   CLERK_SECRET_KEY=sk_test_your_actual_key_here
   FRONTEND_URL=http://localhost:3000
   ```
   
   **Note:** Use the same `CLERK_SECRET_KEY` from frontend

### Step 3: Initialize Database

```bash
cd backend
npm run db:migrate
```

This creates the SQLite database with all required tables.

### Step 4: Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Wait for: `✓ Server running on port 4000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### Step 5: Open Your Browser

Visit: http://localhost:3000

You should see the Invozen GST login page!

---

## ✅ Verify Everything Works

### Check Health Endpoints:

**Frontend Health:**
```bash
curl http://localhost:3000/api/health
```

**Backend Health:**
```bash
curl http://localhost:4000/health
```

Both should return 200 OK with JSON.

### Test Login:

1. Go to http://localhost:3000/login
2. You should see the Clerk login UI
3. Sign up for a new account
4. You'll be redirected to /dashboard

---

## 🐛 Troubleshooting

### "Module not found" errors:

```bash
# Reinstall dependencies
cd frontend && npm install
cd ../backend && npm install
```

### "Prisma client not generated":

```bash
cd backend
npm run db:generate
```

### "Port already in use":

```bash
# Find and kill process on port 4000
# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Then restart backend
```

### "GROQ_API_KEY not configured":

- Check `frontend/.env.local` exists
- Ensure no placeholder values (no "your_" in keys)
- Restart frontend server after changing .env

### "Clerk authentication error":

- Verify both frontend and backend have the same `CLERK_SECRET_KEY`
- Check keys are from the same Clerk project
- Restart both servers after changing keys

---

## 📁 Project Structure

```
invozen-gst/
├── frontend/                  # Next.js 16 frontend
│   ├── app/                  # App Router pages
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (app)/           # Protected app pages
│   │   ├── api/             # API routes (proxy to backend)
│   │   └── components/      # React components
│   ├── lib/                 # Business logic & utilities
│   │   ├── store/          # Zustand state management
│   │   ├── gst/            # GST calculation logic
│   │   └── api.ts          # Backend API client
│   └── .env.local          # Frontend config (CREATE THIS)
│
├── backend/                   # Express + TypeScript backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth, CORS, rate limiting
│   │   └── lib/            # Database, logger, utils
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── .env                # Backend config (EDIT THIS)
│
└── scripts/
    └── dev-setup.sh         # Automated setup script
```

---

## 🎯 What's Fixed?

This setup resolves **35 critical bugs**:

✅ Missing environment configuration  
✅ Broken frontend-backend communication  
✅ Module resolution errors  
✅ Authentication setup  
✅ Database configuration  
✅ AI endpoint errors  
✅ Rate limiting for security  
✅ Error boundaries  
✅ Startup validation  

See `FIXES_APPLIED.md` for complete details.

---

## 📚 Next Steps

After your app is running:

1. **Explore the Dashboard:**
   - Create your first invoice
   - Add customers
   - Try AI features (HSN suggestions, validation)

2. **Configure Optional Features:**
   - E-invoicing (NIC IRP credentials)
   - Payment gateway (Razorpay)
   - File uploads (Cloudinary)

3. **Read Documentation:**
   - `CLAUDE.md` - Development guidelines
   - `frontend/AGENTS.md` - Next.js 16 notes
   - `FIXES_APPLIED.md` - All fixes details

---

## 🆘 Need Help?

- **Environment issues:** Check `FIXES_APPLIED.md` verification checklist
- **API errors:** Check browser console and backend logs
- **Database errors:** Run `cd backend && npm run db:migrate`
- **Still stuck?** Create an issue with:
  - Error message
  - Steps to reproduce
  - Console output from both servers

---

## 🎉 Success!

If you see the Invozen GST dashboard, you're all set!

Key URLs:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api/v1
- **Health Check:** http://localhost:4000/health

Happy invoicing! 🚀
