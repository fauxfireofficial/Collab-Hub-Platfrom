<div align="center">

<h1>
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Globe%20with%20Meridians.png" width="40" />
  Nexus — Collaboration Hub Platform
</h1>

<p align="center">
  <strong>Where Entrepreneurs Meet Investors.</strong><br/>
  A full-stack, real-time platform for pitching ideas, scheduling meetings, sharing documents, and closing deals — all in one place.
</p>

<p align="center">
  <a href="https://nexus-frontend-ivory.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/🚀%20Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-Frontend%20Build-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-F7B93E?style=for-the-badge&logo=jsonwebtokens&logoColor=black" />
</p>

</div>

---

## 🌐 Live Application

| Environment | URL |
|---|---|
| 🖥️ **Frontend (Vercel)** | [https://nexus-frontend-ivory.vercel.app](https://nexus-frontend-ivory.vercel.app) |
| ⚙️ **Backend API** | Hosted separately (see `.env` setup) |

---

## 🔑 Demo Credentials

> Try the platform instantly — no signup required!

| Role | Email | Password |
|:---:|:---|:---|
| 👑 **Admin** | `nexus@admin.com` | `admin@123` |
| 👤 **User** | `nexus@gmail.com` | `nexus@123` |

---

## ✨ Key Features

### 👤 Role-Based Dashboards
- **Entrepreneur Dashboard** — Pitch ideas, upload documents, track investor interest, and send collaboration requests.
- **Investor Dashboard** — Browse pitch decks, review entrepreneur profiles, schedule meetings, and manage active deals.
- **Admin Panel** — Full platform oversight, user management, and analytics.

### 💬 Real-Time Communication
- **Live Chat** — Instant direct messaging powered by **Socket.io**.
- **Video Calls** — In-app meeting rooms with scheduling support.
- **Collaboration Requests** — Send, accept, or reject requests with live status updates.

### 📁 Document Management
- **Secure File Uploads** — Share pitch decks, financial sheets, and more using **Multer**.
- **Access Control** — Fine-grained control over who can view your documents.

### 🔒 Security & Authentication
- **JWT Authentication** — Stateless, secure session management.
- **Bcrypt Password Hashing** — Industry-standard password protection.
- **Password Reset** — Email-based OTP/link reset via **Nodemailer**.

### 📊 Deal Pipeline Management
- Track investment deals from initial contact through to closing.
- Visual pipeline stages for easy progress monitoring.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router DOM, Axios, Lucide Icons, Socket.io Client, React Hot Toast |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, Socket.io, Nodemailer, Multer, Bcryptjs |
| **Auth** | JSON Web Tokens (JWT), Bcryptjs |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend), MongoDB Atlas (Database) |

---

## 📂 Project Structure

```text
Nexus-main/
│
├── backend/                        # ⚙️  Node.js + Express REST API
│   ├── middleware/                  #    Auth guard & error handlers
│   ├── models/                      #    Mongoose schemas (User, Document, Meeting, Message, Deal…)
│   ├── routes/                      #    API endpoints (auth, users, docs, meetings, chat, deals…)
│   ├── uploads/                     #    Uploaded files (git-ignored)
│   ├── server.js                    #    App entry point + Socket.io bootstrap
│   ├── .env.example                 #    Environment variable template
│   └── package.json
│
├── src/                             # ⚛️  React + Vite Frontend
│   ├── components/                  #    Reusable UI components (Button, Card, Badge, Modals…)
│   ├── context/                     #    Auth context & global state management
│   ├── data/                        #    Static data & TypeScript types/interfaces
│   ├── pages/                       #    All app pages
│   │   ├── auth/                    #      Login, Register, Reset Password
│   │   ├── dashboard/               #      Entrepreneur & Investor dashboards
│   │   ├── chat/                    #      Real-time messaging
│   │   ├── video/                   #      Video call rooms
│   │   ├── deals/                   #      Deal pipeline
│   │   └── profile/                 #      User profiles
│   ├── services/                    #    Axios API client & service functions
│   ├── App.tsx                      #    Root component, routing & layout
│   └── main.tsx                     #    App entry point
│
├── public/                          # 🖼️  Static assets
├── tailwind.config.js               #    Tailwind CSS configuration
├── vite.config.ts                   #    Vite bundler configuration
├── vercel.json                      #    Vercel deployment config
└── package.json
```

---

## ⚙️ Local Development Setup

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** — Local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **Git**

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/fauxfireofficial/Collab-Hub-Platfrom.git
cd Collab-Hub-Platfrom
```

---

### Step 2 — Configure & Run the Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexus_db
JWT_SECRET=your_super_secret_jwt_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_google_app_password
FRONTEND_URL=http://localhost:5173
```

```bash
# Start the backend server (with hot reload)
npm run dev
```

> ✅ Backend will run at **`http://localhost:5000`**

---

### Step 3 — Configure & Run the Frontend

Open a **new terminal** at the project root:

```bash
# Install frontend dependencies
npm install

# Start the Vite dev server
npm run dev
```

> ✅ Frontend will run at **`http://localhost:5173`**

---

## 🚀 Deployment

| Service | Purpose | Config File |
|:---|:---|:---|
| **Vercel** | Frontend hosting | `vercel.json` |
| **Render / Railway** | Backend API hosting | Environment Variables |
| **MongoDB Atlas** | Cloud database | `MONGO_URI` in `.env` |

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🔐 Environment Variables Reference

| Variable | Description | Example |
|:---|:---|:---|
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT signing | `my_secret_key` |
| `EMAIL_USER` | Gmail address for Nodemailer | `app@gmail.com` |
| `EMAIL_PASS` | Google App Password | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open a Pull Request**

Please follow the existing code style and ensure all features are tested before submitting a PR.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ by the Faux Fire**

⭐ *If you found this project useful, please give it a star!* ⭐

</div>
