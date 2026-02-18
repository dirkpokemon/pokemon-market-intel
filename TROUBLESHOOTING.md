# 🔧 Troubleshooting Guide

## Issue: "Get Started" Button Not Clickable

### Quick Fixes to Try:

#### **1. Hard Refresh the Browser**
```
Chrome/Edge: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
Safari: Cmd+Option+R
Firefox: Cmd+Shift+R
```

#### **2. Clear Browser Cache**
- Chrome: Settings → Privacy → Clear browsing data
- Or try **Incognito/Private** mode

#### **3. Check Browser Console**
1. Press **F12** or **Cmd+Option+I**
2. Click **Console** tab
3. Look for any red errors
4. Take a screenshot if you see errors

#### **4. Try Direct URL**
Instead of clicking, try typing directly in browser:
```
http://localhost:3000/register
```

#### **5. Check if JavaScript is Enabled**
- Chrome: Settings → Privacy and security → Site settings → JavaScript (should be "Allowed")

#### **6. Restart Frontend Container**
```bash
docker compose restart frontend
sleep 5
open http://localhost:3000
```

---

## Testing Checklist

### ✅ Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"...}
```

### ✅ Frontend is Running
```bash
curl -s http://localhost:3000 | grep "Pokemon Intel"
# Should return HTML with "Pokemon Intel EU"
```

### ✅ Register Page Works Directly
```bash
open http://localhost:3000/register
```

---

## Common Issues

### **Issue: White/Blank Page**
**Solution:** Rebuild frontend
```bash
docker compose build frontend
docker compose up -d frontend
```

### **Issue: Buttons Look Different**
**Solution:** CSS not loading - hard refresh (Cmd+Shift+R)

### **Issue: Nothing Happens When Clicking**
**Solution:** 
1. Check browser console for errors (F12)
2. Try incognito mode
3. Try different browser

---

## Manual Registration (Bypass Frontend)

If frontend still doesn't work, you can test the backend directly:

### **Register via API**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'
```

### **Then Login via API**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

This will return an `access_token` you can use to test the API.

---

## Check Logs

### **Frontend Logs**
```bash
docker compose logs frontend --tail 50
```

### **Backend Logs**
```bash
docker compose logs backend --tail 50
```

### **All Services Status**
```bash
docker compose ps
```

---

## Nuclear Option: Complete Restart

If nothing works:

```bash
# Stop everything
docker compose down

# Rebuild everything
docker compose build

# Start everything
docker compose up -d

# Wait 10 seconds
sleep 10

# Check status
docker compose ps

# Open browser
open http://localhost:3000
```

---

## Still Not Working?

### Share This Info:

1. **Browser & Version:**
   ```
   Chrome: chrome://version
   Safari: Safari → About Safari
   Firefox: Help → About Firefox
   ```

2. **Browser Console Errors:**
   - Press F12
   - Screenshot the Console tab

3. **Network Tab:**
   - Press F12 → Network tab
   - Reload page
   - Look for failed requests (red)
   - Screenshot

4. **Container Status:**
   ```bash
   docker compose ps
   docker compose logs frontend --tail 30
   ```

---

## Alternative: Use API Docs

While debugging the frontend, you can use the backend directly:

```
http://localhost:8000/docs
```

This gives you a visual interface to test all API endpoints!
