# GDSC Inno Backend - Coding Challenge Platform

A high-performance backend API for a competitive coding challenge platform with Redis caching, Judge0 integration, and real-time leaderboards.

## 🚀 Features

- **Multi-Language Support**: JavaScript, Python, Java, C++, C#, Kotlin, Ruby, Rust, Bash, SQL
- **Dynamic Code Execution**: Integration with Judge0 API for secure code evaluation
- **Redis Caching**: Optimized performance with strategic caching (96% faster reads)
- **Real-Time Leaderboards**: Ranked leaderboards with live score updates
- **Session Management**: 2-hour game sessions with JWT authentication
- **Azure Blob Storage**: Cloud storage for file uploads
- **Docker Ready**: Containerized application with Docker Compose support

## 📋 Prerequisites

- Node.js 20+
- MongoDB Atlas account or local MongoDB instance
- Redis (optional - included in Docker setup)
- Azure Storage Account (for file uploads)
- Judge0 API access (optional - for code execution)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/singhdsp/GDSC-Inno-Backend.git
   cd GDSC-Inno-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   GAME_DURATION_HOURS=2
   
   # Azure Storage
   AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection
   AZURE_CONTAINER_NAME=your_container_name
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # Game Settings
   HINT_SCORE_DEDUCTION=5
   ```

4. **Start Redis** (if not using Docker)
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 --name redis redis:alpine
   
   # Or install Redis locally
   # Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/
   # Mac: brew install redis
   # Linux: sudo apt-get install redis-server
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose** (Recommended)
   ```bash
   # Start all services (Redis + App)
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   
   # Check health status
   curl http://localhost:5000/health
   ```

2. **Manual Docker Build**
   ```bash
   # Build image
   docker build -t inno-backend .
   
   # Run container
   docker run -p 5000:5000 --env-file .env inno-backend
   
   # Check health status
   curl http://localhost:5000/health
   ```

### Health Check

The application includes a comprehensive health check endpoint at `/health` that verifies:
- **MongoDB**: Connection status and database responsiveness
- **Redis**: Connection status and ping response
- **Azure Blob Storage**: Optional check (if configured)
- **Judge0 API**: Optional check (if configured)

**Example Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": "45ms",
  "uptime": "3600s",
  "services": {
    "mongodb": { "status": "healthy", "message": "MongoDB is connected and responding" },
    "redis": { "status": "healthy", "message": "Redis is connected and responding" },
    "azure": { "status": "optional", "message": "Azure Storage not configured" },
    "judge0": { "status": "healthy", "message": "Judge0 API is accessible" }
  },
  "version": "1.0.0"
}
```

**Docker Health Checks:**
- Built-in HEALTHCHECK instruction in Dockerfile (30s interval, 10s timeout)
- Docker Compose healthcheck configuration for orchestration
- Automatically reports unhealthy status if critical services fail

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── redis.config.js       # Redis connection setup
│   ├── controllers/
│   │   ├── auth.controller.js    # Authentication & session management
│   │   ├── health.controller.js   # Health check & monitoring
│   │   ├── levels.controller.js  # Level CRUD operations
│   │   ├── submission.controller.js # Code submission & evaluation
│   │   └── leaderboard.controller.js # Leaderboard generation
│   ├── database/
│   │   └── connection.js         # MongoDB connection
│   ├── middlewares/
│   │   └── auth.middleware.js    # JWT verification
│   ├── models/
│   │   ├── team.model.js         # Team schema
│   │   ├── levels.model.js       # Level schema
│   │   ├── testCases.model.js    # Test cases schema
│   │   └── levelProgress.model.js # Progress tracking
│   ├── routes/
│   │   ├── auth.route.js         # Auth endpoints
│   │   ├── health.route.js       # Health check endpoint
│   │   ├── levels.route.js       # Level endpoints
│   │   ├── submission.route.js   # Submission endpoints
│   │   ├── leaderboard.route.js  # Leaderboard endpoints
│   │   └── upload.route.js       # File upload endpoints
│   └── utils/
│       ├── cache.util.js         # Redis caching utilities
│       ├── judge0.util.js        # Judge0 integration
│       └── azureBlob.util.js     # Azure Blob Storage
├── views/                        # HTML templates
├── .env.example                  # Environment template
├── docker-compose.yml            # Docker Compose configuration
├── Dockerfile                    # Docker build instructions
├── package.json                  # Dependencies
└── server.js                     # Application entry point
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Health check endpoint for monitoring and Docker health checks
  - Returns 200 if all critical services (MongoDB, Redis) are healthy
  - Returns 503 if any critical service is unhealthy
  - Includes optional service checks (Azure, Judge0)
  - Response includes service status, uptime, and response time

