import prisma from '../../config/db.js';
import { getOrSetCache, purgeCache } from '../../utils/cache.js';

/**
 * Calculates start and end timestamps for current and prior comparison period
 */
const getPeriodBounds = (period) => {
  const now = new Date();
  let days = 30;

  if (period === '7d') days = 7;
  if (period === '90d') days = 90;
  if (period === 'year') days = 365;

  const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  return { now, days, currentStartDate, prevStartDate };
};

/**
 * Calculates percentage difference between two periods safely
 */
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Number(change.toFixed(1));
};

/**
 * Retrieves high-level dashboard KPIs with 60-second in-memory caching
 */
export const getOverviewAnalyticsService = async (period = '30d') => {
  const cacheKey = `analytics:overview:${period}`;

  return getOrSetCache(
    cacheKey,
    async () => {
      const { now, currentStartDate, prevStartDate } = getPeriodBounds(period);

      // 1. Current period orders
      const currentOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: currentStartDate, lte: now },
          status: { not: 'CANCELLED' },
        },
        select: { totalAmount: true, paymentStatus: true, status: true },
      });

      // 2. Previous period comparison orders
      const prevOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: prevStartDate, lt: currentStartDate },
          status: { not: 'CANCELLED' },
        },
        select: { totalAmount: true, paymentStatus: true },
      });

      // Compute revenue & order metrics
      let totalRevenueCurrent = 0;
      for (const o of currentOrders) {
        if (o.paymentStatus === 'COMPLETED') {
          totalRevenueCurrent += Number(o.totalAmount);
        }
      }

      let totalRevenuePrev = 0;
      for (const o of prevOrders) {
        if (o.paymentStatus === 'COMPLETED') {
          totalRevenuePrev += Number(o.totalAmount);
        }
      }

      const ordersCountCurrent = currentOrders.length;
      const ordersCountPrev = prevOrders.length;

      const aovCurrent = ordersCountCurrent > 0 ? totalRevenueCurrent / ordersCountCurrent : 0;
      const aovPrev = ordersCountPrev > 0 ? totalRevenuePrev / ordersCountPrev : 0;

      // 3. Active fulfillment pipeline metrics (Across entire store)
      const [activeOrdersCount, pendingDispatchCount, registeredCustomersCount, newCustomersCount] =
        await Promise.all([
          prisma.order.count({
            where: {
              status: { in: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
            },
          }),
          prisma.order.count({
            where: { status: 'PACKED' },
          }),
          prisma.user.count({
            where: { role: 'CUSTOMER' },
          }),
          prisma.user.count({
            where: {
              role: 'CUSTOMER',
              createdAt: { gte: currentStartDate, lte: now },
            },
          }),
        ]);

      // 4. Warehouse stock alerts
      const variants = await prisma.productVariant.findMany({
        select: { stockQuantity: true, lowStockThreshold: true },
      });

      let lowStockCount = 0;
      let outOfStockCount = 0;
      for (const v of variants) {
        const threshold = v.lowStockThreshold || 5;
        if (v.stockQuantity === 0) {
          outOfStockCount++;
        } else if (v.stockQuantity <= threshold) {
          lowStockCount++;
        }
      }

      return {
        period,
        totalRevenue: Number(totalRevenueCurrent.toFixed(2)),
        revenueChangePct: calculatePercentageChange(totalRevenueCurrent, totalRevenuePrev),
        ordersCount: ordersCountCurrent,
        ordersChangePct: calculatePercentageChange(ordersCountCurrent, ordersCountPrev),
        averageOrderValue: Number(aovCurrent.toFixed(2)),
        aovChangePct: calculatePercentageChange(aovCurrent, aovPrev),
        activeOrdersCount,
        pendingDispatchCount,
        registeredCustomersCount,
        newCustomersCount,
        lowStockCount,
        outOfStockCount,
        currency: 'INR',
        currencySymbol: '₹',
      };
    },
    60 // 60s TTL
  );
};

/**
 * Retrieves time-series revenue and order counts for charting
 */
export const getRevenueChartService = async (period = '30d') => {
  const cacheKey = `analytics:chart:${period}`;

  return getOrSetCache(
    cacheKey,
    async () => {
      const { now, currentStartDate } = getPeriodBounds(period);

      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: currentStartDate, lte: now },
          status: { not: 'CANCELLED' },
        },
        select: { createdAt: true, totalAmount: true, paymentStatus: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group by daily bucket
      const buckets = {};

      for (const o of orders) {
        const dateKey = o.createdAt.toISOString().split('T')[0];
        if (!buckets[dateKey]) {
          buckets[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
        }
        buckets[dateKey].orders += 1;
        if (o.paymentStatus === 'COMPLETED') {
          buckets[dateKey].revenue += Number(o.totalAmount);
        }
      }

      // Convert dictionary to sorted list
      const chartData = Object.values(buckets).map((b) => ({
        ...b,
        revenue: Number(b.revenue.toFixed(2)),
      }));

      return {
        period,
        dataPoints: chartData,
      };
    },
    60
  );
};

/**
 * Retrieves best-selling garments by sales volume and revenue
 */
export const getTopProductsService = async ({ period = '30d', limit = 5 }) => {
  const cacheKey = `analytics:top-products:${period}:${limit}`;

  return getOrSetCache(
    cacheKey,
    async () => {
      const whereOrder = { status: { not: 'CANCELLED' } };

      if (period !== 'all') {
        const { now, currentStartDate } = getPeriodBounds(period);
        whereOrder.createdAt = { gte: currentStartDate, lte: now };
      }

      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: whereOrder,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              slug: true,
              images: {
                where: { isThumbnail: true },
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      });

      // Aggregate sales by product ID
      const productMap = {};

      for (const item of orderItems) {
        const pId = item.productId;
        if (!productMap[pId]) {
          productMap[pId] = {
            productId: pId,
            name: item.product?.name || item.title,
            brand: item.product?.brand || 'Atelier',
            slug: item.product?.slug || null,
            thumbnail: item.product?.images[0]?.url || item.imageUrl || null,
            unitsSold: 0,
            revenue: 0,
          };
        }

        productMap[pId].unitsSold += item.quantity;
        productMap[pId].revenue += Number(item.totalPrice);
      }

      // Sort by units sold desc
      const sorted = Object.values(productMap)
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, limit)
        .map((p) => ({
          ...p,
          revenue: Number(p.revenue.toFixed(2)),
        }));

      return sorted;
    },
    60
  );
};

/**
 * Retrieves order status distribution breakdown for donut/pie charts
 */
export const getOrderStatusDistributionService = async () => {
  const cacheKey = 'analytics:order-distribution';

  return getOrSetCache(
    cacheKey,
    async () => {
      const orders = await prisma.order.findMany({
        select: { status: true },
      });

      const total = orders.length;
      const statusCounts = {};

      for (const o of orders) {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      }

      const distribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }));

      return {
        totalOrders: total,
        distribution,
      };
    },
    60
  );
};

/**
 * Flushes all analytics in-memory caches
 */
export const purgeAnalyticsCacheService = () => {
  purgeCache('analytics:');
  return { message: 'Analytics telemetry cache successfully cleared' };
};
