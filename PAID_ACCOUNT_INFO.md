# 🔐 Paid Account - Testing Credentials

## ✅ **Your Paid Account**

### **Login Credentials:**
```
Email:    demo@pokemontel.eu
Password: demo123
Role:     PAID
Status:   ACTIVE ✅
Alerts:   ENABLED
```

**✅ Login verified working via API test!**

---

## 🌐 **How to Access**

### **Dashboard URL:**
```
http://localhost:3000
```

### **Steps:**
1. Open browser
2. Go to `http://localhost:3000`
3. Click "Login" or "Get Started"
4. Enter email: `demo@pokemontel.eu`
5. Enter password: `demo123`
6. Click "Login"

---

## 🎯 **What You Can Test**

### **Dashboard Features (Paid Tier):**
- ✅ **Deal Scores** - 0-100 rating system
- ✅ **Price Charts** - Singles & sealed products
- ✅ **Market Statistics** - 7-day & 30-day averages
- ✅ **Trading Signals** - High alerts, undervalued, arbitrage
- ✅ **Real-time Data** - 171,624+ listings
- ✅ **Historical Tracking** - Price trends over time

### **Alert System (Already Configured):**
- 📧 **Email**: pokemonmarketintel@gmail.com
- 📱 **Telegram**: Chat ID 1477997156
- ⏰ **Frequency**: Every 5 minutes
- 🎯 **Alert Types**:
  - High deal scores (≥80)
  - Undervalued cards (≥20% below average)
  - Arbitrage opportunities (≥15% price difference)
  - Price momentum signals

---

## 🔌 **API Access**

### **Backend API URL:**
```
http://localhost:8000
```

### **Get JWT Token:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@pokemontel.eu",
    "password": "demo123"
  }'
```

### **Use Token to Access Paid Endpoints:**

**Get Deal Scores:**
```bash
curl http://localhost:8000/deal_scores \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Get Signals (Paid Only):**
```bash
curl http://localhost:8000/signals \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Get User Info:**
```bash
curl http://localhost:8000/users/me \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

---

## 📊 **What Data You Have**

### **Current Dataset:**
- 🎴 **171,624 CardTrader listings** (scraped today!)
- 🏪 **CardMarket listings** (from earlier scrapes)
- 🌍 **~90% EU market coverage**
- 🔄 **Auto-updating**: Daily + Hourly

### **Data Includes:**
- Multiple languages (EN, DE, FR, IT, ES, KR, JP)
- All conditions (NM, LP, MP, HP, DMG)
- Real seller prices
- Stock quantities
- Vintage to modern sets (100+ expansions)

---

## 🎮 **Testing Checklist**

### **Frontend Testing:**
- [ ] Login successful
- [ ] Dashboard loads
- [ ] Charts display data
- [ ] Deal scores visible
- [ ] Signals page accessible
- [ ] Navigation works
- [ ] Logout works

### **Alert Testing:**
- [ ] Check email inbox for alerts
- [ ] Check Telegram for messages
- [ ] Verify alert frequency (every 5 min)
- [ ] Test different alert types

### **API Testing:**
- [ ] Login endpoint works
- [ ] JWT token received
- [ ] Deal scores endpoint accessible
- [ ] Signals endpoint works (paid only)
- [ ] Proper error handling for invalid tokens

---

## 🔧 **Troubleshooting**

### **Can't Login:**
- Check services are running: `docker compose ps`
- Restart backend: `docker compose restart backend`
- Check logs: `docker compose logs backend`

### **Dashboard Empty:**
- Run analysis engine: `docker compose exec analysis python run_analysis.py`
- Check database has data: `docker compose exec postgres psql -U pokemon_intel -d pokemon_intel -c "SELECT COUNT(*) FROM raw_prices;"`

### **No Alerts:**
- Check alert service: `docker compose ps alerts`
- Check logs: `docker compose logs alerts`
- Verify email/Telegram configured in `services/alerts/.env`

---

## 🎊 **Additional Test Accounts**

If you want to create more test accounts:

```bash
# Access backend container
docker compose exec backend python

# Run in Python:
from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()

# Create new user
new_user = User(
    email="test@example.com",
    hashed_password=get_password_hash("password123"),
    role="paid",  # or "free", "pro", "admin"
    is_active=True,
    alerts_enabled=True
)

db.add(new_user)
db.commit()
```

---

## 📧 **Your Alert Destinations**

This paid account sends alerts to:

1. **Email:**
   - Address: pokemonmarketintel@gmail.com
   - Gmail SMTP configured
   - App Password: Active

2. **Telegram:**
   - Bot Token: 8417057036:AAE0EnCKrJ_lUTUO9xZMFhNmBQwSZX3bv2g
   - Chat ID: 1477997156
   - Active and receiving messages

---

## 🚀 **Quick Start Summary**

1. **Open:** http://localhost:3000
2. **Login:** demo@pokemontel.eu / demo123
3. **Explore:** Dashboard, charts, signals
4. **Check:** Email & Telegram for alerts

---

## 📝 **Important Notes**

- This is a **demo/test account**
- All data is **real** (171K+ listings)
- Alerts are **actually sent** to your email/Telegram
- Services are **running 24/7** in Docker
- Automated scrapes run on **cron schedule**

---

## 🎯 **Platform Status**

All services running:
- ✅ Backend API (port 8000)
- ✅ Frontend (port 3000)
- ✅ Database (PostgreSQL)
- ✅ Scraper Service
- ✅ Analysis Engine
- ✅ Alert Engine
- ✅ Nginx (reverse proxy)

---

**Your platform is production-ready with real data and working alerts!** 🎊

**Login now and explore:** http://localhost:3000

