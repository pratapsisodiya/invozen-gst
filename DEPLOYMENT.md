# Invozen GST - Production Deployment Guide

This guide walks you through deploying Invozen GST to production using Vercel (frontend) and Railway (backend + PostgreSQL).

## Prerequisites

1. **Accounts:**
   - [Vercel account](https://vercel.com/signup)
   - [Railway account](https://railway.app/)
   - [Clerk account](https://clerk.com/) (production keys)
   - [Cloudinary account](https://cloudinary.com/) (for logo uploads)
   - NIC IRP credentials (for e-invoice generation)

2. **Local Setup:**
   - Git repository pushed to GitHub
   - Node.js 18+ installed
   - PostgreSQL client (optional, for local testing)

## Step 1: Database Setup (Railway PostgreSQL)

### 1.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Railway will automatically create a PostgreSQL database

### 1.2 Get Database Connection String

1. Click on your PostgreSQL service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value (starts with `postgresql://...`)
4. Save it for later use

## Step 2: Backend Deployment (Railway)

### 2.1 Deploy Backend Service

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Connect your GitHub account if not already connected
3. Select your `Invozen GST` repository
4. Railway will detect it as a Node.js project

### 2.2 Configure Build Settings

1. Click on your backend service
2. Go to **"Settings"** tab
3. Set **"Root Directory"**: `backend`
4. Set **"Build Command"**: `npm install && npx prisma generate && npm run build`
5. Set **"Start Command"**: `npm run migrate && npm start`

### 2.3 Set Environment Variables

Go to **"Variables"** tab and add:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway will auto-populate this
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://your-domain.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NIC_IRP_ENVIRONMENT=sandbox
NIC_IRP_USERNAME=your_username
NIC_IRP_PASSWORD=your_password
NIC_IRP_GSTIN=29ABCDE1234F1Z5
NIC_IRP_CLIENT_ID=your_client_id
NIC_IRP_CLIENT_SECRET=your_client_secret
```

**Important:**
- Replace `sk_live_xxx` with your production Clerk secret key
- Replace Cloudinary credentials with your actual keys
- Start with `sandbox` for NIC IRP, switch to `production` after testing
- `FRONTEND_URL` will be updated after Vercel deployment

### 2.4 Run Database Migrations

1. After deployment, click **"Deployments"** tab
2. Wait for deployment to complete
3. Migrations will run automatically via `npm run migrate` command

### 2.5 Get Backend URL

1. Go to **"Settings"** tab
2. Click **"Generate Domain"** (or add custom domain)
3. Copy the URL (e.g., `https://invozen-backend.up.railway.app`)
4. Save it for frontend configuration

## Step 3: Frontend Deployment (Vercel)

### 3.1 Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 3.2 Configure Build Settings

1. Set **"Root Directory"**: `frontend`
2. **"Framework Preset"**: Next.js (auto-detected)
3. **"Build Command"**: `npm run build` (default)
4. **"Output Directory"**: `.next` (default)

### 3.3 Set Environment Variables

Add the following in **"Environment Variables"**:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding

# Backend API
NEXT_PUBLIC_API_URL=https://invozen-backend.up.railway.app/api/v1

# AI Features (Optional)
GROQ_API_KEY=your_groq_key_here
```

**Important:**
- Replace `pk_live_xxx` with your production Clerk publishable key
- Replace `NEXT_PUBLIC_API_URL` with your Railway backend URL from Step 2.5

### 3.4 Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Wait for deployment to complete (~2-3 minutes)

### 3.5 Get Frontend URL

1. After deployment, copy your Vercel URL (e.g., `https://invozen-gst.vercel.app`)
2. **Go back to Railway** and update `FRONTEND_URL` environment variable
3. Railway will automatically redeploy the backend

## Step 4: Production Authentication (Clerk)

### 4.1 Create Production Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click **"Create Application"**
3. Name it **"Invozen GST Production"**
4. Select authentication methods (Email, Google, etc.)

### 4.2 Configure Allowed Domains

1. Go to **"Domains"** in Clerk dashboard
2. Add your Vercel domain (e.g., `invozen-gst.vercel.app`)
3. If using custom domain, add that too

### 4.3 Get Production Keys

1. Go to **"API Keys"** tab
2. Copy **"Publishable Key"** (starts with `pk_live_`)
3. Copy **"Secret Key"** (starts with `sk_live_`)
4. Update these in both Vercel and Railway environment variables
5. Redeploy both services

## Step 5: Domain Configuration (Optional)

### 5.1 Add Custom Domain to Vercel

1. Go to Vercel project **"Settings"** → **"Domains"**
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Follow DNS configuration instructions
4. Add CNAME record pointing to Vercel

### 5.2 Add Custom Domain to Railway

1. Go to Railway backend service **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter your backend domain (e.g., `api.yourdomain.com`)
4. Add CNAME record as instructed

### 5.3 Update Environment Variables

After adding custom domains:
- Update `FRONTEND_URL` in Railway to your custom frontend domain
- Update `NEXT_PUBLIC_API_URL` in Vercel to your custom backend domain
- Update Clerk allowed domains

## Step 6: Data Migration (If Migrating from SQLite)

### 6.1 Run Migration Script

From your local machine:

```bash
cd backend

# Set environment variables
export SQLITE_DATABASE_URL="file:./prisma/invozen.db"
export DATABASE_URL="your-railway-postgres-url"

# Run migration
npx tsx scripts/migrate-to-postgres.ts
```

### 6.2 Verify Migration

Check the migration output for success messages. All record counts should match between SQLite and PostgreSQL.

## Step 7: Post-Deployment Testing

### 7.1 Health Check

Visit `https://your-backend.railway.app/health` - should return:
```json
{"status":"ok","timestamp":"..."}
```

### 7.2 Test Authentication

1. Go to your frontend URL
2. Click **"Sign Up"**
3. Create a test account
4. Verify single-user enforcement (try creating another account - should fail)

### 7.3 Test Core Features

1. **Business Onboarding**: Complete the onboarding wizard
2. **Logo Upload**: Upload a business logo in settings
3. **Create Invoice**: Create a test invoice
4. **Generate PDF**: Download invoice PDF (should include logo)
5. **Generate IRN**: Create a B2B invoice >₹5L and generate IRN (sandbox)
6. **Verify QR Code**: Check that IRN QR code appears on PDF

## Step 8: Monitoring & Alerts

### 8.1 Set Up Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com/) (free):
1. Add monitor for `https://your-backend.railway.app/health`
2. Set check interval to 5 minutes
3. Add email alerts

### 8.2 Railway Alerts

1. Go to Railway project **"Settings"** → **"Usage"**
2. Enable **"Usage Alerts"**
3. Set thresholds (e.g., $20/month budget alert)

### 8.3 Monitor Logs

**Railway Logs:**
- Click on backend service → **"Logs"** tab
- Monitor for errors during first 24 hours

**Vercel Logs:**
- Go to project → **"Logs"** tab
- Check for deployment and runtime errors

## Step 9: Switch to Production NIC IRP

⚠️ **Only after thorough sandbox testing!**

1. Register for production NIC IRP credentials
2. Update Railway environment variables:
   ```bash
   NIC_IRP_ENVIRONMENT=production
   NIC_IRP_USERNAME=your_prod_username
   NIC_IRP_PASSWORD=your_prod_password
   NIC_IRP_GSTIN=your_actual_gstin
   NIC_IRP_CLIENT_ID=your_prod_client_id
   NIC_IRP_CLIENT_SECRET=your_prod_client_secret
   ```
3. Redeploy backend
4. Test with one real invoice
5. Monitor first 10 IRN generations closely

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**:
- Check `DATABASE_URL` in Railway environment variables
- Ensure PostgreSQL service is running
- Verify network connectivity

### CORS Errors

**Error**: `Origin not allowed by CORS`

**Solution**:
- Update `FRONTEND_URL` in Railway to match your Vercel domain
- Ensure no trailing slashes in URLs
- Redeploy backend

### IRN Generation Fails

**Error**: `Authentication failed` or `Invalid GSTIN`

**Solution**:
- Verify all NIC IRP credentials are correct
- Check if using correct environment (sandbox vs production)
- Ensure GSTIN format matches invoice data
- Check Railway logs for detailed error messages

### Logo Upload Fails

**Error**: `Failed to upload logo`

**Solution**:
- Verify Cloudinary credentials are correct
- Check file size (must be <5MB)
- Ensure file type is PNG, JPG, or SVG
- Test Cloudinary credentials locally first

### Clerk Authentication Issues

**Error**: `Invalid token` or `Unauthorized`

**Solution**:
- Verify Clerk keys match in both Vercel and Railway
- Ensure production keys (not test keys) are being used
- Check allowed domains in Clerk dashboard
- Clear browser cache and cookies

## Cost Estimates

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel | Hobby | $0 (free tier, $20 after traffic limit) |
| Railway | Starter | $5 credit/month (~$5-10 usage) |
| PostgreSQL | Railway | Included (500MB free) |
| Clerk | Pro | $25/month (1000 MAU) |
| Cloudinary | Free | $0 (25GB storage included) |
| NIC IRP | Government | $0 (free GST service) |
| **Total** | | **$30-35/month** |

## Backup Strategy

### Database Backups

Railway PostgreSQL includes automatic backups:
- Daily snapshots retained for 7 days
- Manual snapshots can be created anytime

**To create manual backup:**
1. Go to PostgreSQL service in Railway
2. Click **"Backups"** tab
3. Click **"Create Snapshot"**

### Restore from Backup

1. Click on snapshot
2. Click **"Restore"** button
3. Select target database
4. Confirm restoration

## Security Checklist

- [ ] Production Clerk keys configured (not test keys)
- [ ] CORS whitelist includes only your domains
- [ ] Rate limiting enabled on all API endpoints
- [ ] Cloudinary credentials secured (not exposed in frontend)
- [ ] NIC IRP credentials secured (backend only)
- [ ] HTTPS enforced on all domains
- [ ] Database connection strings not exposed
- [ ] Environment variables set in hosting platforms (not in code)
- [ ] Audit logging enabled for critical operations

## Next Steps

After successful deployment:

1. **Monitor First Week**:
   - Check logs daily for errors
   - Monitor API response times (<500ms p95)
   - Track Clerk active users
   - Verify IRN generation success rate (>95%)

2. **Collect User Feedback**:
   - Set up feedback form
   - Track feature usage
   - Identify pain points

3. **Plan Phase 2 Features**:
   - Multi-user workspace (teams)
   - Payment gateway integration (Razorpay)
   - E-way bill NIC API integration
   - Advanced analytics

## Support

For deployment issues:
- **Railway**: https://railway.app/help
- **Vercel**: https://vercel.com/support
- **Clerk**: https://clerk.com/support
- **Cloudinary**: https://support.cloudinary.com/

---

**Deployment Status**: Ready for Production Launch ✅

**Last Updated**: May 2026
