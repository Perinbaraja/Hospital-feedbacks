# Hospital Feedback System

A comprehensive patient feedback and management system for hospitals.

## 🚀 Features
- **Public Feedback**: Patients can submit feedback via QR codes.
- **Admin Dashboard**: Hospitals can monitor and manage feedback.
- **Super Admin**: Manage multiple hospitals and their configurations.
- **Department Isolation**: Heads see only their relevant feedback.
- **Rich Aesthetics**: Modern UI with real-time updates and status tracking.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), React Router, Axios, Lucide React.
- **Backend**: Node.js, Express 5, Mongoose 9.
- **Database**: MongoDB.
- **Auth**: JWT-based authentication.

## 📂 Project Structure
```text
hospital/
├── backend/        # Express API
├── frontend/       # Vite React App
└── package.json    # Root runner (concurrently)
```

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Atlas or local)

### 2. Setup
Run the following command from the root directory to install all dependencies:
```bash
npm run install-all
```

### 3. Environment Variables
1. Copy `backend/.env.example` to `backend/.env` and fill in your credentials.
2. (Optional) Copy `frontend/.env.example` to `frontend/.env` if you need a specific API URL.

### 4. Initialization
Seed the database with default hospitals and users:
```bash
cd backend
npm run init
```

### 5. Running the App
Start both frontend and backend concurrently:
```bash
npm run dev
```

## 🔐 Credentials (Default)
- **Super Admin**: `super@hospital.com` / `superpassword`
- **Hospital Admin**: `admin@hospital.com` / `password123`

## 📄 License
ISC