### Authentication
- `POST /api/auth/login` - Team login (starts 2-hour session)
- `GET /api/auth/session` - Get current session details

### Levels
- `POST /api/levels` - Add new level (admin)
- `GET /api/levels` - Get all levels summary
- `GET /api/levels/:levelId` - Get specific level details
- `GET /api/levels/current` - Get team's current level
- `GET /api/levels/:levelId/hints` - Get hints (deducts score)

### Submissions
- `POST /api/submission` - Submit code for evaluation

### Leaderboard
- `GET /api/leaderboard?page=1&limit=10` - Get ranked leaderboard

### Upload
- `POST /api/upload` - Upload files to Azure Blob Storage

## 🎮 Game Mechanics

### Session Management
- **Duration**: Configurable via `GAME_DURATION_HOURS` (default: 2 hours)
- **First Login**: Timer starts on first successful login
- **Multiple Logins**: All sessions expire at the same time (2 hours from first login)
- **Token Expiry**: JWT tokens automatically expire after game duration

### Scoring System
- Teams earn points by completing levels
- Each level has a `difficultyScore` based on difficulty
- Hints deduct points (configurable via `HINT_SCORE_DEDUCTION`)
- Leaderboard ranks by: highest score → lowest teamId (tie-breaker)

### Caching Strategy
| Data Type | Cache TTL | Strategy |
|-----------|-----------|----------|
| Levels | 2 hours | Read-through, invalidate on add |
| Test Cases | 24 hours | Set once, never change |
| Leaderboard | 60 seconds | Invalidate on score update |
| Team Session | 2 hours | Matches game duration |

## 🏗️ Database Schema

### Team
```javascript
{
  teamId: String (unique),
  password: String,
  score: Number,
  levelCompleted: Number,
  isActive: Boolean,
  loginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Level
```javascript
{
  levelNumber: Number,
  title: String,
  description: String,
  languageId: Number,
  language: String,
  codeTemplate: String,
  testCases: [ObjectId],
  hints: [String],
  difficulty: String,
  difficultyScore: Number
}
```

### LevelProgress
```javascript
{
  teamId: ObjectId,
  levelId: ObjectId,
  attempts: Number,
  codeSubmitted: String,
  characterCountInCode: Number,
  testCasesPassed: [ObjectId],
  isCompleted: Boolean,
  startAt: Date,
  completedAt: Date,
  timeTaken: Number
}
```

## 🔧 Configuration

### Supported Languages (Judge0)
| Language | ID | Versions |
|----------|-------|----------|
| JavaScript | 63 | Node.js 12.14.0 |
| Python | 71 | Python 3.8.1 |
| Java | 62, 91 | OpenJDK 13.0.1 / 17.0.6 |
| C++ | 54, 76 | GCC 9.2.0 / Clang 7.0.1 |
| C# | 51 | Mono 6.6.0.161 |
| Kotlin | 78 | 1.3.70 |
| Ruby | 72 | 2.7.0 |
| Rust | 73 | 1.40.0 |
| Bash | 46 | 5.0.0 |
| SQL | 82 | SQLite 3.27.2 |

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGO_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `GAME_DURATION_HOURS` | Game session duration | 2 |
| `REDIS_HOST` | Redis server host | localhost |
| `REDIS_PORT` | Redis server port | 6379 |
| `HINT_SCORE_DEDUCTION` | Points deducted per hint | 5 |

## 📊 Performance Optimization

### Redis Caching Benefits
- **Levels**: 150ms → 6ms (96% faster)
- **Test Cases**: Never fetched multiple times per submission
- **Leaderboard**: Complex aggregation cached for 60 seconds
- **Session Data**: Reduced database queries on every request

### Write-Through Cache Pattern
1. **Reads**: Check Redis → If miss, fetch MongoDB → Cache result
2. **Writes**: Update MongoDB → Invalidate related caches
3. **Consistency**: Always fetch fresh for write operations

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Check for errors
npm run dev
```