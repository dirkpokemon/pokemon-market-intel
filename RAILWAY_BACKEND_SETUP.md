# 🚀 Railway Backend API Setup - Step by Step

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ A Railway account (sign up at railway.app)
- ✅ A Railway project created
- ✅ PostgreSQL database added to your project

---

## 🎯 Step 1: Add Backend Service

1. **In your Railway project dashboard**, click the **"+ New"** button (top right)
2. Select **"GitHub Repo"**
3. You'll see a list of your GitHub repositories
4. **Select**: `dirkpokemon/pokemon-market-intel`
5. Railway will create a new service and start deploying

---

## ⚙️ Step 2: Configure Service Settings

1. **Click on the service** you just created (it will have a random name like "pokemon-market-intel")
2. Click the **"Settings"** tab (gear icon on the right)
3. Scroll down to **"Service Settings"**

### Set Root Directory:
- Find **"Root Directory"** field
- Enter: `services/backend`
- This tells Railway where your backend code is

### Set Start Command:
- Find **"Start Command"** field
- Enter: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- This is the command to start your FastAPI server
- **Note**: Use port `8000` directly (Railway will route traffic to it automatically)

### Build Command:
- Leave **"Build Command"** empty (Railway will use the Dockerfile)

---

## 🔐 Step 3: Add Environment Variables

1. Still in the **Settings** tab, scroll to **"Variables"** section
2. Click **"+ New Variable"** for each variable below

### Required Variables:

#### 1. DATABASE_URL
- **Name**: `DATABASE_URL`
- **Value**: Get this from your PostgreSQL service
  - Click on your PostgreSQL service
  - Go to **"Variables"** tab
  - Copy the `DATABASE_URL` value
  - It looks like: `postgresql://postgres:password@host:port/railway`
  - **IMPORTANT**: Change `postgresql://` to `postgresql+asyncpg://` for FastAPI
  - Example: `postgresql+asyncpg://postgres:password@host:port/railway`

#### 2. SECRET_KEY
- **Name**: `SECRET_KEY`
- **Value**: Generate a random key
  - Run this locally: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
  - Or use: `openssl rand -hex 32`
  - Copy the output and paste as value

#### 3. PYTHONUNBUFFERED
- **Name**: `PYTHONUNBUFFERED`
- **Value**: `1`
- This ensures Python output is shown in logs

### Optional Variables (if you have them):

#### 4. ENVIRONMENT
- **Name**: `ENVIRONMENT`
- **Value**: `production`

#### 5. CORS_ORIGINS
- **Name**: `CORS_ORIGINS`
- **Value**: Your frontend URL (you'll add this after deploying frontend)
  - Example: `https://your-frontend.railway.app`

---

## 🌐 Step 4: Generate Public URL

1. Still in **Settings** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Railway will create a URL like: `https://backend-production-xxxx.up.railway.app`
5. **COPY THIS URL** - you'll need it for the frontend!

---

## ✅ Step 5: Verify Deployment

1. Go to **"Deployments"** tab
2. Wait for the build to complete (green checkmark)
3. Click **"View Logs"** to see if it started successfully
4. You should see: `Application startup complete` or `Uvicorn running on...`

### Test the API:
1. Click on the **"Settings"** tab again
2. Find your domain URL
3. Visit: `https://your-backend-url.railway.app/docs`
4. You should see the FastAPI documentation page!

---

## 🐛 Troubleshooting

### Build Fails:
- **Check**: Root Directory is set to `services/backend`
- **Check**: Dockerfile exists in `services/backend/Dockerfile`
- **View logs**: Click "View Logs" to see error messages

### Service Won't Start:
- **Check**: DATABASE_URL is correct and uses `postgresql+asyncpg://`
- **Check**: SECRET_KEY is set
- **Check**: Start Command is correct
- **View logs**: Check for Python errors

### Can't Connect to Database:
- **Verify**: PostgreSQL service is running
- **Verify**: DATABASE_URL format is correct
- **Check**: Connection string includes password

### 404 Not Found:
- **Check**: Service is actually running (green status)
- **Check**: You're using the correct domain URL
- **Try**: `/docs` endpoint to see API documentation

---

## 📝 Quick Checklist

- [ ] Service created from GitHub repo
- [ ] Root Directory set to `services/backend`
- [ ] Start Command set to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] DATABASE_URL added (with `postgresql+asyncpg://`)
- [ ] SECRET_KEY added (random 32+ character string)
- [ ] PYTHONUNBUFFERED set to `1`
- [ ] Domain generated
- [ ] Service shows "Active" status
- [ ] Can access `/docs` endpoint

---

## 🎯 What Your Settings Should Look Like

```
Service Settings:
├── Root Directory: services/backend
├── Build Command: (empty - uses Dockerfile)
└── Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

Variables:
├── DATABASE_URL: postgresql+asyncpg://postgres:xxx@xxx:5432/railway
├── SECRET_KEY: your-random-32-character-key
└── PYTHONUNBUFFERED: 1
```

---

## 🚀 Next Step

Once backend is working:
1. **Copy the backend URL** (from Settings → Networking)
2. **Deploy Frontend** and use this URL for `NEXT_PUBLIC_API_URL`

---

## 💡 Pro Tips

- **Always check logs** if something doesn't work
- **Test the `/docs` endpoint** to verify API is running
- **Keep DATABASE_URL secret** - don't share it publicly
- **Use Railway's variable sharing** to share DATABASE_URL between services

---

Need help? Check the logs in Railway dashboard or see the main deployment guide!
