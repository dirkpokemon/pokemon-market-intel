# 🚀 Pokemon Market Intel EU - Quick Start Guide

## ✅ System Status

**All services are operational:**
- ✅ PostgreSQL Database
- ✅ Backend API (FastAPI)
- ✅ Scraper Service
- ✅ Analysis Engine
- ✅ Frontend Dashboard (Next.js)
- ✅ Nginx Reverse Proxy

---

## 🎯 Quick Setup (5 Minutes)

### **Step 1: Create Users Table**

```bash
docker compose exec postgres psql -U pokemon_user -d pokemon_intel < services/backend/create_users_table.sql
```

### **Step 2: Update Backend Environment**

```bash
cd services/backend

# Generate secret key
openssl rand -hex 32

# Update .env file with:
# SECRET_KEY=<generated_key_from_above>
# STRIPE_SECRET_KEY=sk_test_... (from Stripe dashboard)
# STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe dashboard)
```

### **Step 3: Rebuild & Restart Services**

```bash
cd /Users/shelleybello/pokemon-market-intel

# Rebuild backend with new code
docker compose build backend

# Restart all services
docker compose up -d
```

### **Step 4: Create Frontend Environment**

```bash
# Create .env.local file (note: .env files are in .gitignore)
cat > services/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_STRIPE_PRICE_PAID=price_your_paid_id
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_your_pro_id
EOF
```

### **Step 5: Rebuild Frontend**

```bash
docker compose build frontend
docker compose up -d frontend
```

---

## 🌐 Access Your Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | User-facing dashboard |
| **Backend API** | http://localhost:8000 | FastAPI endpoints |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| **Nginx** | http://localhost | Reverse proxy |

---

## 🧪 Test the System

### **1. Register a New User**

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### **2. Login**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the `access_token` from the response!**

### **3. Get Deal Scores**

```bash
curl http://localhost:8000/api/v1/deal_scores?limit=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### **4. Try Premium Endpoint (Will Fail for Free Users)**

```bash
curl http://localhost:8000/api/v1/signals \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected:** "Premium subscription required" error (this is correct!)

---

## 🎨 Use the Frontend

### **1. Open Dashboard**
```
http://localhost:3000
```

### **2. Register/Login**
- Click "Get Started" or "Login"
- Create an account or sign in
- You'll be redirected to the dashboard

### **3. View Deal Scores**
- Dashboard shows top deals (Free tier: top 10 with score ≥70)
- Cards display product name, price, deal score

### **4. Upgrade (Optional)**
- Click "View Plans" or visit http://localhost:3000/pricing
- See three tiers: Free, Paid (€19/mo), Pro (€49/mo)

---

## 📊 Run Analysis Engine

```bash
# Manual run
docker compose exec analysis python run_analysis.py

# View results
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT product_name, deal_score FROM deal_scores ORDER BY deal_score DESC LIMIT 10;"
```

---

## 🔧 Common Tasks

### **View Logs**
```bash
# Backend
docker compose logs -f backend

# Frontend
docker compose logs -f frontend

# Analysis
docker compose logs -f analysis
```

### **Check Service Health**
```bash
curl http://localhost:8000/health
```

### **Restart a Service**
```bash
docker compose restart backend
docker compose restart frontend
```

### **View Database**
```bash
docker compose exec postgres psql -U pokemon_user -d pokemon_intel

# Inside psql:
\dt                    # List tables
\d users               # Describe users table
SELECT * FROM users;   # View users
```

---

## 🛠️ Development Workflow

### **Backend Changes**
```bash
1. Edit files in services/backend/app/
2. docker compose restart backend  # Hot reload enabled
3. Check logs: docker compose logs -f backend
```

### **Frontend Changes**
```bash
1. Edit files in services/frontend/src/
2. Changes auto-reload (Next.js hot reload)
3. Refresh browser: http://localhost:3000
```

### **Analysis Engine Changes**
```bash
1. Edit files in services/analysis/app/
2. docker compose restart analysis
3. Run manually: docker compose exec analysis python run_analysis.py
```

---

