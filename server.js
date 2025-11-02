const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const connectDB = require('./src/database/connection');
const { connectRedis } = require('./src/config/redis.config');

const healthRoutes = require('./src/routes/health.route');
const authRoutes = require('./src/routes/auth.route');
const levelsRoutes = require('./src/routes/levels.route');
const uploadRoutes = require('./src/routes/upload.route');
const submissionRoutes = require('./src/routes/submission.route');
const leaderboardRoutes = require('./src/routes/leaderboard.route');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'views')));

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/submission', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/add-level', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-level.html'));
});
    
app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});

(async () => {
    try {
        await connectDB();
        await connectRedis();
        
        app.listen(PORT, () => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
})();