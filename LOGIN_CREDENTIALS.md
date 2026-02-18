# 🔐 Login Credentials

## Demo Account

Your account has been created successfully!

**Email:** `demo@pokemontel.eu`  
**Password:** `Demo2024!`

---

## How to Access the Dashboard

### Option 1: Direct Login (Recommended)

1. **Open your browser**: http://localhost:3000/login
2. **Enter credentials**:
   - Email: `demo@pokemontel.eu`
   - Password: `Demo2024!`
3. **Click "Sign In"**
4. **You'll be redirected to**: http://localhost:3000/dashboard

### Option 2: Via Homepage

1. **Open**: http://localhost:3000
2. **Click "Sign In"** (top right or in the hero section)
3. **Enter credentials and login**

---

## What You'll See on the Dashboard

The dashboard shows:
- **Deal Scores**: Top Pokémon card deals with scores (0-100)
- **Market Statistics**: Price trends, volumes, liquidity
- **Charts**: Visual representation of market data
- **Signals** (for paid users): Real-time alerts for high-value deals

---

## Account Details

- **Role**: `free` (Free tier)
- **Status**: `active`
- **Subscription**: None (Free tier has access to top 10 deal scores)

### To Upgrade to Paid/Pro:

1. Go to: http://localhost:3000/pricing
2. Choose a plan
3. Complete Stripe checkout (requires Stripe keys to be configured)

---

## API Testing

You can also test the backend directly:

### Get User Info
```bash
# First login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo@pokemontel.eu&password=Demo2024!"

# Copy the access_token from response, then:
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Deal Scores
```bash
curl http://localhost:8000/api/v1/deal_scores \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### If registration form shows "Not found":
The API paths have been fixed. Rebuilding the frontend now...

### If login doesn't work:
- Make sure you're using the correct email: `demo@pokemontel.eu`
- Password is case-sensitive: `Demo2024!`
- Check backend is running: `docker compose ps`

### If dashboard is empty:
The dashboard will show mock/sample data if the scraper hasn't run yet. To populate with real data:
```bash
docker compose exec scraper python run_cardmarket.py
docker compose exec analysis python run_analysis.py
```

---

**Enjoy exploring the Pokemon Market Intelligence platform!** 🎮🃏
