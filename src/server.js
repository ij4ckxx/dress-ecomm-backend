import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'E-commerce API is running' });
});

// --- Test Endpoints to verify Neon DB CRUD operations ---

// 1. POST: Create a record in Neon DB
app.post('/api/test', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a title in request body' });
    }

    const createdItem = await prisma.testItem.create({
      data: { title },
    });

    res.status(201).json({
      success: true,
      message: 'Data successfully inserted into Neon DB!',
      data: createdItem,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET: List all test records from Neon DB
app.get('/api/test', async (req, res) => {
  try {
    const items = await prisma.testItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. DELETE: Delete a record by ID from Neon DB
app.delete('/api/test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await prisma.testItem.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(200).json({
      success: true,
      message: `Item #${id} successfully deleted from Neon DB!`,
      data: deletedItem,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
