import prisma from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';
import { ROLES } from '../src/constants/roles.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { purgeCache } from '../src/utils/cache.js';

/**
 * --------------------------------------------------------------------------
 * Complete Ecommerce Database Reset and Seeder
 * --------------------------------------------------------------------------
 * - Safely wipes all existing application data respecting foreign key constraints
 * - Creates exactly 6 Main Categories + 14 Subcategories + 3 Nested Subcategories (depth 3)
 * - Creates 2 leaf categories with 0 subcategories
 * - Seeds exactly 110 distinct luxury products with images, variants, attributes, and Catalyst modifiers
 * - Configures Super Admin (ij4ckxx@gmail.com / @Jegan123) with full permissions
 * - Seeds 3 customer accounts and exactly 4 realistic orders in different lifecycle stages
 * - Sets up default store configuration and active promotional coupons
 * - Purges all cache keys so changes reflect immediately
 */

// --------------------------------------------------------------------------
// 1. SAFE DATABASE RESET
// --------------------------------------------------------------------------
export const resetDatabase = async () => {
  console.log('🔄 [RESET] Starting safe database reset in dependency order...');

  // 1. Purge Redis and in-memory caches
  try {
    await purgeCache('cache:');
    await purgeCache('auth:');
    await purgeCache('analytics:');
    console.log('   🧹 Redis and memory cache purged successfully');
  } catch (err) {
    console.warn('   ⚠️ Cache purge warning (ignored):', err.message);
  }

  // 2. Child tables in reverse dependency order
  console.log('   🗑️ Deleting child records...');
  await prisma.reviewVote.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.cartItemModifier.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.productCollection.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.couponUsage.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariantAttribute.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.modifierOption.deleteMany({});
  await prisma.modifierGroup.deleteMany({});
  await prisma.productAttributeValue.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.attributeValue.deleteMany({});
  await prisma.attribute.deleteMany({});

  // 3. Category hierarchy (break parent references first, then delete)
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany({});

  // 4. Promotions, Settings, Audits
  await prisma.coupon.deleteMany({});
  await prisma.promotionCampaign.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.customerInquiry.deleteMany({});
  await prisma.storeConfig.deleteMany({});

  // 5. Auth & Users (break self-referential createdById, then delete)
  await prisma.address.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.user.updateMany({ data: { createdById: null } });
  await prisma.user.deleteMany({});

  console.log('✅ [RESET] Database wiped clean. All foreign keys and tables cleared.');
};

// --------------------------------------------------------------------------
// 2. SUPER ADMIN SETUP
// --------------------------------------------------------------------------
export const seedSuperAdmin = async () => {
  console.log('👤 [ADMIN] Configuring Super Admin account from document/admin/SUPER_ADMIN.md...');
  const email = 'ij4ckxx@gmail.com';
  const plainPassword = '@Jegan123';
  const passwordHash = await hashPassword(plainPassword);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Jegan (Super Admin)',
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: '+91 98765 00001',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      role: ROLES.SUPER_ADMIN,
      permissions: Object.values(PERMISSIONS),
      isActive: true,
    },
  });

  console.log(`✅ [ADMIN] Super Admin created: ${superAdmin.email} (Role: ${superAdmin.role}, Permissions: ${superAdmin.permissions.length})`);
  return superAdmin;
};

// --------------------------------------------------------------------------
// 3. CATEGORY HIERARCHY SEEDING (6 Main Categories)
// --------------------------------------------------------------------------
export const seedCategories = async () => {
  console.log('📂 [CATEGORIES] Seeding exactly 6 main categories with nested hierarchy...');

  // Main 1: Women's Haute Couture (Has subcategories + nested depth 3)
  const catWomensCouture = await prisma.category.create({
    data: {
      name: "Women's Haute Couture",
      slug: 'womens-couture',
      description: 'Handcrafted red-carpet gowns, bespoke corsetry, and runway eveningwear.',
      imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 1,
      isFeatured: true,
      isActive: true,
    },
  });

  // Subcategories of Main 1
  const subEveningGowns = await prisma.category.create({
    data: {
      name: 'Evening & Gala Gowns',
      slug: 'evening-gowns',
      description: 'Floor-length gala attire and architectural evening gowns.',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
      parentId: catWomensCouture.id,
      sortOrder: 1,
    },
  });

  // Nested depth 3 under Evening Gowns
  const nestMermaidGowns = await prisma.category.create({
    data: {
      name: 'Mermaid & Corset Gowns',
      slug: 'mermaid-corset-gowns',
      description: 'Fitted fishtail silhouettes with hand-boned corset bodices.',
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80',
      parentId: subEveningGowns.id,
      sortOrder: 1,
    },
  });

  const nestBallGowns = await prisma.category.create({
    data: {
      name: 'A-Line & Ball Gowns',
      slug: 'a-line-ball-gowns',
      description: 'Grand royal flares with multi-layered organza and horsehair braids.',
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
      parentId: subEveningGowns.id,
      sortOrder: 2,
    },
  });

  const nestBacklessGowns = await prisma.category.create({
    data: {
      name: 'Backless & Slit Evening Dresses',
      slug: 'backless-slit-dresses',
      description: 'Daring thigh-high slits and plunging cowl-back silhouettes.',
      imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
      parentId: subEveningGowns.id,
      sortOrder: 3,
    },
  });

  const subCocktailDresses = await prisma.category.create({
    data: {
      name: 'Cocktail & Party Dresses',
      slug: 'cocktail-party-dresses',
      description: 'Chic mini and midi dresses designed for evening celebrations and cocktail soirees.',
      imageUrl: 'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=800&auto=format&fit=crop&q=80',
      parentId: catWomensCouture.id,
      sortOrder: 2,
    },
  });

  const subJumpsuitsSets = await prisma.category.create({
    data: {
      name: 'Designer Jumpsuits & Sets',
      slug: 'designer-jumpsuits-sets',
      description: 'Architectural silk jumpsuits, capes, and coordinate trouser ensembles.',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
      parentId: catWomensCouture.id,
      sortOrder: 3,
    },
  });

  // Main 2: Traditional Heritage Sarees (Has 4 subcategories)
  const catHeritageSarees = await prisma.category.create({
    data: {
      name: 'Traditional Heritage Sarees',
      slug: 'heritage-sarees',
      description: 'Pure handloom silks, imperial zari weaves, and timeless regal sarees.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 2,
      isFeatured: true,
      isActive: true,
    },
  });

  const subKanjivaram = await prisma.category.create({
    data: {
      name: 'Kanjivaram Pure Silk',
      slug: 'kanjivaram-pure-silk',
      description: 'Authentic temple-border Kanchipuram silk sarees with heavy gold zari.',
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      parentId: catHeritageSarees.id,
      sortOrder: 1,
    },
  });

  const subBanarasi = await prisma.category.create({
    data: {
      name: 'Banarasi Brocade & Zari',
      slug: 'banarasi-brocade-zari',
      description: 'Varanasi heritage brocade sarees with intricate floral jangla motifs.',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
      parentId: catHeritageSarees.id,
      sortOrder: 2,
    },
  });

  const subChanderi = await prisma.category.create({
    data: {
      name: 'Chanderi & Organza Sarees',
      slug: 'chanderi-organza-sarees',
      description: 'Lightweight sheer silk organza and delicate hand-painted Chanderi sarees.',
      imageUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&auto=format&fit=crop&q=80',
      parentId: catHeritageSarees.id,
      sortOrder: 3,
    },
  });

  const subVelvetSarees = await prisma.category.create({
    data: {
      name: 'Embroidered Velvet Sarees',
      slug: 'embroidered-velvet-sarees',
      description: 'Plush micro-velvet sarees with antique zardozi borders for winter galas.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469668-935cb0e4c602?w=800&auto=format&fit=crop&q=80',
      parentId: catHeritageSarees.id,
      sortOrder: 4,
    },
  });

  // Main 3: Bridal & Festive Lehengas (Has 3 subcategories)
  const catBridalLehengas = await prisma.category.create({
    data: {
      name: 'Bridal & Festive Lehengas',
      slug: 'bridal-festive-lehengas',
      description: 'Heavy zardozi embroidery, royal velvet flares, and couture bridal ensembles.',
      imageUrl: 'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 3,
      isFeatured: true,
      isActive: true,
    },
  });

  const subBridalVelvet = await prisma.category.create({
    data: {
      name: 'Bridal Velvet Lehengas',
      slug: 'bridal-velvet-lehengas',
      description: 'Regal crimson and plum velvet lehengas with artisanal dabka work.',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
      parentId: catBridalLehengas.id,
      sortOrder: 1,
    },
  });

  const subPastelFloral = await prisma.category.create({
    data: {
      name: 'Pastel & Floral Lehengas',
      slug: 'pastel-floral-lehengas',
      description: 'Dreamy powder pink, mint sage, and lavender lehengas for day weddings.',
      imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&auto=format&fit=crop&q=80',
      parentId: catBridalLehengas.id,
      sortOrder: 2,
    },
  });

  const subFusionLehengas = await prisma.category.create({
    data: {
      name: 'Contemporary Fusion Lehengas',
      slug: 'contemporary-fusion-lehengas',
      description: 'Modern drape-dupattas, jacket lehengas, and asymmetrical silhouettes.',
      imageUrl: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800&auto=format&fit=crop&q=80',
      parentId: catBridalLehengas.id,
      sortOrder: 3,
    },
  });

  // Main 4: Luxury Menswear & Sherwanis (Has 4 subcategories)
  const catLuxuryMenswear = await prisma.category.create({
    data: {
      name: 'Luxury Menswear & Sherwanis',
      slug: 'luxury-menswear',
      description: 'Royal handcrafted sherwanis, bespoke tuxedos, and tailored formal suits.',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 4,
      isFeatured: true,
      isActive: true,
    },
  });

  const subSherwanis = await prisma.category.create({
    data: {
      name: 'Royal Wedding Sherwanis',
      slug: 'royal-wedding-sherwanis',
      description: 'Handcrafted raw silk sherwanis with antique gold tilla embroidery.',
      imageUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&auto=format&fit=crop&q=80',
      parentId: catLuxuryMenswear.id,
      sortOrder: 1,
    },
  });

  const subTuxedos = await prisma.category.create({
    data: {
      name: 'Bespoke Tuxedos & Blazers',
      slug: 'bespoke-tuxedos-blazers',
      description: 'Black-tie peak lapel tuxedos and structured wool dinner jackets.',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
      parentId: catLuxuryMenswear.id,
      sortOrder: 2,
    },
  });

  const subBandhgalas = await prisma.category.create({
    data: {
      name: 'Bandhgala & Nehru Jackets',
      slug: 'bandhgala-nehru-jackets',
      description: 'Imperial Jodhpuri bandhgala suits and quilted silk bundis.',
      imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=80',
      parentId: catLuxuryMenswear.id,
      sortOrder: 3,
    },
  });

  const subKurtaSets = await prisma.category.create({
    data: {
      name: 'Designer Kurta Sets',
      slug: 'designer-kurta-sets',
      description: 'Handloom linen and pure silk kurta-churidar sets with mirror details.',
      imageUrl: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=800&auto=format&fit=crop&q=80',
      parentId: catLuxuryMenswear.id,
      sortOrder: 4,
    },
  });

  // Main 5: Resort & Vacation Dresses (NO SUBCATEGORIES - Direct Products Leaf)
  const catResortDresses = await prisma.category.create({
    data: {
      name: 'Resort & Vacation Dresses',
      slug: 'resort-vacation-dresses',
      description: 'Breezy silk kaftans, backless linen sundresses, and sun-drenched coastal chic.',
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 5,
      isFeatured: true,
      isActive: true,
    },
  });

  // Main 6: Exclusive Limited Accessories (NO SUBCATEGORIES - Direct Products Leaf)
  const catAccessories = await prisma.category.create({
    data: {
      name: 'Exclusive Accessories & Stoles',
      slug: 'exclusive-accessories',
      description: 'Handwoven Pashmina shawls, zardozi potlis, embroidered belts, and dupattas.',
      imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      sortOrder: 6,
      isFeatured: true,
      isActive: true,
    },
  });

  const mainCategoriesCount = await prisma.category.count({ where: { parentId: null } });
  const totalCategoriesCount = await prisma.category.count();
  console.log(`✅ [CATEGORIES] Seeded ${mainCategoriesCount} Main Categories and ${totalCategoriesCount} Total Hierarchical Categories.`);

  return {
    nestMermaidGowns,
    nestBallGowns,
    nestBacklessGowns,
    subCocktailDresses,
    subJumpsuitsSets,
    subKanjivaram,
    subBanarasi,
    subChanderi,
    subVelvetSarees,
    subBridalVelvet,
    subPastelFloral,
    subFusionLehengas,
    subSherwanis,
    subTuxedos,
    subBandhgalas,
    subKurtaSets,
    catResortDresses,
    catAccessories,
  };
};