## 📋 Stripe Setup (For Subscriptions)

### **1. Create Stripe Account**
- Go to https://stripe.com
- Create account (use test mode)

### **2. Create Products**
1. Dashboard → Products → Add Product
2. Create two products:
   - **Paid Plan**: €19/month recurring
   - **Pro Plan**: €49/month recurring
3. Copy the **Price IDs** (starts with `price_...`)

### **3. Get API Keys**
1. Dashboard → Developers → API Keys
2. Copy:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### **4. Configure Webhook**
1. Dashboard → Developers → Webhooks
2. Add endpoint: `http://localhost:8000/api/v1/stripe/webhook`
3. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy **Signing secret** (whsec_...)

### **5. Update Environment Files**

**Backend `.env`:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Frontend `.env.local`:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_PAID=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...
```

### **6. Test Stripe Integration**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:8000/api/v1/stripe/webhook

# Test a subscription event
stripe trigger customer.subscription.created
```

---

## 📁 Project Structure

```
pokemon-market-intel/
├── services/
│   ├── backend/        ✅ FastAPI + JWT + Stripe
│   ├── scraper/        ✅ CardMarket scraper
│   ├── analysis/       ✅ Deal score engine
│   ├── frontend/       ✅ Next.js dashboard
│   └── nginx/          ✅ Reverse proxy
│
├── BACKEND_FRONTEND_COMPLETE.md  📚 Complete documentation
├── ANALYSIS_COMPLETE.md           📚 Analysis engine docs
├── QUICK_START.md                 📚 This file
└── docker-compose.yml             🐳 All services
```

---

## ✅ Verification Checklist

### **Backend API**
- [ ] Users table created
- [ ] Can register new user
- [ ] Can login and get JWT token
- [ ] Can access `/deal_scores` with token
- [ ] Premium endpoint `/signals` blocked for free users
- [ ] Swagger docs accessible at `/docs`

### **Frontend**
- [ ] Landing page loads (http://localhost:3000)
- [ ] Can register new account
- [ ] Can login
- [ ] Dashboard shows deal scores
- [ ] Pricing page displays
- [ ] Logout works

### **Analysis Engine**
- [ ] Can run manually: `docker compose exec analysis python run_analysis.py`
- [ ] Creates market_statistics records
- [ ] Creates deal_scores records
- [ ] Creates signals records

### **Integration**
- [ ] Scraper → raw_prices table
- [ ] Analysis → market_statistics, deal_scores, signals
- [ ] Backend → Reads analysis tables
- [ ] Frontend → Displays data from backend API

---

## 🚨 Troubleshooting

### **"Module not found" errors**
```bash
docker compose build backend
docker compose build frontend
docker compose up -d
```

### **"Connection refused" from frontend to backend**
- Check backend is running: `docker compose ps backend`
- Check NEXT_PUBLIC_API_URL in `.env.local`
- Restart frontend: `docker compose restart frontend`

### **"401 Unauthorized"**
- Check JWT token is valid
- Token expires after 24 hours by default
- Login again to get fresh token

### **No data in dashboard**
- Run analysis engine: `docker compose exec analysis python run_analysis.py`
- Wait for scraper to collect data
- Check raw_prices table has data

---

## 📚 Documentation

- **Backend + Frontend**: `BACKEND_FRONTEND_COMPLETE.md`
- **Analysis Engine**: `ANALYSIS_COMPLETE.md`
- **Scraper**: `services/scraper/CARDMARKET_README.md`

---

## 🎉 You're All Set!

**Your Pokemon Market Intel EU platform is ready!**

1. ✅ Scraper collecting price data
2. ✅ Analysis engine calculating deals
3. ✅ Backend API serving data
4. ✅ Frontend dashboard displaying insights
5. ✅ Stripe ready for subscriptions

**Next Steps:**
1. Add real Stripe keys for production
2. Deploy to cloud (AWS/DigitalOcean/Heroku)
3. Configure domain and SSL
4. Set up monitoring (Sentry, LogRocket)
5. Add email notifications (SendGrid, Mailgun)

**Happy trading!** 🚀
