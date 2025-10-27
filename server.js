const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const connectDB = require('./src/database/connection');

const authRoutes = require('./src/routes/auth.route');
const levelsRoutes = require('./src/routes/levels.route');
const uploadRoutes = require('./src/routes/upload.route');
const submittionRoutes = require('./src/routes/submission.route');

dotenv.config();
connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'views')));

app.use('/api/auth', authRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/submission', submittionRoutes);

app.get('/add-level', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-level.html'));
});
    
app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});