# 🎲 OSRS Bingo - Clan Event Manager

A full-featured web application for creating and managing competitive bingo-style events for Old School RuneScape clans and communities.

![OSRS Bingo](https://img.shields.io/badge/OSRS-Bingo-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Node](https://img.shields.io/badge/Node-18+-339933)

## ✨ Features

### 🔐 User Management
- Secure JWT-based authentication
- User profiles with avatar uploads
- Display names and customization

### 📋 Event Management
- Create custom bingo events with flexible board sizes (5×5, 7×7, 9×9, 10×10)
- Draft mode for preparing events before publishing
- Task creation with custom descriptions and point values
- Edit and delete tasks on the fly
- Event status tracking (draft, active, completed, cancelled)
- Shareable join codes for easy event discovery

### 👥 Team System
- Create and join teams with unique join codes
- Team captain management with role transfer
- Remove members or leave teams
- Team statistics and leaderboards
- Member profiles with avatars

### 🎯 Real-Time Competition
- Live task completion tracking with Socket.IO
- Instant score updates across all clients
- See which teams completed which tasks
- Real-time notifications when teams complete tasks
- Points-based competition system

### 📸 Verification System
- Upload proof images for task completions
- ImgBB integration for image hosting
- View verification images in task details
- Optional verification notes

### 🔍 User Experience
- Search and filter events
- Sort by date or name
- Status-based filtering (active, draft, completed)
- Personal dashboards (My Events, My Teams)
- Mobile-responsive design with Joy UI components
- Intuitive navigation and clean interface

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Joy UI (MUI)** - Component library
- **React Router v6** - Client-side routing
- **Socket.IO Client** - Real-time updates

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Socket.IO** - WebSocket server
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Database & Storage
- **Firebase Firestore** - NoSQL database
- **ImgBB API** - Image hosting

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Firebase project with Firestore enabled
- ImgBB API account (free tier available)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/coadyduffney/osrs-bingo.git
cd osrs-bingo
```

2. **Install dependencies:**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. **Configure environment variables:**

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_IMGBB_API_KEY=your_imgbb_api_key_here
```

Backend (`server/.env`):
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secure-jwt-secret
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

See `.env.example` files for templates.

4. **Start the development servers:**

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server
npm run dev
```

5. **Open your browser:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete production deployment instructions
- **[ImgBB Setup](IMGBB_SETUP.md)** - Image hosting configuration
- **[Firestore Setup](server/FIRESTORE_SETUP.md)** - Database configuration
- **[Firestore Schema](server/FIRESTORE_SCHEMA.md)** - Database structure

## 🎮 How to Use

### Creating an Event

1. **Register/Login** to your account
2. Click **"Create Event"** in the navigation
3. Fill in event details:
   - Event name and description
   - Board size (5×5 to 10×10)
   - Status (draft or active)
4. **Add tasks** to the bingo board
5. **Share the event join code** with participants

### Joining an Event

1. Get the **event join code** from the organizer
2. Click **"Join with Code"** on the home page
3. Enter the code to access the event
4. **Create or join a team** using a team join code

### Completing Tasks

1. Click on a task in the bingo board
2. **Upload proof image** (optional)
3. Add a verification note (optional)
4. Click **"Mark Complete"**
5. Your team's score updates automatically!

## 📁 Project Structure

```
osrs-bingo/
├── src/                      # Frontend source code
│   ├── components/           # Reusable React components
│   │   ├── BingoBoard.tsx   # Dynamic bingo grid
│   │   ├── ImageUpload.tsx  # Image upload component
│   │   └── TeamManagement.tsx
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Landing page
│   │   ├── CreateEvent.tsx  # Event creation
│   │   ├── EventView.tsx    # Event details & board
│   │   ├── Login.tsx        # Authentication
│   │   ├── MyEvents.tsx     # User's events
│   │   ├── MyTeams.tsx      # User's teams
│   │   ├── TeamDetails.tsx  # Team management
│   │   └── UserProfile.tsx  # User settings
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── SocketContext.tsx # WebSocket connection
│   ├── services/            # API clients
│   │   └── api.ts           # REST API wrapper
│   └── utils/               # Utility functions
│       ├── bingoDetection.ts
│       ├── imageUpload.ts
│       └── imgbbUpload.ts
├── server/                   # Backend source code
│   ├── src/
│   │   ├── config/          # Configuration
│   │   │   └── firebase.ts  # Firebase Admin setup
│   │   ├── middleware/      # Express middleware
│   │   │   ├── auth.ts      # JWT verification
│   │   │   └── errorHandler.ts
│   │   ├── repositories/    # Data access layer
│   │   │   └── index.ts     # Firestore repositories
│   │   ├── routes/          # API routes
│   │   │   ├── auth.ts      # Authentication
│   │   │   ├── events.ts    # Event management
│   │   │   ├── teams.ts     # Team management
│   │   │   └── tasks.ts     # Task operations
│   │   ├── schemas/         # Data schemas
│   │   │   └── firestore.ts # Firestore types
│   │   └── index.ts         # Server entry point
│   └── [Documentation files]
├── .env.example             # Frontend env template
├── DEPLOYMENT_GUIDE.md      # Production deployment
└── README.md                # This file
```

## 🔧 Available Scripts

### Frontend
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Backend
```bash
npm run dev       # Start development server with hot reload
npm run build     # Compile TypeScript
npm start         # Run production server
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/join` - Join event with code

### Teams
- `GET /api/teams/event/:eventId` - Get teams for event
- `GET /api/teams/:id` - Get team details
- `GET /api/teams/my-teams` - Get user's teams
- `POST /api/teams` - Create team
- `POST /api/teams/join` - Join team with code
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/transfer-captain` - Transfer captain role
- `DELETE /api/teams/:id/members/:userId` - Remove member

### Tasks
- `GET /api/tasks/event/:eventId` - Get tasks for event
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Complete task
- `GET /api/tasks/:id/completions` - Get completion history

## 🔒 Security Features

- JWT-based authentication with secure token storage
- Password hashing with bcrypt
- Protected API routes with middleware
- Firebase security rules for database access
- Input validation and sanitization
- CORS configuration for API security
- Environment variable protection

## 🚢 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete production deployment instructions, including:
- Server setup (Ubuntu/Nginx)
- Environment configuration
- SSL/HTTPS setup with Let's Encrypt
- PM2 process management
- Database configuration
- Troubleshooting guide

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the OSRS community's clan bingo events
- Built with modern web technologies and best practices
- Special thanks to the OSRS community for inspiration

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the deployment guide for production issues

---

**Built with ❤️ for the Old School RuneScape community**