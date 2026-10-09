import { Router } from 'express';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import collectionRoutes from './collection.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import orderRoutes from './order.routes.js';
import couponRoutes from './coupon.routes.js';
import promotionRoutes from './promotion.routes.js';
import settingsRoutes from './settings.routes.js';
import auditLogRoutes from './auditLog.routes.js';

const router = Router();

// Mount Module 1: Admin User Hierarchy & Staff Management
router.use('/users', userRoutes);

// Mount Module 2: Category & Curated Collection Engine
router.use('/categories', categoryRoutes);
router.use('/collections', collectionRoutes);

// Mount Module 3: Product & Multi-Variant Catalog Management
router.use('/products', productRoutes);

// Mount Module 4: Inventory & Stock Ledger Management
router.use('/inventory', inventoryRoutes);

// Mount Module 5: Order Lifecycle, Fulfillment & Courier Tracking
router.use('/orders', orderRoutes);

// Mount Module 6: Coupons, Discounts & Flash Campaigns
router.use('/coupons', couponRoutes);
router.use('/discounts', couponRoutes); // Convenient alias
router.use('/promotions', promotionRoutes);

// Mount Module 7: Store Settings, Feature Flags & Audit Logging
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