// --------------------------------------------------------------------------
// 4. ATTRIBUTES AND ATTRIBUTE VALUES SEEDING
// --------------------------------------------------------------------------
export const seedAttributes = async () => {
  console.log('🏷️ [ATTRIBUTES] Seeding standard product attributes and filter values...');

  const attrColor = await prisma.attribute.create({
    data: { name: 'Color', slug: 'color', isFilterable: true },
  });
  const attrSize = await prisma.attribute.create({
    data: { name: 'Size', slug: 'size', isFilterable: true },
  });
  const attrFabric = await prisma.attribute.create({
    data: { name: 'Fabric', slug: 'fabric', isFilterable: true },
  });
  const attrOccasion = await prisma.attribute.create({
    data: { name: 'Occasion', slug: 'occasion', isFilterable: true },
  });

  // Values
  const colors = [
    { name: 'Emerald Green', slug: 'emerald-green' },
    { name: 'Crimson Red', slug: 'crimson-red' },
    { name: 'Peacock Navy Blue', slug: 'peacock-navy-blue' },
    { name: 'Ivory White', slug: 'ivory-white' },
    { name: 'Champagne Gold', slug: 'champagne-gold' },
    { name: 'Midnight Black', slug: 'midnight-black' },
    { name: 'Powder Pink', slug: 'powder-pink' },
    { name: 'Burgundy Wine', slug: 'burgundy-wine' },
    { name: 'Sage Mint', slug: 'sage-mint' },
    { name: 'Mustard Ochre', slug: 'mustard-ochre' },
  ];

  const colorMap = {};
  for (const c of colors) {
    colorMap[c.slug] = await prisma.attributeValue.create({
      data: { attributeId: attrColor.id, value: c.name, slug: c.slug },
    });
  }

  const sizes = [
    { name: 'XS', slug: 'xs' },
    { name: 'S', slug: 's' },
    { name: 'M', slug: 'm' },
    { name: 'L', slug: 'l' },
    { name: 'XL', slug: 'xl' },
    { name: 'Free Size', slug: 'free-size' },
  ];

  const sizeMap = {};
  for (const s of sizes) {
    sizeMap[s.slug] = await prisma.attributeValue.create({
      data: { attributeId: attrSize.id, value: s.name, slug: s.slug },
    });
  }

  const fabrics = [
    { name: 'Mulberry Silk', slug: 'mulberry-silk' },
    { name: 'Micro Velvet', slug: 'micro-velvet' },
    { name: 'Pure Katan Silk', slug: 'pure-katan-silk' },
    { name: 'Organza Silk', slug: 'organza-silk' },
    { name: 'Bespoke Irish Linen', slug: 'bespoke-irish-linen' },
    { name: 'Superfine Merino Wool', slug: 'merino-wool' },
    { name: 'Raw Matka Silk', slug: 'raw-matka-silk' },
    { name: 'Georgette & Crepe', slug: 'georgette-crepe' },
  ];

  const fabricMap = {};
  for (const f of fabrics) {
    fabricMap[f.slug] = await prisma.attributeValue.create({
      data: { attributeId: attrFabric.id, value: f.name, slug: f.slug },
    });
  }

  const occasions = [
    { name: 'Red Carpet Gala', slug: 'red-carpet-gala' },
    { name: 'Royal Wedding & Bridal', slug: 'royal-wedding-bridal' },
    { name: 'Cocktail Soiree', slug: 'cocktail-soiree' },
    { name: 'Festive Celebration', slug: 'festive-celebration' },
    { name: 'Resort Vacation', slug: 'resort-vacation' },
    { name: 'Formal Black Tie', slug: 'formal-black-tie' },
  ];

  const occasionMap = {};
  for (const o of occasions) {
    occasionMap[o.slug] = await prisma.attributeValue.create({
      data: { attributeId: attrOccasion.id, value: o.name, slug: o.slug },
    });
  }

  console.log('✅ [ATTRIBUTES] Seeded Color, Size, Fabric, and Occasion attribute values.');
  return { colorMap, sizeMap, fabricMap, occasionMap };
};

