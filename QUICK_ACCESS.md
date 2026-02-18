# 🚀 Quick Access Guide

## ✅ Everything is Ready!

All services are running and your account is created.

---

## 🔐 Your Login Info

| Field | Value |
|-------|-------|
| **Email** | `demo@pokemontel.eu` |
| **Password** | `Demo2024!` |
| **Role** | Free (access to top 10 deals) |

---

## 🌐 Access Links

### Frontend (User Interface)
- **Homepage**: http://localhost:3000
- **Login Page**: http://localhost:3000/login ⭐ **START HERE**
- **Register**: http://localhost:3000/register
- **Dashboard**: http://localhost:3000/dashboard (after login)
- **Pricing**: http://localhost:3000/pricing

### Backend (API)
- **API Health**: http://localhost:8000/health
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Redoc**: http://localhost:8000/redoc

---

## 🎯 To Access the Dashboard

### **Simple Steps:**

1. **Click this link**: http://localhost:3000/login
2. **Enter**:
   - Email: `demo@pokemontel.eu`
   - Password: `Demo2024!`
3. **Click "Sign In"**
4. **You're in!** 🎉

---

## 🐛 Fixes Applied

### Registration Form "Not Found" Error - FIXED ✅

**What was wrong:**
- The frontend API client was using incorrect URL paths
- Missing `/api/v1` prefix on all endpoints

**What was fixed:**
- Updated `services/frontend/src/lib/api.ts`
- All API endpoints now use correct paths:
  - `/api/v1/auth/register`
  - `/api/v1/auth/login`
  - `/api/v1/deal_scores`
  - `/api/v1/signals`
- Frontend rebuilt and restarted

**Registration form now works!** You can create new accounts from the UI.

---

## 📊 What to Expect on the Dashboard

The dashboard displays:
- **📈 Deal Scores Chart**: Visual graph of top deals
- **💎 Top Deals Table**: Best Pokémon card deals with:
  - Product name
  - Current price
  - Deal score (0-100)
  - Category (singles/sealed)
- **🔔 Market Statistics**: Price trends and volumes

### Sample Data vs Real Data

Currently showing **sample/mock data** because:
- The scraper hasn't collected real prices yet
- The analysis engine hasn't calculated deal scores yet

#### To Get Real Data:
```bash
# Run the scraper to collect prices
docker compose exec scraper python run_cardmarket.py

# Run the analysis engine to calculate deal scores
docker compose exec analysis python run_analysis.py

# Refresh the dashboard
```

---

## 🧪 Testing the System

### Test Backend API (Optional)
```bash
# Test health
curl http://localhost:8000/health

# Test registration
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Test login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo@pokemontel.eu&password=Demo2024!"
```

### Check All Services
```bash
docker compose ps
```

Should show all services as "Up":
- ✅ pokemon-intel-db (PostgreSQL)
- ✅ pokemon-intel-backend (FastAPI)
- ✅ pokemon-intel-frontend (Next.js)
- ✅ pokemon-intel-scraper (Python scraper)
- ✅ pokemon-intel-analysis (Python analysis)

---

## 🆘 Troubleshooting

### Login Not Working?
- Double-check email: `demo@pokemontel.eu` (not gmail!)
- Password is case-sensitive: `Demo2024!`
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)

### Page Shows 404?
- Frontend is still starting (wait 10 seconds)
- Check: `docker compose logs frontend --tail 20`

### Registration Form Still Says "Not Found"?
- Clear browser cache completely
- Try incognito/private mode
- The API paths have been fixed and frontend rebuilt

### Dashboard is Empty?
- This is normal - scraper hasn't run yet
- See "To Get Real Data" section above

---

## 📞 Summary

**You're all set!** 

👉 **Go to**: http://localhost:3000/login  
👉 **Login with**: `demo@pokemontel.eu` / `Demo2024!`  
👉 **View dashboard**: Market intelligence data

**Enjoy!** 🎮🃏📊
