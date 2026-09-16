# 🎒 CampusFind — Campus Lost & Found

> A campus-focused lost-and-found platform where students report missing belongings, register found items, and discover relevant reports using campus location data.

**Live Demo:** _coming soon — deploy to Vercel_  
**GitHub:** _your repo link here_

---

## ✨ Features (MVP)

| Feature | Status |
|---|---|
| Report lost items | ✅ |
| Report found items | ✅ |
| Browse all reports | ✅ |
| Search by keyword | ✅ |
| Filter by type, category, building | ✅ |
| Location-aware (building + area) | ✅ |
| Update item status | ✅ |
| Stats dashboard | ✅ |
| Delete reports (dev) | ✅ |
| Interactive map | 🔜 v2 |
| User authentication | 🔜 v2 |
| Claim requests | 🔜 v2 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Deployment | Vercel |
| Version Control | Git, GitHub |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier is fine)
- Git

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/campusfind.git
cd campusfind
```

### 2. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in your MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

### 3. Start the backend
```bash
npm run dev     # uses nodemon (auto-restart on file changes)
# or
npm start       # plain node
```

The API runs at: **http://localhost:5000**

### 4. Open the frontend
Open `frontend/index.html` directly in your browser, or use VS Code's Live Server extension (right-click → Open with Live Server).

> **Note:** The frontend uses `http://localhost:5000` as the API base URL automatically when running on localhost.

---

## 🌐 API Reference

Base URL: `http://localhost:5000`

### Health Check
```
GET /
```

### Items

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/items` | List all active items |
| `GET` | `/api/items?type=lost` | Filter lost items |
| `GET` | `/api/items?building=Library` | Filter by building |
| `GET` | `/api/items?category=Keys` | Filter by category |
| `GET` | `/api/items?search=wallet` | Full-text search |
| `GET` | `/api/items/stats` | Summary stats |
| `GET` | `/api/items/:id` | Get a single item |
| `POST` | `/api/items` | Create a report |
| `PUT` | `/api/items/:id` | Update a report |
| `PATCH` | `/api/items/:id/status` | Update status only |
| `DELETE` | `/api/items/:id` | Delete a report |

### Example: Create a Lost Item
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Blue Student ID Card",
    "type": "lost",
    "category": "ID Card",
    "description": "Blue college ID card with my photo. Lost near the library.",
    "location": {
      "building": "Library",
      "area": "Ground Floor"
    },
    "contactInfo": "student@college.edu",
    "reportedBy": "Param"
  }'
```

---

## 📁 Project Structure

```
campusfind/
├── backend/
│   ├── models/
│   │   └── Item.js          # Mongoose schema + indexes
│   ├── routes/
│   │   └── items.js         # REST API routes
│   ├── middleware/
│   │   └── errorHandler.js  # Global error handler
│   ├── server.js            # Express entry point
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── index.html           # Single-page app
│   ├── style.css            # Responsive CSS
│   └── app.js               # Frontend JS
├── vercel.json              # Deployment config
├── .gitignore
└── README.md
```

---

## ☁️ Deploy to Vercel

1. Push your code to GitHub (without `.env`!)
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set Environment Variables in Vercel dashboard:
   - `MONGODB_URI` → your Atlas connection string
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → your Vercel deployment URL (after first deploy, update this)
4. Click **Deploy**

---

## 🗺️ Roadmap

### Version 2 — September 18
- [ ] Leaflet interactive campus map
- [ ] Map markers for lost/found reports
- [ ] Location-based filtering on map
- [ ] Improved UI/UX

### Version 3 — September 19
- [ ] User authentication (register/login)
- [ ] Claim requests
- [ ] Role-based permissions
- [ ] Better validation and error handling
- [ ] Notifications

---

## 📚 What I Learned

- How to build a REST API with Node.js + Express.js
- How to model data with Mongoose schemas
- How frontend JavaScript communicates with a backend API using `fetch()`
- How to handle CORS, environment variables, and deployment
- How MongoDB indexes improve query performance

---

## 📜 License

MIT — feel free to use this as a learning reference.
