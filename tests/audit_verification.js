import prisma from '../src/config/db.js';
import { AuthService } from '../src/services/auth.service.js';
import { getStoreSettingsService } from '../src/services/admin/settings.service.js';
import { getClientCollections } from '../src/services/client/collection.service.js';
import { getCategories } from '../src/services/client/category.service.js';
import { getProducts } from '../src/services/client/product.service.js';
import { getOrCreateCart } from '../src/services/client/cart.service.js';
import { ROLES } from '../src/constants/roles.js';

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---\n');
  let testCount = 0;
  let passedCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  try {
    // 1. Test Customer Registration Security (Privilege Escalation Prevention)
    console.log('1. Testing Registration Privilege Escalation Prevention...');
    const testEmail = `test_security_${Date.now()}@example.com`;
    const registeredUser = await AuthService.register({
      name: 'Security Test Customer',
      email: testEmail,
      password: 'Password123!',
      phone: '9876543210',
      role: 'SUPER_ADMIN', // Attempted exploit
    });

    assert(
      registeredUser.role === ROLES.CUSTOMER,
      `User role must strictly be CUSTOMER even if SUPER_ADMIN was requested (Actual: ${registeredUser.role})`
    );

    const dbUser = await prisma.user.findUnique({
      where: { id: registeredUser.id },
    });
    assert(
      dbUser.role === ROLES.CUSTOMER,
      `Database record must strictly have role CUSTOMER (Actual: ${dbUser.role})`
    );

    // 2. Test Login & Token Refresh
    console.log('\n2. Testing Login & Token Refresh Flow...');
    const loginResult = await AuthService.login({
      email: testEmail,
      password: 'Password123!',
      userAgent: 'AutomatedTestAgent',
      ipAddress: '127.0.0.1',
    });

    assert(Boolean(loginResult.accessToken), 'Access token must be generated on login');
    assert(Boolean(loginResult.refreshToken), 'Refresh token must be generated on login');

    // Test Token Refresh
    const refreshResult = await AuthService.refresh({
      refreshToken: loginResult.refreshToken,
      userAgent: 'AutomatedTestAgent',
      ipAddress: '127.0.0.1',
    });

    assert(Boolean(refreshResult.accessToken), 'New access token must be generated on refresh');
    assert(Boolean(refreshResult.refreshToken), 'Rotated refresh token must be generated');
    assert(
      refreshResult.refreshToken !== loginResult.refreshToken,
      'Old refresh token must be rotated out'
    );

    // Verify old refresh token can no longer be used (revocation)
    let oldTokenRejected = false;
    try {
      await AuthService.refresh({
        refreshToken: loginResult.refreshToken,
      });
    } catch (err) {
      oldTokenRejected = true;
    }
    assert(oldTokenRejected, 'Old refresh token cannot be reused after rotation');

    // Clean up test user
    await prisma.refreshToken.deleteMany({ where: { userId: registeredUser.id } });
    await prisma.user.delete({ where: { id: registeredUser.id } });
    console.log('[CLEANUP] Test user deleted successfully');

    // 3. Test Public Store Settings
    console.log('\n3. Testing Public Store Settings...');
    const settings = await getStoreSettingsService();
    assert(Boolean(settings.storeName), 'Store name must be present');
    assert(Boolean(settings.currency), 'Store currency must be present');
    assert(Boolean(settings.featuresJson), 'Store features must be configured');
    assert(settings.freeShippingThreshold !== undefined, 'Free shipping threshold must be defined');

    // 4. Test Public Collections / Lookbooks
    console.log('\n4. Testing Public Collections...');
    const collections = await getClientCollections();
    assert(Array.isArray(collections), 'Collections must return an array');
    console.log(`[INFO] Found ${collections.length} active collection(s)`);

    // 5. Test Categories & Products (Existing Functionality Intact)
    console.log('\n5. Verifying Categories & Products Intact...');
    const categories = await getCategories({ tree: true });
    assert(Array.isArray(categories), 'Categories tree must return an array');

    const productsResult = await getProducts({ limit: 5 });
    assert(Array.isArray(productsResult.products), 'Products must return array');
    assert(Boolean(productsResult.pagination), 'Pagination metadata must be present');

    // 6. Test Cart Operations (Existing Functionality Intact)
    console.log('\n6. Verifying Cart Operations Intact...');
    const testCart = await getOrCreateCart({ guestToken: null });
    assert(Boolean(testCart.id), 'Cart ID must be generated');
    assert(Boolean(testCart.guestToken), 'Guest token must be assigned for guest cart');
    assert(Array.isArray(testCart.items), 'Cart items must be an array');

    console.log(`\n--- ALL ${passedCount}/${testCount} TESTS PASSED SUCCESSFULLY! ---`);
  } catch (error) {
    console.error('\n[ERROR IN TESTS]:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
