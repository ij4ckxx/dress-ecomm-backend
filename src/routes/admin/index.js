import { Router } from 'express';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import collectionRoutes from './collection.routes.js';

const router = Router();

// Mount Module 1: Admin User Hierarchy & Staff Management
router.use('/users', userRoutes);

// Mount Module 2: Category & Curated Collection Engine
router.use('/categories', categoryRoutes);
router.use('/collections', collectionRoutes);

export default router;
