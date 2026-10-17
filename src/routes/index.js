import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './client/category.routes.js';
import productRoutes from './client/product.routes.js';
import cartRoutes from './client/cart.routes.js';
import customerRoutes from './client/customer.routes.js';
import collectionRoutes from './client/collection.routes.js';
import settingsRoutes from './client/settings.routes.js';
import couponRoutes from './client/coupon.routes.js';
import checkoutRoutes from './client/checkout.routes.js';
import paymentRoutes from './client/payment.routes.js';
import clientOrderRoutes from './client/order.routes.js';
import wishlistRoutes from './client/wishlist.routes.js';
import contactRoutes from './client/contact.routes.js';
import adminRoutes from './admin/index.js';

const router = Router();

// Mount Auth routes under /auth
router.use('/auth', authRoutes);

// Mount Customer Account & Profile routes
router.use('/customer', customerRoutes);

// Mount Customer Category, Product, & Collection routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/collections', collectionRoutes);

// Mount Public Storefront Settings & Contact routes
router.use('/settings', settingsRoutes);
router.use('/contact', contactRoutes);

// Mount Coupon routes
router.use('/coupons', couponRoutes);

// Mount Cart routes (supports both /cart and /carts)
router.use('/cart', cartRoutes);
router.use('/carts', cartRoutes);

// Mount Checkout, Payments & Client Orders routes
router.use('/checkout', checkoutRoutes);
router.use('/payments', paymentRoutes);
router.use('/orders', clientOrderRoutes);

// Mount Wishlist routes
router.use('/wishlist', wishlistRoutes);
router.use('/customer/wishlist', wishlistRoutes);

// Mount Admin routes (isolated under /admin)
router.use('/admin', adminRoutes);

export default router;
