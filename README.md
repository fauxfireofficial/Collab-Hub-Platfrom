# Nexus - Collaboration Hub Platform

Nexus is a professional, high-performance web application designed to connect **Entrepreneurs** and **Investors**. It facilitates smooth collaboration, pitch tracking, secure document sharing, meetings scheduling, real-time messaging, and deal pipeline management.

---

## 🚀 Features

### 👤 User Roles & Dashboards
*   **Entrepreneur Dashboard**: Pitch project ideas, upload documents, track investor interest, and request collaboration.
*   **Investor Dashboard**: Browse pitch decks, review entrepreneur profiles, schedule meetings, and manage ongoing investment deals.
*   **Custom Profiles**: Detailed profiles showcasing professional information, pitch metrics, and investment criteria.

### 💬 Communication & Collaboration
*   **Real-time Chat**: Direct messaging between entrepreneurs and investors powered by Socket.io.
*   **Meeting Scheduler**: Schedule, manage, and join video calls.
*   **Collaboration Requests**: Send and track project collaboration requests with real-time status updates (Pending, Accepted, Rejected).

### 🔒 Security & Document Management
*   **Secure Authentication**: JWT-based user authentication, password hashing using `bcryptjs`, and robust password reset functionality.
*   **Document Hub**: Upload and share files (pitch decks, financial sheets) securely with control over who can view them (using `multer` file handling).

---

## 🛠️ Tech Stack

| Component | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router DOM, Axios, Lucide Icons, Socket.io Client, React Hot Toast |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, Socket.io, Nodemailer, Multer |

---

## ⚙️ Installation & Local Setup

Follow these steps to run the application locally on your machine.

### Prerequisites
*   Node.js (v18 or higher recommended)
*   MongoDB instance (Local or MongoDB Atlas)

---

### 1. Clone the Repository
```bash
git clone https://github.com/fauxfireofficial/Collab-Hub-Platfrom.git
cd Collab-Hub-Platfrom
```

### 2. Configure the Backend
1. Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2. Install the backend dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file based on `.env.example`:
    ```bash
    cp .env.example .env
    ```
4. Open `.env` and fill in your credentials:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/nexus_db
    JWT_SECRET=your_jwt_secret_key
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_app_password
    FRONTEND_URL=http://localhost:5173
    ```
5. Start the backend development server:
    ```bash
    npm run dev
    ```
    *The backend server will run on `import.meta.env.VITE_API_URL`.*

---

### 3. Configure the Frontend
1. Open a new terminal in the project root (`Collab-Hub-Platfrom`):
2. Install the frontend dependencies:
    ```bash
    npm install
    ```
3. Start the Vite development server:
    ```bash
    npm run dev
    ```
    *The frontend app will run on `http://localhost:5173`.*

---

## 📂 Project Directory Structure

```text
Collab-Hub-Platfrom/
├── backend/                  # Express API Backend
│   ├── middleware/           # Express middleware (Auth, etc.)
│   ├── models/               # Mongoose schemas (User, Document, Meeting, Message, etc.)
│   ├── routes/               # API endpoints (users, documents, meetings, payments, etc.)
│   ├── uploads/              # Uploaded user documents (ignored in Git, structure preserved)
│   ├── server.js             # Express app & socket.io entry point
│   ├── .env.example          # Environment variables template
│   └── package.json
├── src/                      # Vite + React Frontend source
│   ├── components/           # Reusable UI component library (Button, Card, Badge, layout components)
│   ├── context/              # Authentication and Global state contexts
│   ├── data/                 # Dummy data & types
│   ├── pages/                # App pages (Dashboard, Deals, Meetings, Profile, auth, chat, etc.)
│   ├── services/             # Axios API service configuration
│   ├── App.tsx               # Main routing & layout
│   └── main.tsx
├── public/                   # Static assets
├── tailwind.config.js        # Tailwind styling configurations
├── vite.config.ts            # Vite configuration
└── package.json
```

---

## 📄 License
This project is licensed under the MIT License.
