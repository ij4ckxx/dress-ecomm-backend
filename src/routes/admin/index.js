import { Router } from 'express';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import collectionRoutes from './collection.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

// Mount Module 1: Admin User Hierarchy & Staff Management
router.use('/users', userRoutes);

// Mount Module 2: Category & Curated Collection Engine
router.use('/categories', categoryRoutes);
router.use('/collections', collectionRoutes);

// Mount Module 3: Product & Multi-Variant Catalog Management
router.use('/products', productRoutes);

export default router;
