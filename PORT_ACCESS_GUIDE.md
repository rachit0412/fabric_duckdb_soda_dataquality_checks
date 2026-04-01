# 🌐 Port Access Guide

## Your Current Setup

Your application is running in **GitHub Codespaces** with Docker containers exposing ports that get **forwarded by Codespaces**.

---

## 📍 Access Points

### Inside Container/Docker Network (Internal)
```
Frontend:   http://localhost:3000  ✅
API:        http://localhost:8000  ✅
Database:   postgres://localhost:5432 (internal only)
```

### From Codespaces Browser/External (Forwarded)
```
Frontend:   http://127.0.0.1:3002  ✅ (Codespaces forwards 3000 → 3002)
API:        http://127.0.0.1:8001  (Codespaces forwards 8000 → 8001, if exposed)
```

---

## 🎯 Which URL Should I Use?

### **If you're accessing from your browser:**
👉 Use **http://127.0.0.1:3002** (the Codespaces-forwarded port)

### **If you're using CLI/curl from terminal:**
👉 Use **localhost:3000** or **localhost:8000** (internal container ports)

---

##✅ How It Works

1. **Frontend container** listens on port 3000 internally
2. **Docker** exposes port 3000 to host: `0.0.0.0:3000`
3. **Codespaces** sees port 3000 and forwards it to **3002** for your browser
4. **Your browser** accesses `http://127.0.0.1:3002`
5. **Frontend code** (running in browser) calls API at `localhost:8000` or detects Codespaces URL

---

## 🔌 Port Mapping Reference

| Service | Internal | Host | Codespaces | Status |
|---------|----------|------|-----------|--------|
| **Frontend (React)** | :3000 | :3000 | :3002 | ✅ Live |
| **API (FastAPI)** | :8000 | :8000 | :8001* | ✅ Live |
| **Nginx** | :80 | :80 | :80* | ✅ Live |
| **PostgreSQL** | :5432 | Not exposed | N/A | ✅ Internal |

*When exposed in Codespaces settings

---

## 🧪 Testing Connection

### From Browser
```
✅ Should work:
   http://127.0.0.1:3002

❌ Won't work:
   http://localhost:3000 (only for CLI on host machine outside Codespaces)
```

### From Terminal (inside Codespaces)
```bash
# Both should work:
curl http://localhost:3000
curl http://127.0.0.1:3000

# API test:
curl http://localhost:8000/api/health
```

---

## 📝 Frontend API Configuration

The frontend automatically detects your access method:

```javascript
const getApiUrl = () => {
  // When accessed locally
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000'  // ✅ Works from CLI
  }
  
  // When accessed from Codespaces
  // Replaces 3000/3002 with 8000/8001
  return `http://${hostname.replace(':3002', ':8001')}:8000`
}
```

---

## ✅ Verify Everything Works

### Access from Browser
```
✅ Frontend: http://127.0.0.1:3002/
✅ Should show: "Enterprise Data Quality Platform"
```

### Upload a CSV and Scan
```
1. Open http://127.0.0.1:3002/
2. Select data/customers.csv
3. Click "🚀 Run Scan"
4. Results show organized by category
```

### Check API Directly
```bash
# In terminal:
curl -s http://localhost:8000/api/health | jq .

# Response: {"status": "healthy"}
```

---

## 🎯 Quick Links

- **Frontend:** http://127.0.0.1:3002/
- **API Health:** http://127.0.0.1:8001/api/health (if exposed)
- **Test API:** `curl http://localhost:8000/api/health`

---

## ❓ FAQ

**Q: Why 3002 instead of 3000?**  
A: GitHub Codespaces automatically forwards port 3000 to 3002 to avoid conflicts with other services.

**Q: Can I change the port?**  
A: Yes! Edit `.env` and set `FRONTEND_PORT=3000` and `API_PORT=8000`, then rebuild.

**Q: Why does localhost:3000 work in terminal but not browser?**  
A: Browser requests go through Codespaces' external forwarding (3002). Terminal requests use Docker's internal network (3000).

**Q: Should I update the documentation?**  
A: Yes, use **http://127.0.0.1:3002/** for all user-facing instructions.

---

**Last Updated:** 2026-04-01
