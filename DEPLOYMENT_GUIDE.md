# Deployment Guide - Skool-Inspired Platform

This guide covers deploying your full-stack platform with:

- **Frontend**: React + Tailwind (Vercel)
- **Backend**: Node.js + Express (Render/Railway)
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary or AWS S3
- **Payments**: Stripe

---

## Prerequisites

✅ Node.js 18+ installed  
✅ Git repository (GitHub, GitLab, or Bitbucket)  
✅ MongoDB Atlas account  
✅ Stripe account  
✅ Vercel account (frontend)  
✅ Render or Railway account (backend)

---

## Part 1: Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier M0 is fine for development)
3. Configure Network Access:
   - Click "Network Access" → "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for production
4. Create Database User:
   - Click "Database Access" → "Add New Database User"
   - Username: `yourUsername`
   - Password: Generate a secure password
   - Database User Privileges: "Read and write to any database"

### Step 2: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string:
   ```
   mongodb+srv://yourUsername:<password>@cluster0.xxxxx.mongodb.net/skool?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Replace `skool` with your database name

---

## Part 2: Backend Deployment (Render or Railway)

### Option A: Deploy to Render

#### Step 1: Create Render Account

1. Go to [Render.com](https://render.com) and sign up
2. Connect your GitHub/GitLab account

#### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - **Name**: `skool-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` or `node src/server.js`
   - **Instance Type**: Free (or Starter for production)

#### Step 3: Environment Variables

Add these environment variables in Render dashboard:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://yourUsername:password@cluster0.xxxxx.mongodb.net/skool
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=7d
CLIENT_URLS=https://your-frontend.vercel.app,https://skool.yourdomain.com
CLIENT_URL=https://your-frontend.vercel.app

# SMTP (Gmail, SendGrid, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password
```

#### Step 4: Deploy

- Click "Create Web Service"
- Render will automatically build and deploy
- Your backend URL: `https://skool-backend.onrender.com`

### Option B: Deploy to Railway

#### Step 1: Create Railway Account

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Deploy

1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Click "Add variables" and add all environment variables (same as Render)
4. Railway will auto-detect Node.js and deploy
5. Get your backend URL: `https://your-project.up.railway.app`

---

## Part 3: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Create `.env.production` in `frontend/` directory:

```env
REACT_APP_API_URL=https://skool-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://skool-backend.onrender.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
```

### Step 2: Deploy to Vercel

#### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Method 2: Vercel Dashboard

