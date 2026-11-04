import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config'; // Crucial: This loads the .env file
import compilerRoutes from './routes.js'; 

const app = express();

app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['POST', 'GET'],
    credentials: true
}));
app.use(express.json());

// THIS LINE WAS CAUSING THE ERROR:
// mongoose.connect('mongodb://localhost:27017/compilerDB'); 

// CHANGE IT TO THIS:
mongoose.connect(process.env.MONGO_DB_STRING)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', compilerRoutes);

app.listen(5000, () => console.log('Compiler Backend running on port 5000'));