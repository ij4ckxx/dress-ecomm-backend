import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './client/category.routes.js';
import productRoutes from './client/product.routes.js';

const router = Router();

// Mount Auth routes under /auth
router.use('/auth', authRoutes);

// Mount Customer Category & Product routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

export default router;
