# 🚀 Deployment Guide - Pokémon Market Intelligence EU

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

**Why Railway:**
- ✅ One-click Docker Compose deployment
- ✅ Free tier ($5 credit/month)
- ✅ Automatic HTTPS
- ✅ Database included
- ✅ Environment variables management

**Steps:**

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select this repository

3. **Configure Services**:
   Railway will detect `docker-compose.yml` and deploy all services automatically.

4. **Set Environment Variables**:
   In Railway dashboard, add these variables:
   ```
   # Database
   POSTGRES_USER=pokemon_user
   POSTGRES_PASSWORD=<generate-strong-password>
   POSTGRES_DB=pokemon_intel
   
   # Backend
   SECRET_KEY=<generate-random-secret-key>
   DATABASE_URL=postgresql://pokemon_user:<password>@postgres:5432/pokemon_intel
   
   # Frontend
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   
   # Alerts (optional)
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   TELEGRAM_BOT_TOKEN=your-bot-token
   ```

5. **Generate Secrets**:
   ```bash
   # Generate SECRET_KEY
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   
   # Generate POSTGRES_PASSWORD
   python -c "import secrets; print(secrets.token_urlsafe(16))"
   ```

6. **Deploy**:
   Railway will automatically build and deploy. Wait ~5-10 minutes.

7. **Get URLs**:
   - Frontend: `https://your-frontend.railway.app`
   - Backend API: `https://your-backend.railway.app`

---

### Option 2: Render

**Why Render:**
- ✅ Free tier available
- ✅ Docker support
- ✅ PostgreSQL included
- ✅ Easy setup

**Steps:**

1. **Sign up**: [render.com](https://render.com)

2. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Name: `pokemon-intel-db`
   - Copy the "Internal Database URL"

3. **Create Web Service** (for Backend):
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: `services/backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables (see below)

4. **Create Web Service** (for Frontend):
   - New → Web Service
   - Root Directory: `services/frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add environment variables

5. **Create Background Workers**:
   - Scraper: New → Background Worker
   - Analysis: New → Background Worker
   - Alerts: New → Background Worker

**Environment Variables for Render:**
```
DATABASE_URL=<from-postgres-service>
SECRET_KEY=<generate-random-key>
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

### Option 3: DigitalOcean App Platform

**Why DigitalOcean:**
- ✅ Docker Compose support
- ✅ Managed PostgreSQL
- ✅ $200 credit for new users
- ✅ Professional hosting

**Steps:**

1. **Sign up**: [digitalocean.com](https://www.digitalocean.com)

2. **Create App**:
   - Apps → Create App
   - Connect GitHub repo
   - Select this repository

3. **Configure**:
   - DigitalOcean will detect `docker-compose.yml`
   - Add environment variables in dashboard
   - Select PostgreSQL database addon

4. **Deploy**:
   - Click "Create Resources"
   - Wait for deployment (~10 minutes)

---

### Option 4: VPS (Hetzner/DigitalOcean Droplet)

**Why VPS:**
- ✅ Full control
- ✅ Cheapest option ($5-10/month)
- ✅ Can run everything on one server

**Steps:**

1. **Create Droplet**:
   - Hetzner Cloud or DigitalOcean
   - Ubuntu 22.04
   - 4GB RAM minimum (8GB recommended)
   - $10-20/month

2. **SSH into server**:
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Install Docker Compose**:
   ```bash
   apt-get update
   apt-get install docker-compose-plugin
   ```

5. **Clone repository**:
   ```bash
   git clone https://github.com/your-username/pokemon-market-intel.git
   cd pokemon-market-intel
   ```

6. **Set up environment**:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

7. **Deploy**:
   ```bash
   docker compose up -d
   ```

8. **Set up Nginx** (for HTTPS):
   ```bash
   apt-get install nginx certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

---

## 🎯 Recommended: Railway

**For quick testing with others, Railway is the easiest:**

1. ✅ One-click deployment
2. ✅ Free tier
3. ✅ Automatic HTTPS
4. ✅ No server management
5. ✅ Easy to share URLs

**Time to deploy**: ~10 minutes

**Cost**: Free tier ($5 credit/month) or $5-20/month for production

---

## 📝 Pre-Deployment Checklist

- [ ] Update `.env` files with production values
- [ ] Generate strong `SECRET_KEY`
- [ ] Set secure `POSTGRES_PASSWORD`
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Configure email/Telegram credentials (if using alerts)
- [ ] Test locally with `docker compose up`
- [ ] Review security settings
- [ ] Set up domain (optional but recommended)

---

## 🔒 Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use strong passwords** - Generate random secrets
3. **Enable HTTPS** - Most platforms do this automatically
4. **Limit API access** - Consider rate limiting
5. **Monitor logs** - Watch for suspicious activity

---

## 📊 After Deployment

1. **Test the platform**:
   - Visit frontend URL
   - Login with `demo@pokemontel.eu` / `demo123`
   - Check all pages work

2. **Run initial scrape**:
   ```bash
   # Via Railway CLI or SSH
   docker compose exec scraper python run_cardtrader.py
   ```

3. **Run analysis**:
   ```bash
   docker compose exec analysis python run_analysis.py
   ```

4. **Share with testers**:
   - Frontend URL
   - Login credentials
   - Brief instructions

---

## 🆘 Troubleshooting

**Services won't start:**
- Check environment variables are set
- Check logs: `docker compose logs <service-name>`
- Verify database connection

**Frontend can't connect to backend:**
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running
- Check CORS settings

**Database errors:**
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run migrations if needed

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- DigitalOcean Docs: https://docs.digitalocean.com
