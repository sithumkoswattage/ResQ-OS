const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const resourceRoutes = require('./routes/resources');
const commandCenterRoutes = require('./routes/commandCenter');
const { verifyToken, requireRole } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('Database connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/incidents', verifyToken, requireRole('dispatcher'), incidentRoutes);
app.use('/api/resources', verifyToken, requireRole('dispatcher'), resourceRoutes);
app.use('/api/command-center', verifyToken, requireRole('dispatcher'), commandCenterRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ResQ-OS Backend' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ResQ-OS Server running on port ${PORT}`));