# ⚡ Railway Backend - Quick Setup

## 🎯 The 5 Steps

### 1️⃣ Add Service
```
Railway Dashboard → "+ New" → "GitHub Repo" → Select "pokemon-market-intel"
```

### 2️⃣ Open Settings
```
Click on the service → Click "Settings" tab (gear icon)
```

### 3️⃣ Configure Service
```
Root Directory: services/backend
Start Command: uvicorn app.main:app --host 0.0.0.0 --port 8000
Build Command: (leave empty)
```

### 4️⃣ Add Variables
Go to "Variables" section, click "+ New Variable" for each:

```
Variable 1:
Name: DATABASE_URL
Value: (copy from PostgreSQL service, change postgresql:// to postgresql+asyncpg://)

Variable 2:
Name: SECRET_KEY
Value: (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")

Variable 3:
Name: PYTHONUNBUFFERED
Value: 1
```

### 5️⃣ Get URL
```
Settings → Networking → "Generate Domain"
Copy the URL (you'll need it for frontend!)
```

---

## 🔍 Where to Find Things in Railway

**Service Settings:**
- Click service name → "Settings" tab → Scroll to "Service Settings"

**Environment Variables:**
- Click service name → "Settings" tab → Scroll to "Variables" section

**Database URL:**
- Click PostgreSQL service → "Variables" tab → Copy `DATABASE_URL`
- Change `postgresql://` to `postgresql+asyncpg://`

**Logs:**
- Click service name → "Deployments" tab → Click "View Logs"

**Domain/URL:**
- Click service name → "Settings" tab → "Networking" → "Generate Domain"

---

## ✅ Test It Works

1. Wait for deployment to finish (green checkmark)
2. Go to: `https://your-backend-url.railway.app/docs`
3. You should see FastAPI documentation page!

---

## 🆘 Common Issues

**"Can't find app.main"**
→ Check Root Directory is `services/backend`

**"Port already in use"**
→ Change port in Start Command to `8000` or use `${PORT}`

**"Database connection failed"**
→ Check DATABASE_URL uses `postgresql+asyncpg://` not `postgresql://`

**"Module not found"**
→ Check logs, might need to install dependencies

---

That's it! Once backend works, deploy frontend next. 🚀
