import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './client/category.routes.js';
import productRoutes from './client/product.routes.js';
import cartRoutes from './client/cart.routes.js';
import adminRoutes from './admin/index.js';

const router = Router();

// Mount Auth routes under /auth
router.use('/auth', authRoutes);

// Mount Customer Category & Product routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

// Mount Cart routes (supports both /cart and /carts)
router.use('/cart', cartRoutes);
router.use('/carts', cartRoutes);

// Mount Admin routes (isolated under /admin)
router.use('/admin', adminRoutes);

export default router;
