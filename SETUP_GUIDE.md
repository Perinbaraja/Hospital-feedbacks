# Hospital Feedback System - Setup & Troubleshooting Guide

## Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud - MongoDB Atlas)
- Git

### 1. Install Dependencies

From the root directory:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` file in the `backend/` directory (copy from `.env.example`):

```bash

**MongoDB Setup:**
- Local: `mongodb://localhost:27017/hospital-feedback`
- Cloud: Use MongoDB Atlas (https://www.mongodb.com/cloud/atlas)

**Email Setup:**
- Use Gmail with App Passwords (not your regular password)
- Enable 2FA first, then generate app password

### 3. Initialize Database

Run this command **first time only**:

```bash
cd backend
npm run init
cd ..
```

This creates:
- ✅ Default hospital with all departments
- ✅ Super Admin account
- ✅ Hospital Admin account
- ✅ Department Head accounts

### 4. Start the Application

**Option A: Start both (requires 2 terminals)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Option B: Start both together (from root)**
```bash
npm run dev
```

Expected output:
```
✅ Backend: Server running on port 5000
✅ Frontend: Vite dev server at http://localhost:5173
```

---

## Troubleshooting

### "Failed to load data setting" Error

**Cause:** Backend not running, database not initialized, or wrong port

**Solutions:**

1. **Check Backend is Running**
   ```bash
   # Should see: "Server running on port 5000"
   cd backend
   npm run dev
   ```

2. **Initialize Database**
   ```bash
   cd backend
   npm run init
   ```

3. **Check MongoDB Connection**
   ```bash
   # Backend console should show: "MongoDB Connected"
   # If not, verify MONGO_URI in .env
   ```

4. **Verify Port 5000 is Free**
   ```bash
   # Windows PowerShell
   Get-NetTcpConnection -LocalPort 5000
   
   # If occupied, change PORT in .env and vite.config.js
   ```

### "Network Error" When Logging In

**Cause:** Frontend can't reach backend API

**Solutions:**

1. **Verify vite.config.js proxy:**
   - Should point to `http://localhost:5000`
   - Check file: `frontend/vite.config.js`

2. **Check API configuration:**
   - File: `frontend/src/api.js`
   - Should use correct BASE_URL

3. **Clear browser cache:**
   - Dev tools → Cache → Clear all

### Backend Shows "MONGO_URI not configured"

**Solution:** Create `.env` file in `backend/` directory

```bash
# From terminal, go to backend folder
cd backend

# Copy example file
copy ..\env.example .env
# or on Mac/Linux:
cp ../.env.example .env

# Edit .env with your MongoDB connection
```

### Can't Login - Invalid Email or Password

**Solution:** Use default credentials after `npm run init`:

- **Super Admin**
  - Email: `super@hospital.com`
  - Password: `superpassword`

- **Hospital Admin**
  - Email: `admin@hospital.com`
  - Password: `password123`

- **Kitchen Department Head**
  - Email: `kitchen@hospital.com`
  - Password: `password123`

### Email Service Not Working

**Symptoms:** Feedback submitted but no thank you email received

**Solutions:**

1. **Verify Gmail Setup:**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate app password for Gmail
   - Use this in `EMAIL_PASS` (not your regular password)

2. **Check Email Configuration:**
   ```bash
   # In backend console, should show:
   # ✅ "Email Service: Ready to send emails"
   ```

3. **Enable Less Secure Apps** (if app passwords not available):
   - https://myaccount.google.com/lesssecureapps
   - Or use Gmail App Password method above

### Database Still Empty After init.js

**Solution:**

1. **Verify database file:**
   ```bash
   cd backend
   node init.js
   ```

2. **If error persists:**
   - Check MONGO_URI in `.env`
   - Verify MongoDB is running (if local)
   - Check MongoDB network access (if using Atlas)

3. **Manual reset:**
   ```bash
   # This will delete all data and reinitialize
   cd backend
   npm run init
   ```

---

## Common Commands

```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from frontend/)
npm run dev

# Start both from root
npm run dev

# Initialize database (first time only)
cd backend && npm run init

# Full database reset
cd backend && npm run seed

# Build for production (from frontend/)
npm run build
```

---

## Checking If Everything Works

### Backend Check
```bash
# URL: http://localhost:5000
# Should show: "Hospital Feedback API is running..."
```

### Frontend Check
```bash
# URL: http://localhost:5173
# Should show login page
```

### Database Check
```bash
# Try logging in with:
# Email: admin@hospital.com
# Password: password123
```

---

## Port Configuration

If you need to change ports:

1. **Backend port** - Edit `backend/.env`:
   ```
   PORT=5001  # Change to any available port
   ```

2. **Frontend proxy** - Edit `frontend/vite.config.js`:
   ```javascript
   target: 'http://localhost:5001',  // Match backend PORT
   ```

3. **Frontend API** - Edit `frontend/src/api.js`:
   ```javascript
   export const BASE_URL = 'http://localhost:5001';  // Match backend PORT
   ```

---

## Production Deployment

Before deploying:

1. ✅ Change `JWT_SECRET` to a strong random string
2. ✅ Use environment-specific `.env` files
3. ✅ Ensure MongoDB is on cloud (MongoDB Atlas)
4. ✅ Configure proper email service
5. ✅ Set `NODE_ENV=production`
6. ✅ Build frontend: `npm run build`
7. ✅ Serve built files via backend or static host

---

## Need More Help?

Check these files:
- `FIXES_APPLIED.md` - Summary of all fixes
- `backend/routes/` - API route handlers
- `frontend/src/context/AuthContext.jsx` - Authentication logic
- `backend/models/` - Database schemas

---

**Last Updated:** March 5, 2026
**Version:** 1.0
