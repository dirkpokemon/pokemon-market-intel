# 🐛 Railway Troubleshooting Guide

## "Application failed to respond" Error

This usually means Railway can't reach your service. Here's how to fix it:

---

## ✅ Quick Fixes

### 1. Check Service is Actually Running

**In Railway Dashboard:**
- Go to your service
- Click **"Deployments"** tab
- Check if status is **"Active"** (green)
- Click **"View Logs"** to see if there are errors

### 2. Verify Port Configuration

**Check Start Command:**
- Settings → Start Command should be: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Make sure it's listening on `0.0.0.0` (not `127.0.0.1` or `localhost`)

### 3. Check Health Endpoint

**Test directly:**
- Your backend URL: `https://your-backend.railway.app/health`
- Should return: `{"status": "healthy", ...}`
- If this works, the service is running but routing might be wrong

### 4. Verify Domain is Generated

**In Railway:**
- Settings → Networking
- Make sure a domain is generated
- If not, click **"Generate Domain"**

---

## 🔍 Common Issues

### Issue 1: Database Connection Failing

**Symptoms:**
- Logs show database errors
- Service starts but crashes

**Fix:**
1. Check `DATABASE_URL` is correct
2. Verify it uses `postgresql+asyncpg://` (not `postgresql://`)
3. Check PostgreSQL service is running
4. Test connection string format

**Test DATABASE_URL format:**
```
postgresql+asyncpg://postgres:password@host:port/railway
```

### Issue 2: Service Crashes on Startup

**Check logs for:**
- Import errors
- Missing environment variables
- Configuration errors

**Common causes:**
- Missing `SECRET_KEY`
- Wrong `DATABASE_URL` format
- Missing required dependencies

### Issue 3: Port Not Accessible

**Symptoms:**
- Service shows as running in logs
- But can't access via URL

**Fix:**
- Ensure Start Command uses `--host 0.0.0.0`
- Not `127.0.0.1` or `localhost`
- Railway needs `0.0.0.0` to route traffic

### Issue 4: Wrong Root Directory

**Symptoms:**
- Build succeeds but app can't find files
- Import errors

**Fix:**
- Settings → Root Directory: `services/backend`
- Must match where your code is in the repo

### Issue 5: Out of memory (build or deploy)

**Symptoms:** Build fails with OOM, or the process is killed during `next build` / `pip install`.

**What we changed in this repo:**
- **Frontend Docker image:** `NEXT_BUILD_LOW_MEMORY=1` lowers webpack parallelism; `NEXT_TELEMETRY_DISABLED=1` and a Node heap cap are set during `npm run build` in `services/frontend/Dockerfile`.
- **Backend Docker image:** installs `requirements-prod.txt` (no pytest/black/ruff/mypy) to reduce install size and peak memory.

**If it still OOMs:** In Railway → your service → **Settings**, increase **Memory** (and redeploy). Next.js production builds often need **at least ~2 GB** RAM on the builder for comfortable headroom.

---

## 🧪 Testing Steps

### Step 1: Check Logs
```
Railway → Service → Deployments → View Logs
```

Look for:
- ✅ "Application startup complete"
- ✅ "Uvicorn running on http://0.0.0.0:8000"
- ❌ Any error messages

### Step 2: Test Health Endpoint
```bash
curl https://your-backend.railway.app/health
```

Should return:
```json
{"status": "healthy", "service": "backend-api", "version": "1.0.0"}
```

### Step 3: Test Root Endpoint
```bash
curl https://your-backend.railway.app/
```

Should return:
```json
{"message": "Pokemon Market Intelligence EU API", "version": "1.0.0", "docs": "/docs"}
```

### Step 4: Test Docs
Visit: `https://your-backend.railway.app/docs`

Should show FastAPI documentation page.

---

## 🔧 Advanced Debugging

### Check Environment Variables

**In Railway:**
- Settings → Variables
- Verify all required variables are set:
  - ✅ `DATABASE_URL`
  - ✅ `SECRET_KEY`
  - ✅ `PYTHONUNBUFFERED`

### Check Database Connection

**Test DATABASE_URL:**
1. Copy `DATABASE_URL` from Railway
2. Change `postgresql://` to `postgresql+asyncpg://`
3. Test locally (if you have psql):
   ```bash
   psql "your-database-url"
   ```

### View Detailed Logs

**In Railway:**
- Deployments → View Logs
- Look for Python tracebacks
- Check for import errors
- Verify startup sequence

---

## 🚨 Still Not Working?

### Option 1: Redeploy
1. Deployments tab
2. Click "Redeploy" on latest deployment
3. Watch logs for errors

### Option 2: Check Railway Status
- Visit: https://status.railway.app
- Check if Railway has any outages

### Option 3: Simplify Start Command
Try this minimal start command:
```
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Option 4: Check Build Logs
- Deployments → Click on deployment
- Check "Build" phase for errors
- Verify Dockerfile builds correctly

---

## 📞 Getting Help

1. **Railway Logs**: Always check logs first
2. **Railway Docs**: https://docs.railway.app
3. **Railway Discord**: Community support
4. **Railway Help**: https://railway.app/help

---

## ✅ Success Checklist

- [ ] Service shows "Active" status
- [ ] Logs show "Application startup complete"
- [ ] `/health` endpoint returns 200
- [ ] `/docs` endpoint is accessible
- [ ] Root endpoint `/` works
- [ ] No errors in logs

---

If all these pass, your backend is working! 🎉