1. Go to [Vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure:

   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

5. Add Environment Variables:

   ```
   REACT_APP_API_URL=https://skool-backend.onrender.com/api
   REACT_APP_SOCKET_URL=https://skool-backend.onrender.com
   REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
   ```

6. Click "Deploy"
7. Your frontend URL: `https://your-project.vercel.app`

### Step 3: Update Backend CORS

After deployment, update backend environment variables:

```env
CLIENT_URLS=https://your-project.vercel.app
```

Redeploy backend if necessary.

---

## Part 4: Stripe Webhook Configuration

### Step 1: Get Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://skool-backend.onrender.com/api/payments/webhook`
4. Select events to listen:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 2: Add to Backend Environment

Update `STRIPE_WEBHOOK_SECRET` in your backend environment variables with the signing secret.

---

## Part 5: Custom Domain (Optional)

### Frontend (Vercel)

1. Go to your Vercel project → Settings → Domains
2. Add your custom domain (e.g., `skool.yourdomain.com`)
3. Update your domain DNS:
   - Type: `CNAME`
   - Name: `skool` (or `@` for root)
   - Value: `cname.vercel-dns.com`

### Backend (Render)

1. Go to your Render service → Settings → Custom Domain
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Update DNS:
   - Type: `CNAME`
   - Name: `api`
   - Value: Your Render URL

---

## Part 6: Post-Deployment Checklist

### Backend Health Check

```bash
curl https://skool-backend.onrender.com/api/health
```

Expected response:

```json
{
  "status": "OK",
  "timestamp": "2025-11-14T..."
}
```

### Test Registration

```bash
curl -X POST https://skool-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Test CORS

```bash
curl -X OPTIONS https://skool-backend.onrender.com/api/auth/register \
  -H "Origin: https://your-project.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -i
```

Look for:

```
Access-Control-Allow-Origin: https://your-project.vercel.app
```

### Frontend Tests

1. Open `https://your-project.vercel.app`
2. Test registration and login
3. Verify dark/light mode toggle
4. Test course browsing
5. Test community chat (Socket.io)
6. Test payment flow (Stripe)

---

## Part 7: Environment-Specific Configuration

### Development

```bash
# Backend (.env)
NODE_ENV=development
CLIENT_URLS=http://localhost:3000,http://localhost:3001

# Frontend (.env.development)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Production

```bash
# Backend (Render/Railway)
NODE_ENV=production
CLIENT_URLS=https://your-project.vercel.app

# Frontend (Vercel)
REACT_APP_API_URL=https://skool-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://skool-backend.onrender.com
```

---

## Part 8: Monitoring & Maintenance

### Backend Logs (Render)

1. Go to your Render service
2. Click "Logs" tab
3. Monitor real-time logs

### Frontend Analytics (Vercel)

1. Go to your Vercel project
2. Click "Analytics" tab
3. Monitor traffic, performance

### Database Monitoring (MongoDB Atlas)

1. Go to your cluster
2. Click "Metrics"
3. Monitor connections, operations, storage

---

## Part 9: Troubleshooting

### CORS Errors

**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:

1. Check `CLIENT_URLS` in backend includes your frontend URL
2. Verify frontend is using correct `REACT_APP_API_URL`
3. Restart backend after updating environment variables

### 500 Internal Server Error

**Problem**: API requests return 500 errors

**Solution**:

1. Check backend logs for stack trace
2. Verify `MONGODB_URI` is correct
3. Ensure all required env variables are set

### Socket.io Not Connecting

**Problem**: Real-time chat not working

**Solution**:

1. Check `REACT_APP_SOCKET_URL` matches backend URL
2. Ensure Socket.io CORS allows frontend origin
3. Verify WebSocket support on hosting platform

### Stripe Payments Failing

**Problem**: Checkout not completing

**Solution**:

1. Verify `STRIPE_SECRET_KEY` is set
2. Check webhook endpoint is accessible
3. Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
4. Test with Stripe test mode first

---

## Part 10: Scaling Considerations

### Performance Optimization

1. **Enable caching**: Redis for session storage
2. **CDN**: Cloudflare for static assets
3. **Database indexing**: Index frequently queried fields
4. **Image optimization**: Use Cloudinary transformations

### Security Best Practices

1. **HTTPS only**: Enforce SSL/TLS
2. **Rate limiting**: Prevent API abuse
3. **Input validation**: Sanitize all user inputs
4. **JWT rotation**: Implement refresh tokens
5. **Secure headers**: Helmet.js already configured

### Backup Strategy

1. **MongoDB Atlas**: Enable automatic backups
2. **Code**: Push to Git regularly
3. **Environment variables**: Store securely (1Password, etc.)

---

## Part 11: Continuous Deployment

### Auto-Deploy on Push

**Vercel** (Frontend):

- Automatically deploys on every push to `main` branch
- Preview deployments for pull requests

**Render** (Backend):

- Enable "Auto-Deploy" in settings
- Deploys automatically on Git push

**Railway** (Backend):

- Auto-deploys on Git push by default

---

## Support & Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **Stripe Docs**: https://stripe.com/docs

---

## Quick Reference: URLs

After deployment, update these in your documentation:

```
Frontend: https://your-project.vercel.app
Backend API: https://skool-backend.onrender.com/api
Backend Health: https://skool-backend.onrender.com/api/health
Stripe Webhook: https://skool-backend.onrender.com/api/payments/webhook
```

---

## Final Steps

1. ✅ Test all major features in production
2. ✅ Monitor logs for first 24 hours
3. ✅ Set up uptime monitoring (UptimeRobot, etc.)
4. ✅ Document your URLs and credentials securely
5. ✅ Share access with your team

**🎉 Congratulations! Your platform is now live!**
