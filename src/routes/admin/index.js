import { Router } from 'express';
import userRoutes from './user.routes.js';

const router = Router();

// Mount Module 1: Admin User Hierarchy & Staff Management
router.use('/users', userRoutes);

export default router;
