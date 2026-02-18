# 🚂 Railway Deployment Guide

Railway doesn't support Docker Compose directly. You need to deploy services **individually**.

## 📋 Deployment Strategy

Deploy these services separately:
1. **PostgreSQL** (Railway PostgreSQL addon)
2. **Backend API** (Python service)
3. **Frontend** (Next.js service)
4. **Scraper** (Background worker - optional)
5. **Analysis** (Background worker - optional)
6. **Alerts** (Background worker - optional)

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click **"New Project"**
4. Select **"Empty Project"**

---

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL database
4. **Copy the connection string** from the database service
   - It looks like: `postgresql://postgres:password@host:port/railway`

---

### Step 3: Deploy Backend API

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `dirkpokemon/pokemon-market-intel`
3. Railway will create a new service

4. **Configure the service:**
   - Click on the service
   - Go to **"Settings"** tab
   - Set **Root Directory**: `services/backend`
   - Set **Build Command**: (leave empty, uses Dockerfile)
   - Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Add Environment Variables:**
   ```
   DATABASE_URL=<from-postgres-service>
   SECRET_KEY=<generate-random-key>
   PYTHONUNBUFFERED=1
   ```
   
   To generate SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

6. **Get the backend URL:**
   - Go to **"Settings"** → **"Generate Domain"**
   - Copy the URL (e.g., `https://backend-production-xxxx.up.railway.app`)

---

### Step 4: Deploy Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `dirkpokemon/pokemon-market-intel` (same repo)
3. Railway will create another service

4. **Configure the service:**
   - Go to **"Settings"** tab
   - Set **Root Directory**: `services/frontend`
   - Set **Build Command**: `npm install && npm run build`
   - Set **Start Command**: `npm start`

5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=<your-backend-url-from-step-3>
   NODE_ENV=production
   PORT=3000
   ```

6. **Generate Domain:**
   - Go to **"Settings"** → **"Generate Domain"**
   - This is your public frontend URL!

---

### Step 5: (Optional) Deploy Background Workers

#### Scraper Worker:
1. **"+ New"** → **"GitHub Repo"** → Select repo
2. **Settings:**
   - Root Directory: `services/scraper`
   - Start Command: `python -m app.main`
3. **Environment Variables:**
   ```
   DATABASE_URL=<from-postgres-service>
   CARDTRADER_API_TOKEN=<your-token>
   CARDTRADER_USE_API=true
   ```

#### Analysis Worker:
1. **"+ New"** → **"GitHub Repo"** → Select repo
2. **Settings:**
   - Root Directory: `services/analysis`
   - Start Command: `python run_analysis.py`
3. **Environment Variables:**
   ```
   DATABASE_URL=<from-postgres-service>
   ```

#### Alerts Worker:
1. **"+ New"** → **"GitHub Repo"** → Select repo
2. **Settings:**
   - Root Directory: `services/alerts`
   - Start Command: `python -m app.main`
3. **Environment Variables:**
   ```
   DATABASE_URL=<from-postgres-service>
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=<your-email>
   SMTP_PASSWORD=<your-app-password>
   TELEGRAM_BOT_TOKEN=<your-bot-token>
   ```

---

## 🔧 Important Configuration Notes

### Database Connection
- Railway PostgreSQL uses a different connection format
- Use the **connection string** from Railway's PostgreSQL service
- It should look like: `postgresql://postgres:password@host:port/railway`
- For asyncpg (backend), use: `postgresql+asyncpg://postgres:password@host:port/railway`

### Port Configuration
- Railway sets `$PORT` environment variable automatically
- Backend should use: `--port $PORT`
- Frontend should use: `PORT=3000` (or Railway's assigned port)

### Environment Variables
- Add all environment variables in Railway dashboard
- Each service has its own environment variables
- Use Railway's **"Variables"** tab in each service

---

## 🎯 Quick Deploy Checklist

- [ ] PostgreSQL database created
- [ ] Backend service deployed with DATABASE_URL
- [ ] Backend domain generated
- [ ] Frontend service deployed with NEXT_PUBLIC_API_URL
- [ ] Frontend domain generated
- [ ] Test login: `demo@pokemontel.eu` / `demo123`
- [ ] (Optional) Background workers deployed

---

## 🐛 Troubleshooting

### Backend won't start:
- Check DATABASE_URL is correct
- Verify SECRET_KEY is set
- Check logs in Railway dashboard

### Frontend can't connect to backend:
- Verify NEXT_PUBLIC_API_URL matches backend domain
- Check CORS settings in backend
- Ensure backend is running

### Database connection errors:
- Verify DATABASE_URL format
- Check PostgreSQL service is running
- Ensure connection string includes credentials

---

## 📊 Railway Pricing

- **Free Tier**: $5 credit/month
- **Hobby Plan**: $5/month (after free tier)
- **Pro Plan**: $20/month

For testing, free tier should be enough!

---

## 🎉 After Deployment

1. **Test your platform:**
   - Visit frontend URL
   - Login with `demo@pokemontel.eu` / `demo123`
   - Check all pages work

2. **Run initial data collection:**
   - You can manually trigger scrapers via Railway CLI or
   - Set up cron jobs in Railway (Pro plan)

3. **Share with testers:**
   - Send frontend URL
   - Share login credentials
   - Get feedback!

---

## 🔗 Useful Links

- Railway Docs: https://docs.railway.app
- Railway Dashboard: https://railway.app/dashboard
- Your Repo: https://github.com/dirkpokemon/pokemon-market-intel