// --------------------------------------------------------------------------
// 5. 110 REALISTIC LUXURY PRODUCTS SEEDING
// --------------------------------------------------------------------------
export const seedProducts = async (cats, attrs) => {
  console.log('👗 [PRODUCTS] Generating exactly 110 distinct products across categories...');

  const { colorMap, sizeMap, fabricMap, occasionMap } = attrs;

  // Master Definition Table for 110 Unique Products
  const productsCatalog = [
    // --- 1. Mermaid & Corset Gowns (7 products) ---
    {
      cat: cats.nestMermaidGowns,
      name: 'Aura Corseted Silk Tulle Gown',
      slug: 'aura-corseted-silk-tulle-gown',
      sku: 'MDE-MCG-001',
      brand: 'Maison De Élégance',
      price: 18500,
      salePrice: 15999,
      stock: 45,
      rating: 4.9,
      reviews: 38,
      sold: 84,
      desc: 'Hand-boned Victorian corset with micro-pleated French silk tulle, sheer illusion back, and structured mermaid hemline.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Seraphina Crystal Embellished Mermaid Gown',
      slug: 'seraphina-crystal-embellished-mermaid-gown',
      sku: 'MDE-MCG-002',
      brand: 'Aura Atelier',
      price: 24000,
      salePrice: 19999,
      stock: 28,
      rating: 4.95,
      reviews: 52,
      sold: 110,
      desc: 'Floor-sweeping ivory mermaid silhouette encrusted with Swarovski crystals along the sweetheart neckline and flared hem.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'georgette-crepe',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Celestia Midnight Velvet Corset Gown',
      slug: 'celestia-midnight-velvet-corset-gown',
      sku: 'MDE-MCG-003',
      brand: 'Maison De Élégance',
      price: 19500,
      salePrice: null,
      stock: 32,
      rating: 4.8,
      reviews: 29,
      sold: 64,
      desc: 'Deep midnight blue Italian velvet with an architectural sweetheart corset bodice and a sculpted train.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Vivienne Satin Draped Fishtail Gown',
      slug: 'vivienne-satin-draped-fishtail-gown',
      sku: 'MDE-MCG-004',
      brand: 'Vogue Couture',
      price: 16500,
      salePrice: 13999,
      stock: 40,
      rating: 4.75,
      reviews: 21,
      sold: 58,
      desc: 'Champagne gold lustrous duchess satin featuring an asymmetric hip drape and structured mermaid sweep.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Ophelia Boned Bodice Sequin Gown',
      slug: 'ophelia-boned-bodice-sequin-gown',
      sku: 'MDE-MCG-005',
      brand: 'Maison De Élégance',
      price: 22000,
      salePrice: 18500,
      stock: 25,
      rating: 4.88,
      reviews: 44,
      sold: 92,
      desc: 'Obsidian black micro-sequins catch light effortlessly on this fully boned corseted silhouette with cathedral sweep.',
      images: [
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'georgette-crepe',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Genevieve Sculpted Crepe Mermaid Gown',
      slug: 'genevieve-sculpted-crepe-mermaid-gown',
      sku: 'MDE-MCG-006',
      brand: 'Aura Atelier',
      price: 15000,
      salePrice: null,
      stock: 35,
      rating: 4.7,
      reviews: 19,
      sold: 43,
      desc: 'Heavy Italian stretch-crepe hugging the natural curves, finished with delicate crystal button spine detailing.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'georgette-crepe',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },
    {
      cat: cats.nestMermaidGowns,
      name: 'Rosalind Off-Shoulder Tulle Mermaid Gown',
      slug: 'rosalind-off-shoulder-tulle-mermaid-gown',
      sku: 'MDE-MCG-007',
      brand: 'Maison De Élégance',
      price: 21000,
      salePrice: 17999,
      stock: 22,
      rating: 4.92,
      reviews: 31,
      sold: 76,
      desc: 'Romantic dusty rose gown featuring sheer off-shoulder tulle sleeves, visible boning, and dramatic ruffled hem.',
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'organza-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },

    // --- 2. A-Line & Ball Gowns (7 products) ---
    {
      cat: cats.nestBallGowns,
      name: 'Elysian Emerald Silk Evening Gown',
      slug: 'elysian-emerald-silk-evening-gown',
      sku: 'MDE-ABG-008',
      brand: 'Maison De Élégance',
      price: 28500,
      salePrice: 24999,
      stock: 20,
      rating: 4.96,
      reviews: 67,
      sold: 140,
      desc: 'Our iconic ballroom gown crafted from 100% pure Mulberry silk with voluminous box-pleated skirt and hidden pockets.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Duchess Champagne Tiered Ball Gown',
      slug: 'duchess-champagne-tiered-ball-gown',
      sku: 'MDE-ABG-009',
      brand: 'Maison De Élégance',
      price: 32000,
      salePrice: null,
      stock: 15,
      rating: 5.0,
      reviews: 24,
      sold: 50,
      desc: 'Architectural tiers of champagne metallic jacquard with an integrated crinoline petticoat for regal volume.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Isabella Layered Organza Princess Gown',
      slug: 'isabella-layered-organza-princess-gown',
      sku: 'MDE-ABG-010',
      brand: 'Aura Atelier',
      price: 26000,
      salePrice: 21999,
      stock: 24,
      rating: 4.84,
      reviews: 35,
      sold: 82,
      desc: 'Soft cloud-like layers of sage organza over shimmer satin with a structured square neckline.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'organza-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Aurelia Gold-Thread Embroidered Ball Gown',
      slug: 'aurelia-gold-thread-embroidered-ball-gown',
      sku: 'MDE-ABG-011',
      brand: 'Maison De Élégance',
      price: 35000,
      salePrice: 29999,
      stock: 18,
      rating: 4.94,
      reviews: 42,
      sold: 88,
      desc: 'Heavily embellished bodice featuring real zari gold thread vines spreading over a flared ivory ball skirt.',
      images: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'mulberry-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Mirabelle Midnight Navy Pleated Gown',
      slug: 'mirabelle-midnight-navy-pleated-gown',
      sku: 'MDE-ABG-012',
      brand: 'Vogue Couture',
      price: 23500,
      salePrice: null,
      stock: 30,
      rating: 4.79,
      reviews: 18,
      sold: 49,
      desc: 'Accordion sunray pleats create luminous movement on this royal navy silk gown with a velvet sash waist.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'mulberry-silk',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Cassandra Pearl-Dusted Tulle Ball Gown',
      slug: 'cassandra-pearl-dusted-tulle-ball-gown',
      sku: 'MDE-ABG-013',
      brand: 'Aura Atelier',
      price: 27500,
      salePrice: 23500,
      stock: 19,
      rating: 4.88,
      reviews: 27,
      sold: 63,
      desc: 'Thousands of micro freshwater pearls hand-sewn across an illusion bodice tapering into tiered tulle.',
      images: [
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'organza-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestBallGowns,
      name: 'Florentina Floral Appliqué Evening Gown',
      slug: 'florentina-floral-applique-evening-gown',
      sku: 'MDE-ABG-014',
      brand: 'Maison De Élégance',
      price: 31000,
      salePrice: null,
      stock: 16,
      rating: 4.91,
      reviews: 33,
      sold: 72,
      desc: 'Three-dimensional laser-cut organza blossoms cascading over a dramatic crimson red silk mikado flare.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },

    // --- 3. Backless & Slit Evening Dresses (7 products) ---
    {
      cat: cats.nestBacklessGowns,
      name: 'Sorsha Deep-V Thigh-Slit Silk Gown',
      slug: 'sorsha-deep-v-thigh-slit-silk-gown',
      sku: 'MDE-BSD-015',
      brand: 'Vogue Couture',
      price: 17500,
      salePrice: 14500,
      stock: 35,
      rating: 4.85,
      reviews: 48,
      sold: 105,
      desc: 'Liquid silk gown featuring a plunging décolletage neckline, daring thigh-high slit, and trailing puddle hem.',
      images: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Kiara Halter Backless Satin Column Dress',
      slug: 'kiara-halter-backless-satin-column-dress',
      sku: 'MDE-BSD-016',
      brand: 'Maison De Élégance',
      price: 15500,
      salePrice: null,
      stock: 42,
      rating: 4.78,
      reviews: 31,
      sold: 70,
      desc: 'Statuesque column silhouette cut on the bias from heavyweight emerald satin with a dramatic open back.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Daphne Cowl-Back Liquid Metallic Gown',
      slug: 'daphne-cowl-back-liquid-metallic-gown',
      sku: 'MDE-BSD-017',
      brand: 'Aura Atelier',
      price: 21500,
      salePrice: 17999,
      stock: 26,
      rating: 4.93,
      reviews: 57,
      sold: 122,
      desc: 'High-shine liquid gold lame draping into an ultra-low cowl back secured by delicate crystal chains.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'georgette-crepe',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Thalia Asymmetrical Side-Slit Velvet Dress',
      slug: 'thalia-asymmetrical-side-slit-velvet-dress',
      sku: 'MDE-BSD-018',
      brand: 'Maison De Élégance',
      price: 18000,
      salePrice: 14999,
      stock: 33,
      rating: 4.81,
      reviews: 29,
      sold: 67,
      desc: 'Rich wine velvet featuring one-shoulder long sleeve and diagonal slit with crystal rope border.',
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Electra Plunge Back Crepe Evening Gown',
      slug: 'electra-plunge-back-crepe-evening-gown',
      sku: 'MDE-BSD-019',
      brand: 'Vogue Couture',
      price: 16500,
      salePrice: null,
      stock: 38,
      rating: 4.74,
      reviews: 22,
      sold: 53,
      desc: 'Crisp ivory crepe gown tailored with a sleek boat neck in front and a deep V down to the lower back.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Selene Open-Back Draped Georgette Dress',
      slug: 'selene-open-back-draped-georgette-dress',
      sku: 'MDE-BSD-020',
      brand: 'Aura Atelier',
      price: 19000,
      salePrice: 15999,
      stock: 30,
      rating: 4.87,
      reviews: 36,
      sold: 79,
      desc: 'Floaty royal blue georgette cut with fluttering cape sleeves and an open teardrop back cutout.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'georgette-crepe',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.nestBacklessGowns,
      name: 'Nadia Strappy Low-Back Gala Gown',
      slug: 'nadia-strappy-low-back-gala-gown',
      sku: 'MDE-BSD-021',
      brand: 'Maison De Élégance',
      price: 20500,
      salePrice: null,
      stock: 27,
      rating: 4.89,
      reviews: 41,
      sold: 86,
      desc: 'Intricate criss-cross rouleau straps frame the back of this crimson column dress with floor-sweeping train.',
      images: [
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'mulberry-silk',
      occasion: 'red-carpet-gala',
      hasModifiers: false,
    },

    // --- 4. Cocktail & Party Dresses (7 products) ---
    {
      cat: cats.subCocktailDresses,
      name: 'Astrid Feather-Trimmed Mini Cocktail Dress',
      slug: 'astrid-feather-trimmed-mini-cocktail-dress',
      sku: 'MDE-CPD-022',
      brand: 'Vogue Couture',
      price: 14500,
      salePrice: 11999,
      stock: 45,
      rating: 4.9,
      reviews: 58,
      sold: 135,
      desc: 'Structured mini shift dress adorned with plush ostrich feather trim along the hemline and square neckline.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: true,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Callista Ruched Metallic Bodycon Dress',
      slug: 'callista-ruched-metallic-bodycon-dress',
      sku: 'MDE-CPD-023',
      brand: 'Aura Atelier',
      price: 12500,
      salePrice: null,
      stock: 50,
      rating: 4.76,
      reviews: 34,
      sold: 88,
      desc: 'All-over horizontal ruching hugs every curve in this metallic liquid bronze stretch jersey soiree dress.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Bianca Bow-Accent Jacquard Shift Dress',
      slug: 'bianca-bow-accent-jacquard-shift-dress',
      sku: 'MDE-CPD-024',
      brand: 'Maison De Élégance',
      price: 16000,
      salePrice: 13500,
      stock: 36,
      rating: 4.88,
      reviews: 26,
      sold: 62,
      desc: 'Embossed floral cloqué fabric featuring an oversized architectural shoulder bow and pearl buttons.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'pure-katan-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Paloma Crystal-Embellished Velvet Mini',
      slug: 'paloma-crystal-embellished-velvet-mini',
      sku: 'MDE-CPD-025',
      brand: 'Maison De Élégance',
      price: 17500,
      salePrice: 14999,
      stock: 29,
      rating: 4.93,
      reviews: 47,
      sold: 112,
      desc: 'Midnight black velvet mini dress finished with hand-embroidered crystal brooch buttons and satin lapels.',
      images: [
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Sienna One-Shoulder Pleated Midi Dress',
      slug: 'sienna-one-shoulder-pleated-midi-dress',
      sku: 'MDE-CPD-026',
      brand: 'Vogue Couture',
      price: 13500,
      salePrice: null,
      stock: 44,
      rating: 4.79,
      reviews: 31,
      sold: 77,
      desc: 'Emerald green plissé pleated midi dress with an asymmetrical draped neckline and self-tie sash belt.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Chloe Tiered Ruffle Taffeta Party Dress',
      slug: 'chloe-tiered-ruffle-taffeta-party-dress',
      sku: 'MDE-CPD-027',
      brand: 'Aura Atelier',
      price: 15500,
      salePrice: 12999,
      stock: 38,
      rating: 4.82,
      reviews: 23,
      sold: 56,
      desc: 'Sculptural party dress with voluminous gathered tiers in rustling ruby silk taffeta.',
      images: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: true,
    },
    {
      cat: cats.subCocktailDresses,
      name: 'Giselle Sculptural Satin Blazer Dress',
      slug: 'giselle-sculptural-satin-blazer-dress',
      sku: 'MDE-CPD-028',
      brand: 'Maison De Élégance',
      price: 18000,
      salePrice: null,
      stock: 31,
      rating: 4.89,
      reviews: 39,
      sold: 95,
      desc: 'Double-breasted tuxedo dress crafted from ultra-heavy ivory duchess satin with crystal encrusted buttons.',
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },

    // --- 5. Designer Jumpsuits & Sets (6 products) ---
    {
      cat: cats.subJumpsuitsSets,
      name: 'Zephyr Wide-Leg Silk Halter Jumpsuit',
      slug: 'zephyr-wide-leg-silk-halter-jumpsuit',
      sku: 'MDE-DJS-029',
      brand: 'Maison De Élégance',
      price: 19500,
      salePrice: 16500,
      stock: 32,
      rating: 4.87,
      reviews: 41,
      sold: 89,
      desc: 'Breathtaking palazzo jumpsuit cut from fluid emerald silk with high cowl halter and open keyhole back.',
      images: [
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: true,
    },
    {
      cat: cats.subJumpsuitsSets,
      name: 'Valentina Cape-Sleeve Tailored Jumpsuit',
      slug: 'valentina-cape-sleeve-tailored-jumpsuit',
      sku: 'MDE-DJS-030',
      brand: 'Vogue Couture',
      price: 22000,
      salePrice: null,
      stock: 26,
      rating: 4.95,
      reviews: 53,
      sold: 114,
      desc: 'Commanding crimson jumpsuit featuring floor-length split cape sleeves and a sharp tailored cigarette pant.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'georgette-crepe',
      occasion: 'red-carpet-gala',
      hasModifiers: true,
    },
    {
      cat: cats.subJumpsuitsSets,
      name: 'Adrienne Bustier & Flared Trouser Ensemble',
      slug: 'adrienne-bustier-flared-trouser-ensemble',
      sku: 'MDE-DJS-031',
      brand: 'Aura Atelier',
      price: 18500,
      salePrice: 15500,
      stock: 34,
      rating: 4.8,
      reviews: 28,
      sold: 67,
      desc: 'Two-piece coordinate set featuring a boned sweetheart bustier top and high-waisted fluid trousers.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subJumpsuitsSets,
      name: 'Camille Sequin-Embroidered Evening Tux Jumpsuit',
      slug: 'camille-sequin-evening-tux-jumpsuit',
      sku: 'MDE-DJS-032',
      brand: 'Maison De Élégance',
      price: 24500,
      salePrice: 20999,
      stock: 22,
      rating: 4.91,
      reviews: 37,
      sold: 81,
      desc: 'Navy blue tuxedo jumpsuit featuring a shimmering hand-embroidered sequin bodice and satin side stripes.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'mulberry-silk',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.subJumpsuitsSets,
      name: 'Juliette Draped One-Shoulder Crepe Jumpsuit',
      slug: 'juliette-draped-one-shoulder-crepe-jumpsuit',
      sku: 'MDE-DJS-033',
      brand: 'Aura Atelier',
      price: 16500,
      salePrice: null,
      stock: 40,
      rating: 4.77,
      reviews: 21,
      sold: 52,
      desc: 'Elegant asymmetric jumpsuit draped seamlessly across the collarbone with wide flowy trouser legs.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subJumpsuitsSets,
      name: 'Monique Pleated Palazzo & Crop Top Set',
      slug: 'monique-pleated-palazzo-crop-top-set',
      sku: 'MDE-DJS-034',
      brand: 'Vogue Couture',
      price: 17000,
      salePrice: 14200,
      stock: 37,
      rating: 4.83,
      reviews: 25,
      sold: 63,
      desc: 'Sunburst pleated ivory silk palazzo pants paired with an origami folded structured crop top.',
      images: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },

    // --- 6. Kanjivaram Pure Silk Sarees (6 products) ---
    {
      cat: cats.subKanjivaram,
      name: 'Imperial Crimson Kanjivaram Pure Silk Saree',
      slug: 'imperial-crimson-kanjivaram-pure-silk-saree',
      sku: 'MDE-KPS-035',
      brand: 'Royal Silks of India',
      price: 36000,
      salePrice: 31500,
      stock: 18,
      rating: 4.98,
      reviews: 84,
      sold: 195,
      desc: 'Authentic 3-ply mulberry silk Kanchipuram bridal saree woven with pure 24-karat gold dipped silver zari.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subKanjivaram,
      name: 'Royal Peacock Blue Gold Zari Kanjivaram Saree',
      slug: 'royal-peacock-blue-gold-zari-kanjivaram-saree',
      sku: 'MDE-KPS-036',
      brand: 'Royal Silks of India',
      price: 32500,
      salePrice: null,
      stock: 22,
      rating: 4.92,
      reviews: 61,
      sold: 142,
      desc: 'Dual-toned peacock blue silk with traditional rudraksha and mayilkan (peacock eye) golden brocade borders.',
      images: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subKanjivaram,
      name: 'Temple Border Emerald Green Silk Saree',
      slug: 'temple-border-emerald-green-silk-saree',
      sku: 'MDE-KPS-037',
      brand: 'Zari & Silk Heritage',
      price: 29000,
      salePrice: 25500,
      stock: 26,
      rating: 4.88,
      reviews: 43,
      sold: 98,
      desc: 'Striking contrast korvai border featuring tall gopuram temple spires woven in dense vintage gold zari.',
      images: [
        'https://images.unsplash.com/photo-1610030469668-935cb0e4c602?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'pure-katan-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subKanjivaram,
      name: 'Mayilkan Gold Tissue Bridal Kanjivaram Saree',
      slug: 'mayilkan-gold-tissue-bridal-kanjivaram-saree',
      sku: 'MDE-KPS-038',
      brand: 'Royal Silks of India',
      price: 42000,
      salePrice: 37999,
      stock: 14,
      rating: 5.0,
      reviews: 32,
      sold: 75,
      desc: 'Full gold tissue body reflecting royal heirloom heritage with rich red pallu depicting coronation scenes.',
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subKanjivaram,
      name: 'Muhurtham Coral Pink Korvai Kanjivaram Saree',
      slug: 'muhurtham-coral-pink-korvai-kanjivaram-saree',
      sku: 'MDE-KPS-039',
      brand: 'Zari & Silk Heritage',
      price: 34000,
      salePrice: null,
      stock: 20,
      rating: 4.89,
      reviews: 49,
      sold: 108,
      desc: 'Vibrant wedding pink handloom with interlocking korvai borders and rich brocaded floral creeper pallu.',
      images: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subKanjivaram,
      name: 'Veldhari Mustard & Maroon Heritage Silk Saree',
      slug: 'veldhari-mustard-maroon-heritage-silk-saree',
      sku: 'MDE-KPS-040',
      brand: 'Royal Silks of India',
      price: 27500,
      salePrice: 23999,
      stock: 25,
      rating: 4.86,
      reviews: 37,
      sold: 84,
      desc: 'Traditional diagonal wavy veldhari lines woven with dots on rich turmeric mustard pure handloom silk.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'mustard-ochre',
      fabric: 'pure-katan-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },

    // --- 7. Banarasi Brocade & Zari (6 products) ---
    {
      cat: cats.subBanarasi,
      name: 'Shahi Gulab Banarasi Katan Silk Saree',
      slug: 'shahi-gulab-banarasi-katan-silk-saree',
      sku: 'MDE-BBS-041',
      brand: 'Zari & Silk Heritage',
      price: 31000,
      salePrice: 26999,
      stock: 24,
      rating: 4.94,
      reviews: 55,
      sold: 128,
      desc: 'Fine Katan silk handwoven on vintage Varanasi jacquard looms featuring antique rose gold floral motifs.',
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBanarasi,
      name: 'Jangla Gold Kadwa Weave Banarasi Saree',
      slug: 'jangla-gold-kadwa-weave-banarasi-saree',
      sku: 'MDE-BBS-042',
      brand: 'Royal Silks of India',
      price: 38000,
      salePrice: null,
      stock: 16,
      rating: 4.97,
      reviews: 41,
      sold: 92,
      desc: 'Masterpiece Jangla floral creeper handwoven in authentic Kadwa technique where each leaf is woven individually.',
      images: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subBanarasi,
      name: 'Shikargah Antique Gold Zari Brocade Saree',
      slug: 'shikargah-antique-gold-zari-brocade-saree',
      sku: 'MDE-BBS-043',
      brand: 'Zari & Silk Heritage',
      price: 45000,
      salePrice: 39500,
      stock: 12,
      rating: 5.0,
      reviews: 29,
      sold: 68,
      desc: 'Historic Shikargah hunting tapestry weave depicting royal deer, peacocks, and banyan trees in antique gold.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBanarasi,
      name: 'Rangkat Multicolor Handwoven Banarasi Saree',
      slug: 'rangkat-multicolor-handwoven-banarasi-saree',
      sku: 'MDE-BBS-044',
      brand: 'Royal Silks of India',
      price: 48000,
      salePrice: null,
      stock: 10,
      rating: 4.99,
      reviews: 19,
      sold: 45,
      desc: 'Rare Rangkat heritage weave taking 8 months to complete with kaleidoscopic color blocking and pure silver tilla.',
      images: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subBanarasi,
      name: 'Meenakari Boota Royal Purple Banarasi Saree',
      slug: 'meenakari-boota-royal-purple-banarasi-saree',
      sku: 'MDE-BBS-045',
      brand: 'Zari & Silk Heritage',
      price: 28000,
      salePrice: 24500,
      stock: 22,
      rating: 4.86,
      reviews: 38,
      sold: 86,
      desc: 'Rich royal plum Katan silk accented with dual-tone colorful Meenakari floral bootis and satin border.',
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'pure-katan-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subBanarasi,
      name: 'Tanchoi Woven Midnight Black Brocade Saree',
      slug: 'tanchoi-woven-midnight-black-brocade-saree',
      sku: 'MDE-BBS-046',
      brand: 'Zari & Silk Heritage',
      price: 26000,
      salePrice: 22999,
      stock: 28,
      rating: 4.88,
      reviews: 44,
      sold: 102,
      desc: 'Satin-finish Tanchoi weaving gives this black silk saree a velvety raised jacquard texture with silver highlights.',
      images: [
        'https://images.unsplash.com/photo-1610030469668-935cb0e4c602?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'pure-katan-silk',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },

    // --- 8. Chanderi & Organza Sarees (5 products) ---
    {
      cat: cats.subChanderi,
      name: 'Noor Hand-Painted Pastel Floral Organza Saree',
      slug: 'noor-hand-painted-pastel-floral-organza-saree',
      sku: 'MDE-COS-047',
      brand: 'Maison De Élégance',
      price: 18500,
      salePrice: 15999,
      stock: 35,
      rating: 4.91,
      reviews: 62,
      sold: 150,
      desc: 'Sheer gossamer silk organza hand-painted by master artists with botanical peonies and gilded gota edges.',
      images: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subChanderi,
      name: 'Meera Gossamer Chanderi Zari Tissue Saree',
      slug: 'meera-gossamer-chanderi-zari-tissue-saree',
      sku: 'MDE-COS-048',
      brand: 'Royal Silks of India',
      price: 16500,
      salePrice: null,
      stock: 40,
      rating: 4.82,
      reviews: 31,
      sold: 72,
      desc: 'Feather-light Chanderi handloom combining katan silk warp and zari weft with shimmering gold border.',
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subChanderi,
      name: 'Sitara Scallop-Border Sheer Organza Saree',
      slug: 'sitara-scallop-border-sheer-organza-saree',
      sku: 'MDE-COS-049',
      brand: 'Aura Atelier',
      price: 19500,
      salePrice: 16999,
      stock: 32,
      rating: 4.93,
      reviews: 49,
      sold: 118,
      desc: 'Ice blue translucent organza featuring delicate hand-cut scalloped borders embroidered with silver sequins.',
      images: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'organza-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: true,
    },
    {
      cat: cats.subChanderi,
      name: 'Gulabi Hand-Block Printed Chanderi Silk Saree',
      slug: 'gulabi-hand-block-printed-chanderi-silk-saree',
      sku: 'MDE-COS-050',
      brand: 'Zari & Silk Heritage',
      price: 14500,
      salePrice: 12500,
      stock: 45,
      rating: 4.79,
      reviews: 28,
      sold: 69,
      desc: 'Hand block printed using wooden blocks in soft blush pink with natural vegetable dyes and gold foil highlights.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'mulberry-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subChanderi,
      name: 'Chandrika Silver Mukaish Organza Saree',
      slug: 'chandrika-silver-mukaish-organza-saree',
      sku: 'MDE-COS-051',
      brand: 'Maison De Élégance',
      price: 22000,
      salePrice: 18999,
      stock: 25,
      rating: 4.96,
      reviews: 54,
      sold: 126,
      desc: 'Intricate silver metal wire mukaish badla hand-embedded across pristine ivory sheer organza.',
      images: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'organza-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },

    // --- 9. Embroidered Velvet Sarees (5 products) ---
    {
      cat: cats.subVelvetSarees,
      name: 'Royal Crimson Velvet Saree',
      slug: 'royal-crimson-velvet-saree',
      sku: 'MDE-EVS-052',
      brand: 'Maison De Élégance',
      price: 24000,
      salePrice: 19999,
      stock: 30,
      rating: 4.94,
      reviews: 73,
      sold: 165,
      desc: 'Sensational heavy micro-velvet saree with ornate zardozi, dabka, and pearl embroidery along the entire border.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610030469668-935cb0e4c602?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subVelvetSarees,
      name: 'Sultanate Midnight Blue Zardozi Velvet Saree',
      slug: 'sultanate-midnight-blue-zardozi-velvet-saree',
      sku: 'MDE-EVS-053',
      brand: 'Maison De Élégance',
      price: 26000,
      salePrice: null,
      stock: 24,
      rating: 4.91,
      reviews: 46,
      sold: 99,
      desc: 'Imperial midnight blue velvet studded with antique tilla work and paired with a heavy hand-embroidered blouse.',
      images: [
        'https://images.unsplash.com/photo-1610030469668-935cb0e4c602?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subVelvetSarees,
      name: 'Emerald Kashida Embroidered Velvet Saree',
      slug: 'emerald-kashida-embroidered-velvet-saree',
      sku: 'MDE-EVS-054',
      brand: 'Zari & Silk Heritage',
      price: 23000,
      salePrice: 19500,
      stock: 28,
      rating: 4.87,
      reviews: 32,
      sold: 74,
      desc: 'Jewel-toned emerald velvet with traditional Kashmiri needlepoint Kashida floral creepers in silk thread.',
      images: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'micro-velvet',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subVelvetSarees,
      name: 'Burgundy Dori & Resham Border Velvet Saree',
      slug: 'burgundy-dori-resham-border-velvet-saree',
      sku: 'MDE-EVS-055',
      brand: 'Royal Silks of India',
      price: 21500,
      salePrice: 18200,
      stock: 33,
      rating: 4.82,
      reviews: 29,
      sold: 63,
      desc: 'Plush deep burgundy velvet embellished with corded dori and tone-on-tone resham embroidery.',
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subVelvetSarees,
      name: 'Noir Black Gota Patti Heavy Velvet Saree',
      slug: 'noir-black-gota-patti-heavy-velvet-saree',
      sku: 'MDE-EVS-056',
      brand: 'Maison De Élégance',
      price: 25000,
      salePrice: null,
      stock: 20,
      rating: 4.95,
      reviews: 58,
      sold: 130,
      desc: 'Striking black evening velvet saree framed with authentic Rajasthani beaten gold gota patti and mirrorwork.',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },

    // --- 10. Bridal Velvet Lehengas (6 products) ---
    {
      cat: cats.subBridalVelvet,
      name: 'Mumtaz Royal Crimson Velvet Bridal Lehenga',
      slug: 'mumtaz-royal-crimson-velvet-bridal-lehenga',
      sku: 'MDE-BVL-057',
      brand: 'Maison De Élégance',
      price: 68000,
      salePrice: 59999,
      stock: 12,
      rating: 5.0,
      reviews: 95,
      sold: 210,
      desc: 'Couture bridal masterpiece in heavyweight crimson velvet, featuring 24 kalis densely hand-embroidered with peacock and jharokha motifs.',
      images: [
        'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBridalVelvet,
      name: 'Noor Jahan Maroon Heavy Zardozi Velvet Lehenga',
      slug: 'noor-jahan-maroon-heavy-zardozi-velvet-lehenga',
      sku: 'MDE-BVL-058',
      brand: 'Maison De Élégance',
      price: 62000,
      salePrice: null,
      stock: 15,
      rating: 4.97,
      reviews: 64,
      sold: 145,
      desc: 'Imperial Mughal architecture inspired zardozi and nakshi work covering the grand velvet skirt, double organza dupattas.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBridalVelvet,
      name: 'Maharani Emerald Green Architectural Velvet Lehenga',
      slug: 'maharani-emerald-green-architectural-velvet-lehenga',
      sku: 'MDE-BVL-059',
      brand: 'Royal Silks of India',
      price: 58000,
      salePrice: 51999,
      stock: 14,
      rating: 4.94,
      reviews: 42,
      sold: 98,
      desc: 'Deep forest emerald velvet encrusted with antique dull gold tilla and sequin filigree inspired by Mewar palaces.',
      images: [
        'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subBridalVelvet,
      name: 'Dastaan Plum Velvet Dabka Embroidered Lehenga',
      slug: 'dastaan-plum-velvet-dabka-embroidered-lehenga',
      sku: 'MDE-BVL-060',
      brand: 'Zari & Silk Heritage',
      price: 54000,
      salePrice: 47500,
      stock: 18,
      rating: 4.91,
      reviews: 38,
      sold: 84,
      desc: 'Rich royal plum tone with intricate metallic French knots, dabka, and shimmering cutdana embroidery.',
      images: [
        'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBridalVelvet,
      name: 'Shahzadi Ruby Velvet Kalidar Wedding Lehenga',
      slug: 'shahzadi-ruby-velvet-kalidar-wedding-lehenga',
      sku: 'MDE-BVL-061',
      brand: 'Maison De Élégance',
      price: 65000,
      salePrice: null,
      stock: 11,
      rating: 4.98,
      reviews: 51,
      sold: 116,
      desc: 'Voluminous 6-meter flare in ruby velvet with hand-embroidered heritage floral trellis and pearl-tasselled latkans.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subBridalVelvet,
      name: 'Begum Wine Heritage Gota Tilla Velvet Lehenga',
      slug: 'begum-wine-heritage-gota-tilla-velvet-lehenga',
      sku: 'MDE-BVL-062',
      brand: 'Royal Silks of India',
      price: 49000,
      salePrice: 42999,
      stock: 20,
      rating: 4.88,
      reviews: 36,
      sold: 79,
      desc: 'Opulent wine velvet paired with beaten gold gota ribbons and hand-knotted tilla work on the hem and blouse.',
      images: [
        'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },

    // --- 11. Pastel & Floral Lehengas (6 products) ---
    {
      cat: cats.subPastelFloral,
      name: 'Gulmohar Powder Pink Resham Silk Lehenga',
      slug: 'gulmohar-powder-pink-resham-silk-lehenga',
      sku: 'MDE-PFL-063',
      brand: 'Aura Atelier',
      price: 42000,
      salePrice: 36500,
      stock: 25,
      rating: 4.93,
      reviews: 68,
      sold: 154,
      desc: 'Delicate powder pink pure mulberry silk lehenga featuring pastel resham threadwork birds and spring blossoms.',
      images: [
        'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'mulberry-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subPastelFloral,
      name: 'Bahaar Mint Green 3D Floral Organza Lehenga',
      slug: 'bahaar-mint-green-3d-floral-organza-lehenga',
      sku: 'MDE-PFL-064',
      brand: 'Aura Atelier',
      price: 38000,
      salePrice: null,
      stock: 28,
      rating: 4.89,
      reviews: 45,
      sold: 99,
      desc: 'Refreshing mint sage organza blooming with handcrafted 3D organza flower petals, micro-beading, and shimmer tulle.',
      images: [
        'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subPastelFloral,
      name: 'Chandni Ivory Pearl & Mirrorwork Lehenga',
      slug: 'chandni-ivory-pearl-mirrorwork-lehenga',
      sku: 'MDE-PFL-065',
      brand: 'Maison De Élégance',
      price: 46000,
      salePrice: 39999,
      stock: 21,
      rating: 4.96,
      reviews: 57,
      sold: 132,
      desc: 'Ethereal ivory raw silk heavily embroidered with real convex glass mirrorwork and freshwater seed pearls.',
      images: [
        'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subPastelFloral,
      name: 'Firdaus Lavender Sequinned Tulle Lehenga',
      slug: 'firdaus-lavender-sequinned-tulle-lehenga',
      sku: 'MDE-PFL-066',
      brand: 'Aura Atelier',
      price: 35000,
      salePrice: 29999,
      stock: 32,
      rating: 4.85,
      reviews: 39,
      sold: 86,
      desc: 'Modern sangeet lehenga in pale lavender tulle glistening with thousands of holographic sequins and feathers.',
      images: [
        'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subPastelFloral,
      name: 'Sitara Peach Georgette Chikankari Lehenga',
      slug: 'sitara-peach-georgette-chikankari-lehenga',
      sku: 'MDE-PFL-067',
      brand: 'Zari & Silk Heritage',
      price: 39000,
      salePrice: null,
      stock: 26,
      rating: 4.91,
      reviews: 48,
      sold: 104,
      desc: 'Handmade Lucknowi Chikankari jaal on flowy peach georgette accentuated with subtle mukaish silver badla work.',
      images: [
        'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'georgette-crepe',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subPastelFloral,
      name: 'Mehtab Ice Blue Foil Print Festive Lehenga',
      slug: 'mehtab-ice-blue-foil-print-festive-lehenga',
      sku: 'MDE-PFL-068',
      brand: 'Vogue Couture',
      price: 28500,
      salePrice: 24500,
      stock: 36,
      rating: 4.79,
      reviews: 31,
      sold: 72,
      desc: 'Luminous ice blue georgette featuring metallic silver foil stamped borders and a crystal sweetheart blouse.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'georgette-crepe',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },

    // --- 12. Contemporary Fusion Lehengas (5 products) ---
    {
      cat: cats.subFusionLehengas,
      name: 'Rhea Metallic Pleated Drape-Dupatta Lehenga',
      slug: 'rhea-metallic-pleated-drape-dupatta-lehenga',
      sku: 'MDE-CFL-069',
      brand: 'Maison De Élégance',
      price: 36000,
      salePrice: 31500,
      stock: 27,
      rating: 4.94,
      reviews: 53,
      sold: 125,
      desc: 'Sculptural metallic plissé fabric in champagne gold with an attached pre-pleated drape dupatta falling gracefully over the shoulder.',
      images: [
        'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: true,
    },
    {
      cat: cats.subFusionLehengas,
      name: 'Tara Asymmetrical Corset Top Fusion Lehenga',
      slug: 'tara-asymmetrical-corset-top-fusion-lehenga',
      sku: 'MDE-CFL-070',
      brand: 'Aura Atelier',
      price: 33000,
      salePrice: null,
      stock: 30,
      rating: 4.88,
      reviews: 36,
      sold: 81,
      desc: 'Architectural boned corset blouse paired with a high-slit emerald green raw silk kalidar skirt.',
      images: [
        'https://images.unsplash.com/photo-1583391733975-045332f9e421?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'raw-matka-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subFusionLehengas,
      name: 'Alizeh Jacket-Style Embroidered Cape Lehenga',
      slug: 'alizeh-jacket-style-embroidered-cape-lehenga',
      sku: 'MDE-CFL-071',
      brand: 'Maison De Élégance',
      price: 41000,
      salePrice: 35999,
      stock: 22,
      rating: 4.92,
      reviews: 44,
      sold: 101,
      desc: 'Full-length sheer organza cape jacket embroidered with threadwork over a bustier and gathered flared skirt.',
      images: [
        'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subFusionLehengas,
      name: 'Maya Pre-Stitched Ruffle Skirt Lehenga Set',
      slug: 'maya-pre-stitched-ruffle-skirt-lehenga-set',
      sku: 'MDE-CFL-072',
      brand: 'Vogue Couture',
      price: 27000,
      salePrice: 22999,
      stock: 35,
      rating: 4.81,
      reviews: 28,
      sold: 66,
      desc: 'Effortless cocktail lehenga with tiered cascading ruffles along the hem and an embellished halter blouse.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'georgette-crepe',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.subFusionLehengas,
      name: 'Inaya Mermaid Silhouette Tiered Fusion Lehenga',
      slug: 'inaya-mermaid-silhouette-tiered-fusion-lehenga',
      sku: 'MDE-CFL-073',
      brand: 'Aura Atelier',
      price: 34500,
      salePrice: null,
      stock: 26,
      rating: 4.86,
      reviews: 33,
      sold: 74,
      desc: 'Fitted mermaid hip tailoring opening into dramatic micro-pleated godets in midnight navy silk.',
      images: [
        'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'mulberry-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },

    // --- 13. Royal Wedding Sherwanis (5 products) ---
    {
      cat: cats.subSherwanis,
      name: 'Maharaja Ivory Raw Silk Zardozi Sherwani',
      slug: 'maharaja-ivory-raw-silk-zardozi-sherwani',
      sku: 'MDE-RWS-074',
      brand: 'Savile & Heritage',
      price: 52000,
      salePrice: 45999,
      stock: 18,
      rating: 4.98,
      reviews: 77,
      sold: 168,
      desc: 'Imperial royal groom sherwani handcrafted from 100% pure raw silk with fine antique zardozi and real pearl buttons.',
      images: [
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subSherwanis,
      name: 'Nawab Cream Banarasi Brocade Wedding Sherwani',
      slug: 'nawab-cream-banarasi-brocade-wedding-sherwani',
      sku: 'MDE-RWS-075',
      brand: 'Savile & Heritage',
      price: 46000,
      salePrice: null,
      stock: 22,
      rating: 4.92,
      reviews: 51,
      sold: 112,
      desc: 'Varanasi heritage gold brocade silk sherwani with tailored structured shoulders and silk churidar trousers.',
      images: [
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subSherwanis,
      name: 'Badshah Royal Emerald Velvet Embroidered Sherwani',
      slug: 'badshah-royal-emerald-velvet-embroidered-sherwani',
      sku: 'MDE-RWS-076',
      brand: 'Savile & Heritage',
      price: 55000,
      salePrice: 48500,
      stock: 15,
      rating: 4.96,
      reviews: 43,
      sold: 95,
      desc: 'Deep emerald velvet regal sherwani with traditional dabka embroidery across cuffs, collar, and center slit.',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subSherwanis,
      name: 'Jodhpur Handcrafted Mukaish Silk Sherwani Set',
      slug: 'jodhpur-handcrafted-mukaish-silk-sherwani-set',
      sku: 'MDE-RWS-077',
      brand: 'Savile & Heritage',
      price: 48000,
      salePrice: 41999,
      stock: 20,
      rating: 4.89,
      reviews: 36,
      sold: 80,
      desc: 'Classic Jodhpur royal cut in beige raw silk studded with geometric badla mukaish dots and enameled meenakari buttons.',
      images: [
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subSherwanis,
      name: 'Darbar Midnight Blue Embroidered Groom Sherwani',
      slug: 'darbar-midnight-blue-embroidered-groom-sherwani',
      sku: 'MDE-RWS-078',
      brand: 'Savile & Heritage',
      price: 51000,
      salePrice: null,
      stock: 17,
      rating: 4.93,
      reviews: 47,
      sold: 104,
      desc: 'Nocturnal navy pure matka silk sherwani featuring tone-on-tone threadwork with discreet metallic shimmer.',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },

    // --- 14. Bespoke Tuxedos & Blazers (6 products) ---
    {
      cat: cats.subTuxedos,
      name: 'Bespoke Navy Tailored Linen Suit',
      slug: 'bespoke-navy-tailored-linen-suit',
      sku: 'MDE-BTB-079',
      brand: 'Savile & Heritage',
      price: 32000,
      salePrice: 27999,
      stock: 25,
      rating: 4.91,
      reviews: 58,
      sold: 130,
      desc: 'Crafted from breathable organic Irish linen, single-breasted two-button blazer with genuine horn buttons and tailored trousers.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'bespoke-irish-linen',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.subTuxedos,
      name: 'Savile Row Black Tie Grosgrain Peak Tuxedo',
      slug: 'savile-row-black-tie-grosgrain-peak-tuxedo',
      sku: 'MDE-BTB-080',
      brand: 'Savile & Heritage',
      price: 42000,
      salePrice: null,
      stock: 18,
      rating: 5.0,
      reviews: 44,
      sold: 96,
      desc: 'Super 150s Merino wool black-tie dinner suit with silk grosgrain peak lapels, covered buttons, and side-stripe trousers.',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'merino-wool',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.subTuxedos,
      name: 'Monte Carlo Ivory Shawl Collar Dinner Jacket',
      slug: 'monte-carlo-ivory-shawl-collar-dinner-jacket',
      sku: 'MDE-BTB-081',
      brand: 'Savile & Heritage',
      price: 28500,
      salePrice: 24999,
      stock: 28,
      rating: 4.88,
      reviews: 35,
      sold: 78,
      desc: 'Classic James Bond style off-white tropical wool dinner jacket featuring a satin shawl lapel and jetted pockets.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'merino-wool',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },
    {
      cat: cats.subTuxedos,
      name: 'Milanese Double-Breasted Pinstripe Wool Suit',
      slug: 'milanese-double-breasted-pinstripe-wool-suit',
      sku: 'MDE-BTB-082',
      brand: 'Savile & Heritage',
      price: 36000,
      salePrice: null,
      stock: 22,
      rating: 4.86,
      reviews: 29,
      sold: 64,
      desc: 'Impeccable Italian 6x2 double-breasted suit in charcoal wool with chalk pinstripes and roped sleeveheads.',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'merino-wool',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.subTuxedos,
      name: 'Windsor Burgundy Velvet Evening Smoking Jacket',
      slug: 'windsor-burgundy-velvet-evening-smoking-jacket',
      sku: 'MDE-BTB-083',
      brand: 'Savile & Heritage',
      price: 26000,
      salePrice: 22500,
      stock: 30,
      rating: 4.92,
      reviews: 52,
      sold: 115,
      desc: 'Lush burgundy cotton-velvet smoking jacket finished with quilted black satin collar and braided frog closures.',
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: false,
    },
    {
      cat: cats.subTuxedos,
      name: 'Chelsea Charcoal Textured Three-Piece Suit',
      slug: 'chelsea-charcoal-textured-three-piece-suit',
      sku: 'MDE-BTB-084',
      brand: 'Savile & Heritage',
      price: 38000,
      salePrice: 32999,
      stock: 20,
      rating: 4.89,
      reviews: 37,
      sold: 82,
      desc: 'Complete 3-piece tailored ensemble comprising single-breasted blazer, matching horseshoe waistcoat, and flat-front trousers.',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'merino-wool',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },

    // --- 15. Bandhgala & Nehru Jackets (5 products) ---
    {
      cat: cats.subBandhgalas,
      name: 'Heritage Royal Navy Suede Bandhgala Suit',
      slug: 'heritage-royal-navy-suede-bandhgala-suit',
      sku: 'MDE-BNJ-085',
      brand: 'Savile & Heritage',
      price: 34000,
      salePrice: 29500,
      stock: 24,
      rating: 4.94,
      reviews: 48,
      sold: 105,
      desc: 'Bespoke closed-neck bandhgala jacket crafted from ultra-soft navy suede with brushed metal crest buttons.',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'merino-wool',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.subBandhgalas,
      name: 'Imperial Jet Black Silk Jodhpuri Bandhgala',
      slug: 'imperial-jet-black-silk-jodhpuri-bandhgala',
      sku: 'MDE-BNJ-086',
      brand: 'Savile & Heritage',
      price: 36000,
      salePrice: null,
      stock: 20,
      rating: 4.9,
      reviews: 39,
      sold: 88,
      desc: 'Sharp, regal black raw silk Jodhpuri coat with mandarin collar and matching slim-tailored trousers.',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.subBandhgalas,
      name: 'Jaipur Hand-Quilted Silk Velvet Nehru Jacket',
      slug: 'jaipur-hand-quilted-silk-velvet-nehru-jacket',
      sku: 'MDE-BNJ-087',
      brand: 'Zari & Silk Heritage',
      price: 18500,
      salePrice: 15500,
      stock: 35,
      rating: 4.88,
      reviews: 42,
      sold: 94,
      desc: 'Sleeveless bundi jacket in emerald silk velvet featuring diamond quilting and carved brass buttons.',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'micro-velvet',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subBandhgalas,
      name: 'Lucknowi Chikankari Embroidered Nehru Waistcoat',
      slug: 'lucknowi-chikankari-embroidered-nehru-waistcoat',
      sku: 'MDE-BNJ-088',
      brand: 'Royal Silks of India',
      price: 16500,
      salePrice: null,
      stock: 40,
      rating: 4.83,
      reviews: 28,
      sold: 63,
      desc: 'Ivory georgette waistcoat hand-embroidered with shadow work Chikankari over a matching silk lining.',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'mulberry-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subBandhgalas,
      name: 'Kashmir Tilla Embroidered Raw Silk Bandhgala',
      slug: 'kashmir-tilla-embroidered-raw-silk-bandhgala',
      sku: 'MDE-BNJ-089',
      brand: 'Savile & Heritage',
      price: 39000,
      salePrice: 33999,
      stock: 18,
      rating: 4.96,
      reviews: 51,
      sold: 110,
      desc: 'Burgundy raw silk jacket embellished with authentic Kashmiri silver tilla threadwork on the mandarin collar and pockets.',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'raw-matka-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },

    // --- 16. Designer Kurta Sets (5 products) ---
    {
      cat: cats.subKurtaSets,
      name: 'Classic Ivory Oxford Cotton Shirt',
      slug: 'classic-ivory-oxford-cotton-shirt',
      sku: 'MDE-DKS-090',
      brand: 'Savile & Heritage',
      price: 6500,
      salePrice: 5499,
      stock: 60,
      rating: 4.89,
      reviews: 82,
      sold: 230,
      desc: 'Crisp organic Egyptian cotton kurta-shirt tailored with mother-of-pearl buttons and mandarin collar.',
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'bespoke-irish-linen',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subKurtaSets,
      name: 'Awadh Silk Kurta Churidar with Mirror Bundi',
      slug: 'awadh-silk-kurta-churidar-with-mirror-bundi',
      sku: 'MDE-DKS-091',
      brand: 'Royal Silks of India',
      price: 19500,
      salePrice: 16999,
      stock: 30,
      rating: 4.92,
      reviews: 47,
      sold: 106,
      desc: 'Three-piece festive outfit: mustard raw silk kurta, cotton churidar, and mirror-embroidered sleeveless bundi.',
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'mustard-ochre',
      fabric: 'raw-matka-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },
    {
      cat: cats.subKurtaSets,
      name: 'Zuber Asymmetric Draped Pathani Silk Kurta Set',
      slug: 'zuber-asymmetric-draped-pathani-silk-kurta-set',
      sku: 'MDE-DKS-092',
      brand: 'Savile & Heritage',
      price: 15500,
      salePrice: null,
      stock: 35,
      rating: 4.84,
      reviews: 33,
      sold: 75,
      desc: 'Modern asymmetric hemline with overlapping diagonal placket and tapered salwar trousers.',
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'mulberry-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subKurtaSets,
      name: 'Qais Handloom Chanderi Pintuck Kurta Trouser',
      slug: 'qais-handloom-chanderi-pintuck-kurta-trouser',
      sku: 'MDE-DKS-093',
      brand: 'Zari & Silk Heritage',
      price: 14000,
      salePrice: 11999,
      stock: 42,
      rating: 4.81,
      reviews: 29,
      sold: 68,
      desc: 'Detailed horizontal pintucks across the chest on breathable sage green Chanderi handloom cotton silk.',
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'organza-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.subKurtaSets,
      name: 'Reyansh Draped Cowl-Hem Festive Kurta Set',
      slug: 'reyansh-draped-cowl-hem-festive-kurta-set',
      sku: 'MDE-DKS-094',
      brand: 'Aura Atelier',
      price: 16500,
      salePrice: 13999,
      stock: 38,
      rating: 4.87,
      reviews: 36,
      sold: 84,
      desc: 'Fluid silk kurta with gentle side cowls, embroidered cuffs, and coordinated stretch churidar.',
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'burgundy-wine',
      fabric: 'mulberry-silk',
      occasion: 'festive-celebration',
      hasModifiers: true,
    },

    // --- 17. Resort & Vacation Dresses (Main 5 Leaf - 8 products) ---
    {
      cat: cats.catResortDresses,
      name: 'Amalfi Tiered Linen Halter Sundress',
      slug: 'amalfi-tiered-linen-halter-sundress',
      sku: 'MDE-RVD-095',
      brand: 'Vogue Couture',
      price: 11500,
      salePrice: 9500,
      stock: 55,
      rating: 4.88,
      reviews: 64,
      sold: 160,
      desc: 'Sun-drenched pure Irish linen maxi dress with gathered tiered skirt, halter ties, and elasticized smocked back.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'bespoke-irish-linen',
      occasion: 'resort-vacation',
      hasModifiers: true,
    },
    {
      cat: cats.catResortDresses,
      name: 'Santorini Hand-Printed Silk Twill Kaftan',
      slug: 'santorini-hand-printed-silk-twill-kaftan',
      sku: 'MDE-RVD-096',
      brand: 'Maison De Élégance',
      price: 14500,
      salePrice: null,
      stock: 45,
      rating: 4.95,
      reviews: 52,
      sold: 135,
      desc: 'Fluid silk twill kaftan dress featuring Mediterranean mosaic tile prints in azure blue and gold tassel ties.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'mulberry-silk',
      occasion: 'resort-vacation',
      hasModifiers: false,
    },
    {
      cat: cats.catResortDresses,
      name: 'Riviera Scallop-Hem Broderie Anglaise Dress',
      slug: 'riviera-scallop-hem-broderie-anglaise-dress',
      sku: 'MDE-RVD-097',
      brand: 'Aura Atelier',
      price: 12500,
      salePrice: 10500,
      stock: 48,
      rating: 4.82,
      reviews: 37,
      sold: 89,
      desc: 'Breezy eyelet lace embroidery across an A-line cotton-linen silhouette with scalloped cap sleeves.',
      images: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'bespoke-irish-linen',
      occasion: 'resort-vacation',
      hasModifiers: true,
    },
    {
      cat: cats.catResortDresses,
      name: 'Bali Backless Crochet-Trim Maxi Sundress',
      slug: 'bali-backless-crochet-trim-maxi-sundress',
      sku: 'MDE-RVD-098',
      brand: 'Vogue Couture',
      price: 13000,
      salePrice: null,
      stock: 40,
      rating: 4.86,
      reviews: 41,
      sold: 94,
      desc: 'Handmade artisanal crochet bodice attached to a floaty crinkled cotton maxi skirt with open lace-up back.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'mustard-ochre',
      fabric: 'bespoke-irish-linen',
      occasion: 'resort-vacation',
      hasModifiers: false,
    },
    {
      cat: cats.catResortDresses,
      name: 'Tulum Plunge Tiered Gauze Beach Dress',
      slug: 'tulum-plunge-tiered-gauze-beach-dress',
      sku: 'MDE-RVD-099',
      brand: 'Aura Atelier',
      price: 11000,
      salePrice: 8999,
      stock: 50,
      rating: 4.79,
      reviews: 33,
      sold: 78,
      desc: 'Double-layered cotton gauze with deep V-neck and fluttering butterfly sleeves perfect for beach sunsets.',
      images: [
        'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'sage-mint',
      fabric: 'bespoke-irish-linen',
      occasion: 'resort-vacation',
      hasModifiers: false,
    },
    {
      cat: cats.catResortDresses,
      name: 'Mykonos Asymmetric Draped Sunset Dress',
      slug: 'mykonos-asymmetric-draped-sunset-dress',
      sku: 'MDE-RVD-100',
      brand: 'Maison De Élégance',
      price: 15500,
      salePrice: 12999,
      stock: 36,
      rating: 4.93,
      reviews: 59,
      sold: 142,
      desc: 'Warm sunset ombre hues on luxurious washable silk with asymmetrical shoulder drape and fluid side slit.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'mulberry-silk',
      occasion: 'resort-vacation',
      hasModifiers: true,
    },
    {
      cat: cats.catResortDresses,
      name: 'Positano Lemon Print Silk Shift Dress',
      slug: 'positano-lemon-print-silk-shift-dress',
      sku: 'MDE-RVD-101',
      brand: 'Vogue Couture',
      price: 13500,
      salePrice: null,
      stock: 42,
      rating: 4.84,
      reviews: 36,
      sold: 85,
      desc: 'Playful Italian citrus watercolor prints on structured pure silk twill with a relaxed shift silhouette.',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'mustard-ochre',
      fabric: 'mulberry-silk',
      occasion: 'resort-vacation',
      hasModifiers: false,
    },
    {
      cat: cats.catResortDresses,
      name: 'Ibiza Cut-Out Linen Blend Midi Sundress',
      slug: 'ibiza-cut-out-linen-blend-midi-sundress',
      sku: 'MDE-RVD-102',
      brand: 'Aura Atelier',
      price: 12000,
      salePrice: 9999,
      stock: 46,
      rating: 4.81,
      reviews: 29,
      sold: 71,
      desc: 'Subtle side-torso cutouts connect to an O-ring tortoise ring on this breezy summer midi.',
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'powder-pink',
      fabric: 'bespoke-irish-linen',
      occasion: 'resort-vacation',
      hasModifiers: true,
    },

    // --- 18. Exclusive Limited Accessories (Main 6 Leaf - 8 products) ---
    {
      cat: cats.catAccessories,
      name: 'Shahmina Handspun Antique Sozni Pashmina Shawl',
      slug: 'shahmina-handspun-antique-sozni-pashmina-shawl',
      sku: 'MDE-ELA-103',
      brand: 'Royal Silks of India',
      price: 24000,
      salePrice: 19999,
      stock: 25,
      rating: 4.99,
      reviews: 67,
      sold: 155,
      desc: 'Heirloom Grade-A Changthangi cashmere hand-embroidered with micro needlepoint Sozni floral borders.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'ivory-white',
      fabric: 'merino-wool',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.catAccessories,
      name: 'Begum Zardozi Embroidered Bridal Potli Bag',
      slug: 'begum-zardozi-embroidered-bridal-potli-bag',
      sku: 'MDE-ELA-104',
      brand: 'Maison De Élégance',
      price: 7500,
      salePrice: 6200,
      stock: 50,
      rating: 4.92,
      reviews: 84,
      sold: 210,
      desc: 'Plush velvet drawstring potli pouch encrusted with dabka embroidery, freshwater pearls, and heavy pearl handle.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.catAccessories,
      name: 'Kohinoor Polki Embellished Evening Minaudière',
      slug: 'kohinoor-polki-embellished-evening-minaudiere',
      sku: 'MDE-ELA-105',
      brand: 'Maison De Élégance',
      price: 12500,
      salePrice: null,
      stock: 30,
      rating: 4.96,
      reviews: 42,
      sold: 96,
      desc: 'Solid metal clutch frame lined in Italian velvet and adorned with uncut polki Kundan stones and detachable chain.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'cocktail-soiree',
      hasModifiers: false,
    },
    {
      cat: cats.catAccessories,
      name: 'Royal Heritage Antique Gold Waist Belt (Kamarbandh)',
      slug: 'royal-heritage-antique-gold-waist-belt',
      sku: 'MDE-ELA-106',
      brand: 'Zari & Silk Heritage',
      price: 8500,
      salePrice: 6999,
      stock: 40,
      rating: 4.88,
      reviews: 39,
      sold: 88,
      desc: 'Handcrafted velvet waistband embroidered with gold zardozi motifs to cinch sarees and bridal lehengas.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'emerald-green',
      fabric: 'micro-velvet',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
    {
      cat: cats.catAccessories,
      name: 'Nizami Pearl & Zirconium Handcrafted Turban Brooch',
      slug: 'nizami-pearl-zirconium-handcrafted-turban-brooch',
      sku: 'MDE-ELA-107',
      brand: 'Savile & Heritage',
      price: 6800,
      salePrice: null,
      stock: 45,
      rating: 4.91,
      reviews: 35,
      sold: 79,
      desc: 'Hyderabadi sarpech brooch for groom turbans and sherwani lapels featuring cascading pearl droplets.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'champagne-gold',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: false,
    },
    {
      cat: cats.catAccessories,
      name: 'Zeenat Handwoven Pure Katan Silk Scarf',
      slug: 'zeenat-handwoven-pure-katan-silk-scarf',
      sku: 'MDE-ELA-108',
      brand: 'Royal Silks of India',
      price: 5500,
      salePrice: 4500,
      stock: 60,
      rating: 4.85,
      reviews: 49,
      sold: 122,
      desc: 'Lustrous Varanasi pure silk stole with micro boota weaving and delicate hand-knotted fringe edges.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'peacock-navy-blue',
      fabric: 'pure-katan-silk',
      occasion: 'festive-celebration',
      hasModifiers: false,
    },
    {
      cat: cats.catAccessories,
      name: 'Sheesh Mahal Crystal-Studded Velvet Clutch',
      slug: 'sheesh-mahal-crystal-studded-velvet-clutch',
      sku: 'MDE-ELA-109',
      brand: 'Maison De Élégance',
      price: 9500,
      salePrice: 7999,
      stock: 35,
      rating: 4.93,
      reviews: 58,
      sold: 140,
      desc: 'Handmade rectangular evening clutch in midnight black velvet encrusted with radiant Swarovski crystal florets.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'midnight-black',
      fabric: 'micro-velvet',
      occasion: 'formal-black-tie',
      hasModifiers: true,
    },
    {
      cat: cats.catAccessories,
      name: 'Chandrakala Banarasi Brocade Bridal Stole',
      slug: 'chandrakala-banarasi-brocade-bridal-stole',
      sku: 'MDE-ELA-110',
      brand: 'Royal Silks of India',
      price: 11000,
      salePrice: 8999,
      stock: 32,
      rating: 4.97,
      reviews: 63,
      sold: 150,
      desc: 'Regal crimson silk brocade stole bordered in heavy golden tilla work, ideal for grooms and luxury winter gifting.',
      images: [
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1000&auto=format&fit=crop&q=80',
      ],
      color: 'crimson-red',
      fabric: 'pure-katan-silk',
      occasion: 'royal-wedding-bridal',
      hasModifiers: true,
    },
  ];

  console.log(`   📦 Catalog prepared: exactly ${productsCatalog.length} distinct products to insert.`);

  // Iterate and create all 110 products with images, variants, attributes, and modifiers
  const seededProducts = [];

  for (let idx = 0; idx < productsCatalog.length; idx++) {
    const item = productsCatalog[idx];
    const isFeatured = idx < 20; // First 20 items featured
    const costPrice = Math.round(item.price * 0.45);

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.desc,
        brand: item.brand,
        sku: item.sku,
        categoryId: item.cat.id,
        regularPrice: item.price,
        salePrice: item.salePrice,
        offerPrice: item.salePrice ? Math.round(item.salePrice * 0.9) : null,
        costPrice,
        stockQuantity: item.stock,
        lowStockThreshold: 5,
        isActive: true,
        isFeatured,
        rating: item.rating,
        reviewCount: item.reviews,
        totalSold: item.sold,
      },
    });

    // 1. Add Images
    for (let imgIdx = 0; imgIdx < item.images.length; imgIdx++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: item.images[imgIdx],
          altText: `${item.name} - Luxury Editorial View ${imgIdx + 1}`,
          isThumbnail: imgIdx === 0,
          sortOrder: imgIdx + 1,
        },
      });
    }

    // 2. Link Attributes
    if (colorMap[item.color]) {
      await prisma.productAttributeValue.create({
        data: { productId: product.id, attributeValueId: colorMap[item.color].id },
      });
    }
    if (fabricMap[item.fabric]) {
      await prisma.productAttributeValue.create({
        data: { productId: product.id, attributeValueId: fabricMap[item.fabric].id },
      });
    }
    if (occasionMap[item.occasion]) {
      await prisma.productAttributeValue.create({
        data: { productId: product.id, attributeValueId: occasionMap[item.occasion].id },
      });
    }

    // 3. Create Variants (For apparel sizes S, M, L, XL or Free Size)
    const isAccessory = item.cat.slug === 'exclusive-accessories';
    const variantSizes = isAccessory ? ['free-size'] : ['s', 'm', 'l', 'xl'];

    for (const sSlug of variantSizes) {
      const sAttr = sizeMap[sSlug];
      const vSku = `${item.sku}-${sSlug.toUpperCase()}`;
      const vPrice = item.price;
      const vSale = item.salePrice;

      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: vSku,
          name: `${item.name} / ${sAttr.value}`,
          regularPrice: vPrice,
          salePrice: vSale,
          offerPrice: vSale ? Math.round(vSale * 0.9) : null,
          costPrice,
          stockQuantity: Math.max(5, Math.floor(item.stock / variantSizes.length)),
          isActive: true,
        },
      });

      // Link variant to size attribute
      await prisma.productVariantAttribute.create({
        data: { variantId: variant.id, attributeValueId: sAttr.id },
      });

      // Also link to the product's color
      if (colorMap[item.color]) {
        await prisma.productVariantAttribute.create({
          data: { variantId: variant.id, attributeValueId: colorMap[item.color].id },
        });
      }
    }

    // 4. Add Catalyst Modifier Groups if enabled on this item
    if (item.hasModifiers) {
      // Group 1: DROPDOWN - Luxury Gift Box
      const giftGroup = await prisma.modifierGroup.create({
        data: {
          productId: product.id,
          name: 'Luxury Keepsake Packaging',
          displayName: 'Select Presentation Packaging',
          type: 'DROPDOWN',
          isRequired: false,
          minSelection: 0,
          maxSelection: 1,
          sortOrder: 1,
        },
      });
      await prisma.modifierOption.createMany({
        data: [
          { modifierGroupId: giftGroup.id, name: 'Complimentary Garment Cover', priceDelta: 0, isDefault: true, sortOrder: 1 },
          { modifierGroupId: giftGroup.id, name: 'Velvet Signature Keepsake Gift Box', priceDelta: 450, isDefault: false, sortOrder: 2 },
        ],
      });

      // Group 2: SHORT_TEXT - Monogram Embroidery
      await prisma.modifierGroup.create({
        data: {
          productId: product.id,
          name: 'Custom Monogram Embroidery',
          displayName: 'Add Initials / Name (Up to 15 characters)',
          type: 'SHORT_TEXT',
          isRequired: false,
          minSelection: 0,
          maxSelection: 1,
          config: { maxLength: 15, placeholder: 'e.g. Priya' },
          sortOrder: 2,
        },
      });

      // Group 3: CHECKBOX - Express VIP Atelier Fitting / Alterations
      const fittingGroup = await prisma.modifierGroup.create({
        data: {
          productId: product.id,
          name: 'Atelier Alteration & Custom Hemming',
          displayName: 'Custom Hemming Services',
          type: 'CHECKBOX',
          isRequired: false,
          minSelection: 0,
          maxSelection: 1,
          sortOrder: 3,
        },
      });
      await prisma.modifierOption.create({
        data: { modifierGroupId: fittingGroup.id, name: 'Precision Custom Floor Hemming', priceDelta: 350, isDefault: false, sortOrder: 1 },
      });
    }

    seededProducts.push(product);
  }

  const finalProductCount = await prisma.product.count();
  console.log(`✅ [PRODUCTS] Successfully seeded exactly ${finalProductCount} products with variants and attributes.`);
  return seededProducts;
};

// --------------------------------------------------------------------------
// 6. CUSTOMER ACCOUNTS AND 4 REALISTIC ORDERS SEEDING
// --------------------------------------------------------------------------
export const seedCustomersAndOrders = async (products) => {
  console.log('🛍️ [ORDERS] Seeding customer accounts and exactly 4 realistic orders...');

  // Customer 1: Priya Sharma
  const cust1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash: await hashPassword('Customer@123'),
      phone: '+91 98765 43211',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      role: ROLES.CUSTOMER,
      isActive: true,
    },
  });

  const addr1 = await prisma.address.create({
    data: {
      userId: cust1.id,
      firstName: 'Priya',
      lastName: 'Sharma',
      company: 'Vogue Studios Bangalore',
      address1: '42, Gulmohar Enclave, 100 Feet Road',
      address2: 'Indiranagar 2nd Stage',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
      phoneNumber: '+91 98765 43211',
      isDefault: true,
    },
  });

  // Customer 2: Ananya Deshmukh
  const cust2 = await prisma.user.create({
    data: {
      name: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@example.com',
      passwordHash: await hashPassword('Customer@123'),
      phone: '+91 98765 43212',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      role: ROLES.CUSTOMER,
      isActive: true,
    },
  });

  const addr2 = await prisma.address.create({
    data: {
      userId: cust2.id,
      firstName: 'Ananya',
      lastName: 'Deshmukh',
      address1: '12B, Sea Crest Towers, Worli Sea Face',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400018',
      country: 'India',
      phoneNumber: '+91 98765 43212',
      isDefault: true,
    },
  });

  // Customer 3: Rohit Mehta
  const cust3 = await prisma.user.create({
    data: {
      name: 'Rohit Mehta',
      email: 'rohit.mehta@example.com',
      passwordHash: await hashPassword('Customer@123'),
      phone: '+91 98765 43213',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      role: ROLES.CUSTOMER,
      isActive: true,
    },
  });

  const addr3 = await prisma.address.create({
    data: {
      userId: cust3.id,
      firstName: 'Rohit',
      lastName: 'Mehta',
      company: 'Mehta Capital Partners',
      address1: '78, Defence Colony, Flyover Road',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110024',
      country: 'India',
      phoneNumber: '+91 98765 43213',
      isDefault: true,
    },
  });

  // Create Exactly 4 Orders with distinct statuses & payment methods
  const orders = [];

  // --------------------------------------------------------------------------
  // ORDER 1: PENDING Order (Online payment pending / initial checkout)
  // --------------------------------------------------------------------------
  const prod1 = products[0]; // Aura Corseted Silk Gown
  const var1 = await prisma.productVariant.findFirst({ where: { productId: prod1.id } });
  const p1Price = Number(var1.salePrice ?? var1.regularPrice);
  const p1Shipping = 150;
  const p1Total = p1Price + p1Shipping;

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-A101',
      userId: cust1.id,
      customerName: cust1.name,
      customerEmail: cust1.email,
      customerPhone: cust1.phone,
      subtotal: p1Price,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: p1Shipping,
      totalAmount: p1Total,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'RAZORPAY',
      shippingAddress: addr1,
      billingAddress: addr1,
      notes: 'Customer initiating online payment gateway',
      items: {
        create: [
          {
            productId: prod1.id,
            variantId: var1.id,
            title: prod1.name,
            sku: var1.sku,
            size: 'S',
            color: 'Emerald Green',
            price: p1Price,
            quantity: 1,
            totalPrice: p1Price,
            modifiers: [
              { groupName: 'Luxury Keepsake Packaging', optionName: 'Complimentary Garment Cover', priceDelta: 0 },
            ],
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: null, newStatus: 'PENDING', comment: 'Order placed by customer, awaiting gateway confirmation' },
        ],
      },
    },
  });
  orders.push(order1);

  // --------------------------------------------------------------------------
  // ORDER 2: PROCESSING Order (Paid via Stripe, preparing in Atelier)
  // --------------------------------------------------------------------------
  const prod2 = products[34]; // Imperial Crimson Kanjivaram Silk Saree
  const var2 = await prisma.productVariant.findFirst({ where: { productId: prod2.id } });
  const p2Price = Number(var2.salePrice ?? var2.regularPrice);
  const p2Shipping = 0; // Free shipping over ₹2999
  const p2Total = p2Price;

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-B202',
      userId: cust2.id,
      customerName: cust2.name,
      customerEmail: cust2.email,
      customerPhone: cust2.phone,
      subtotal: p2Price,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: p2Shipping,
      totalAmount: p2Total,
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'STRIPE',
      shippingAddress: addr2,
      billingAddress: addr2,
      notes: 'Please pack in luxury keepsake box',
      internalAdminNotes: 'Confirmed by Atelier Team. Cutting & blouse tailoring in progress.',
      items: {
        create: [
          {
            productId: prod2.id,
            variantId: var2.id,
            title: prod2.name,
            sku: var2.sku,
            size: 'Free Size',
            color: 'Crimson Red',
            price: p2Price,
            quantity: 1,
            totalPrice: p2Price,
            modifiers: [
              { groupName: 'Luxury Keepsake Packaging', optionName: 'Velvet Signature Keepsake Gift Box', priceDelta: 450 },
            ],
          },
        ],
      },
      payments: {
        create: [
          {
            gateway: 'STRIPE',
            transactionId: 'pi_3MtwLwLkdIwHu7ix28a3tqZ9',
            amount: p2Total,
            status: 'COMPLETED',
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: null, newStatus: 'PENDING', comment: 'Order placed' },
          { previousStatus: 'PENDING', newStatus: 'CONFIRMED', comment: 'Stripe payment captured' },
          { previousStatus: 'CONFIRMED', newStatus: 'PROCESSING', comment: 'Assigned to Master Weaver for QC' },
        ],
      },
    },
  });
  orders.push(order2);

  // --------------------------------------------------------------------------
  // ORDER 3: SHIPPED Order (Paid via Direct UPI QR with UTR, in transit BlueDart)
  // --------------------------------------------------------------------------
  const prod3 = products[78]; // Bespoke Navy Tailored Linen Suit
  const var3 = await prisma.productVariant.findFirst({ where: { productId: prod3.id } });
  const p3Price = Number(var3.salePrice ?? var3.regularPrice);
  const p3Shipping = 0;
  const p3Total = p3Price;

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-C303',
      userId: cust3.id,
      customerName: cust3.name,
      customerEmail: cust3.email,
      customerPhone: cust3.phone,
      subtotal: p3Price,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: p3Shipping,
      totalAmount: p3Total,
      status: 'SHIPPED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'UPI_QR',
      upiReference: '987654321012',
      shippingAddress: addr3,
      billingAddress: addr3,
      courierPartner: 'BlueDart Express',
      trackingNumber: 'BD-88992211',
      shippedAt: new Date(Date.now() - 86400000 * 2),
      estimatedDelivery: new Date(Date.now() + 86400000 * 1),
      notes: 'Deliver between 10am to 5pm at office reception',
      internalAdminNotes: 'UPI UTR verified by Accounts Dept.',
      items: {
        create: [
          {
            productId: prod3.id,
            variantId: var3.id,
            title: prod3.name,
            sku: var3.sku,
            size: 'L',
            color: 'Peacock Navy Blue',
            price: p3Price,
            quantity: 1,
            totalPrice: p3Price,
          },
        ],
      },
      payments: {
        create: [
          {
            gateway: 'UPI_QR',
            transactionId: 'UPI-987654321012',
            amount: p3Total,
            status: 'COMPLETED',
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: null, newStatus: 'PENDING', comment: 'UPI payment submitted with UTR: 987654321012' },
          { previousStatus: 'PENDING', newStatus: 'CONFIRMED', comment: 'Payment verified manually by finance' },
          { previousStatus: 'CONFIRMED', newStatus: 'PROCESSING', comment: 'Quality check completed' },
          { previousStatus: 'PROCESSING', newStatus: 'PACKED', comment: 'Packed in bespoke suiting bag' },
          { previousStatus: 'PACKED', newStatus: 'SHIPPED', comment: 'Handed over to BlueDart courier, AWB: BD-88992211' },
        ],
      },
    },
  });
  orders.push(order3);

  // --------------------------------------------------------------------------
  // ORDER 4: DELIVERED Order (Cash on delivery, verified delivery Delhivery)
  // --------------------------------------------------------------------------
  const prod4 = products[7]; // Elysian Emerald Silk Evening Gown
  const var4 = await prisma.productVariant.findFirst({ where: { productId: prod4.id } });
  const p4Price = Number(var4.salePrice ?? var4.regularPrice);
  const p4Shipping = 0;
  const p4Total = p4Price;

  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-D404',
      userId: cust1.id,
      customerName: cust1.name,
      customerEmail: cust1.email,
      customerPhone: cust1.phone,
      subtotal: p4Price,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: p4Shipping,
      totalAmount: p4Total,
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'COD',
      shippingAddress: addr1,
      billingAddress: addr1,
      courierPartner: 'Delhivery Logistics',
      trackingNumber: 'DL-44332211',
      shippedAt: new Date(Date.now() - 86400000 * 5),
      deliveredAt: new Date(Date.now() - 86400000 * 1),
      notes: 'Ring bell twice upon arrival',
      internalAdminNotes: 'COD cash collected by courier partner and reconciled.',
      items: {
        create: [
          {
            productId: prod4.id,
            variantId: var4.id,
            title: prod4.name,
            sku: var4.sku,
            size: 'M',
            color: 'Emerald Green',
            price: p4Price,
            quantity: 1,
            totalPrice: p4Price,
            modifiers: [
              { groupName: 'Luxury Keepsake Packaging', optionName: 'Velvet Signature Keepsake Gift Box', priceDelta: 450 },
            ],
          },
        ],
      },
      payments: {
        create: [
          {
            gateway: 'COD',
            transactionId: 'COD-CASH-RECVD',
            amount: p4Total,
            status: 'COMPLETED',
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: null, newStatus: 'PENDING', comment: 'Order placed via COD' },
          { previousStatus: 'PENDING', newStatus: 'CONFIRMED', comment: 'Customer confirmed phone verification' },
          { previousStatus: 'CONFIRMED', newStatus: 'PROCESSING', comment: 'Garment steaming and finishing' },
          { previousStatus: 'PROCESSING', newStatus: 'PACKED', comment: 'Sealed with tamper evident luxury tape' },
          { previousStatus: 'PACKED', newStatus: 'SHIPPED', comment: 'Dispatched via Delhivery, AWB: DL-44332211' },
          { previousStatus: 'SHIPPED', newStatus: 'OUT_FOR_DELIVERY', comment: 'Out for delivery in Bangalore' },
          { previousStatus: 'OUT_FOR_DELIVERY', newStatus: 'DELIVERED', comment: 'Delivered to customer, cash collected' },
        ],
      },
    },
  });
  orders.push(order4);

  // Add 1 verified review from Priya for the delivered gown
  await prisma.review.create({
    data: {
      productId: prod4.id,
      userId: cust1.id,
      orderId: order4.id,
      rating: 5,
      title: 'Breathtaking craftsmanship & royal drape!',
      comment: 'The Mulberry silk quality exceeded all my expectations. The hand-boned corset fit like a dream, and the velvet gift box made unboxing feel like haute couture fashion week. Will definitely order again!',
      fitFeedback: 'TRUE_TO_SIZE',
      isVerifiedPurchase: true,
      status: 'APPROVED',
      helpfulCount: 14,
      adminReply: 'Thank you Priya for your gracious words! It was our pleasure crafting this piece for you.',
      adminReplyAt: new Date(),
    },
  });

  const totalOrdersCount = await prisma.order.count();
  console.log(`✅ [ORDERS] Successfully seeded exactly ${totalOrdersCount} orders across PENDING, PROCESSING, SHIPPED, and DELIVERED states.`);
  return orders;
};

// --------------------------------------------------------------------------
// 7. STORE SETTINGS AND PROMOTIONAL COUPONS SEEDING
// --------------------------------------------------------------------------
export const seedStoreSettingsAndCoupons = async () => {
  console.log('⚙️ [SETTINGS] Seeding store configuration and active coupons...');

  await prisma.storeConfig.create({
    data: {
      id: 'default_store_config',
      storeName: 'Maison De Élégance',
      tagline: 'Haute Couture & Bespoke Eveningwear',
      currency: 'INR',
      currencySymbol: '₹',
      supportEmail: 'concierge@maisondeelegance.com',
      supportPhone: '+91 98765 43210',
      activeTheme: 'luxury-fashion',
      freeShippingThreshold: 2999,
      flatShippingRate: 150,
      featuresJson: {
        wishlistEnabled: true,
        reviewsEnabled: true,
        multiCurrency: false,
        guestCheckout: true,
        couponsEnabled: true,
        catalystModifiers: true,
      },
      paymentMethodsJson: {
        razorpay: true,
        stripe: true,
        cod: true,
        upi_qr: true,
      },
    },
  });

  // Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: 'Enjoy 10% off on your first luxury order',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderAmount: 2500,
        maxDiscountAmount: 2000,
        startDate: new Date(Date.now() - 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 365),
        usageLimit: 1000,
        isActive: true,
      },
      {
        code: 'ROYAL500',
        description: 'Flat ₹500 off on festive collection purchases over ₹5,000',
        discountType: 'FIXED',
        discountValue: 500,
        minOrderAmount: 5000,
        maxDiscountAmount: 500,
        startDate: new Date(Date.now() - 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 180),
        usageLimit: 500,
        isActive: true,
      },
    ],
  });

  console.log('✅ [SETTINGS] Store configuration and promotional coupons seeded.');
};

// --------------------------------------------------------------------------
// MAIN ORCHESTRATOR
// --------------------------------------------------------------------------
export const runSeed = async () => {
  console.log('================================================================');
  console.log('🚀 [SEED] Commencing Database Reset & Complete Ecommerce Seeding');
  console.log('================================================================');

  const startTime = Date.now();

  try {
    // 1. Reset database
    await resetDatabase();

    // 2. Configure Super Admin
    await seedSuperAdmin();

    // 3. Seed Category Hierarchy
    const categories = await seedCategories();

    // 4. Seed Attributes & Values
    const attributes = await seedAttributes();

    // 5. Seed 110 Products
    const products = await seedProducts(categories, attributes);

    // 6. Seed Customers & 4 Orders
    await seedCustomersAndOrders(products);

    // 7. Store Settings & Coupons
    await seedStoreSettingsAndCoupons();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('================================================================');
    console.log(`✨ [SUCCESS] Database Reset & Seeding Completed in ${elapsed}s!`);
    console.log('================================================================');
  } catch (error) {
    console.error('❌ [FATAL] Seeding failed with error:', error);
    throw error;
  }
};

// Execute if run directly
runSeed()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
