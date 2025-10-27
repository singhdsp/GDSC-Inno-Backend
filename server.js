const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/database/connection');

const authRoutes = require('./src/routes/auth.route');

dotenv.config();
connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});