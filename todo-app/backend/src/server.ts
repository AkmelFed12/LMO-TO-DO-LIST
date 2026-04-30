import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

export { prisma };
