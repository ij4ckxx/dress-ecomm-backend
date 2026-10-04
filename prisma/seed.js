import prisma from '../src/config/db.js';

export const seedCatalog = async () => {
  console.log('--- Starting Catalog Seed ---');

  // 1. Create Hierarchical Categories (4 Levels)
  console.log('Seeding categories...');
  const women = await prisma.category.upsert({
    where: { slug: 'women' },
    update: {},
    create: {
      name: 'Women',
      slug: 'women',
      description: 'Exclusive luxury collections for women',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      sortOrder: 1,
    },
  });

  const womensCouture = await prisma.category.upsert({
    where: { slug: 'womens-couture' },
    update: {},
    create: {
      name: "Women's Couture",
      slug: 'womens-couture',
      description: 'Haute couture and designer wear for women',
      parentId: women.id,
      sortOrder: 1,
    },
  });

  const dresses = await prisma.category.upsert({
    where: { slug: 'dresses' },
    update: {},
    create: {
      name: 'Dresses',
      slug: 'dresses',
      description: 'Designer dresses and gowns',
      parentId: womensCouture.id,
      sortOrder: 1,
    },
  });

  const eveningGowns = await prisma.category.upsert({
    where: { slug: 'evening-gowns' },
    update: {},
    create: {
      name: 'Evening Gowns',
      slug: 'evening-gowns',
      description: 'Red-carpet ready evening gowns',
      parentId: dresses.id,
      sortOrder: 1,
    },
  });

  const sarees = await prisma.category.upsert({
    where: { slug: 'sarees' },
    update: {},
    create: {
      name: 'Sarees',
      slug: 'sarees',
      description: 'Handwoven and embroidered heritage sarees',
      parentId: womensCouture.id,
      sortOrder: 2,
    },
  });

  const men = await prisma.category.upsert({
    where: { slug: 'men' },
    update: {},
    create: {
      name: 'Men',
      slug: 'men',
      description: 'Luxury menswear and tailored attire',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
      sortOrder: 2,
    },
  });

  const mensApparel = await prisma.category.upsert({
    where: { slug: 'mens-apparel' },
    update: {},
    create: {
      name: "Men's Apparel",
      slug: 'mens-apparel',
      description: 'Tailored suits, blazers, and shirts',
      parentId: men.id,
      sortOrder: 1,
    },
  });

  const mensSuits = await prisma.category.upsert({
    where: { slug: 'mens-suits' },
    update: {},
    create: {
      name: 'Suits & Blazers',
      slug: 'mens-suits',
      description: 'Bespoke suits and tailored blazers',
      parentId: mensApparel.id,
      sortOrder: 1,
    },
  });

  const mensShirts = await prisma.category.upsert({
    where: { slug: 'mens-shirts' },
    update: {},
    create: {
      name: 'Formal & Casual Shirts',
      slug: 'mens-shirts',
      description: 'Crafted premium Egyptian cotton and linen shirts',
      parentId: mensApparel.id,
      sortOrder: 2,
    },
  });

  // 2. Create Dynamic Attributes & Values
  console.log('Seeding attributes & values...');
  const attrColor = await prisma.attribute.upsert({
    where: { slug: 'color' },
    update: {},
    create: { name: 'Color', slug: 'color', isFilterable: true },
  });

  const attrSize = await prisma.attribute.upsert({
    where: { slug: 'size' },
    update: {},
    create: { name: 'Size', slug: 'size', isFilterable: true },
  });

  const attrFabric = await prisma.attribute.upsert({
    where: { slug: 'fabric' },
    update: {},
    create: { name: 'Fabric', slug: 'fabric', isFilterable: true },
  });

  const attrOccasion = await prisma.attribute.upsert({
    where: { slug: 'occasion' },
    update: {},
    create: { name: 'Occasion', slug: 'occasion', isFilterable: true },
  });

  // Values
  const valEmerald = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrColor.id, slug: 'emerald-green' } },
    update: {},
    create: { attributeId: attrColor.id, value: 'Emerald Green', slug: 'emerald-green' },
  });

  const valNavy = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrColor.id, slug: 'navy-blue' } },
    update: {},
    create: { attributeId: attrColor.id, value: 'Navy Blue', slug: 'navy-blue' },
  });

  const valCrimson = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrColor.id, slug: 'crimson-red' } },
    update: {},
    create: { attributeId: attrColor.id, value: 'Crimson Red', slug: 'crimson-red' },
  });

  const valIvory = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrColor.id, slug: 'ivory-white' } },
    update: {},
    create: { attributeId: attrColor.id, value: 'Ivory White', slug: 'ivory-white' },
  });

  const valSmall = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrSize.id, slug: 's' } },
    update: {},
    create: { attributeId: attrSize.id, value: 'S', slug: 's' },
  });

  const valMedium = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrSize.id, slug: 'm' } },
    update: {},
    create: { attributeId: attrSize.id, value: 'M', slug: 'm' },
  });

  const valLarge = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrSize.id, slug: 'l' } },
    update: {},
    create: { attributeId: attrSize.id, value: 'L', slug: 'l' },
  });

  const valSilk = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrFabric.id, slug: 'mulberry-silk' } },
    update: {},
    create: { attributeId: attrFabric.id, value: 'Mulberry Silk', slug: 'mulberry-silk' },
  });

  const valLinen = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrFabric.id, slug: 'organic-linen' } },
    update: {},
    create: { attributeId: attrFabric.id, value: 'Organic Linen', slug: 'organic-linen' },
  });

  const valVelvet = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrFabric.id, slug: 'velvet' } },
    update: {},
    create: { attributeId: attrFabric.id, value: 'Velvet', slug: 'velvet' },
  });

  const valCotton = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrFabric.id, slug: 'pure-cotton' } },
    update: {},
    create: { attributeId: attrFabric.id, value: 'Pure Cotton', slug: 'pure-cotton' },
  });

  const valEvening = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrOccasion.id, slug: 'evening' } },
    update: {},
    create: { attributeId: attrOccasion.id, value: 'Evening', slug: 'evening' },
  });

  const valFestive = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrOccasion.id, slug: 'festive' } },
    update: {},
    create: { attributeId: attrOccasion.id, value: 'Festive', slug: 'festive' },
  });

  const valCasual = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: attrOccasion.id, slug: 'casual' } },
    update: {},
    create: { attributeId: attrOccasion.id, value: 'Casual', slug: 'casual' },
  });

  // 3. Products
  console.log('Seeding products, images, variants, attributes, and modifiers...');

  // Product 1: Evening Gown (Offers, Variants, Modifiers, Images, Dynamic Attributes)
  const gown = await prisma.product.upsert({
    where: { slug: 'elysian-emerald-silk-evening-gown' },
    update: {},
    create: {
      name: 'Elysian Emerald Silk Evening Gown',
      slug: 'elysian-emerald-silk-evening-gown',
      description: 'Handcrafted from 100% pure Mulberry silk with an asymmetric draped silhouette and cowl neckline.',
      brand: 'Maison De Élégance',
      sku: 'MDE-EVE-001',
      categoryId: eveningGowns.id,
      regularPrice: 12500,
      salePrice: 9999,
      offerPrice: 8499,
      stockQuantity: 45,
      isFeatured: true,
      totalSold: 88,
      rating: 4.9,
      reviewCount: 36,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
            altText: 'Emerald Gown Front View',
            isThumbnail: true,
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
            altText: 'Emerald Gown Back View',
            isThumbnail: false,
            sortOrder: 2,
          },
        ],
      },
      attributes: {
        create: [
          { attributeValueId: valSilk.id },
          { attributeValueId: valEvening.id },
          { attributeValueId: valEmerald.id },
        ],
      },
      modifierGroups: {
        create: [
          {
            name: 'Luxury Gift Box',
            isRequired: false,
            options: {
              create: [
                { name: 'Standard Eco Bag', priceDelta: 0, isDefault: true },
                { name: 'Velvet Signature Keepsake Box', priceDelta: 450, isDefault: false },
              ],
            },
          },
          {
            name: 'Custom Tailoring & Hemming',
            isRequired: false,
            options: {
              create: [
                { name: 'Standard Length', priceDelta: 0, isDefault: true },
                { name: 'Custom Floor Hemming (-2 inches)', priceDelta: 200, isDefault: false },
              ],
            },
          },
        ],
      },
    },
  });

  // Variants for Product 1
  const gownVariants = [
    { sku: 'MDE-EVE-001-S', name: 'Emerald / S', regular: 12500, sale: 9999, offer: 8499, sizeId: valSmall.id },
    { sku: 'MDE-EVE-001-M', name: 'Emerald / M', regular: 12500, sale: 9999, offer: 8499, sizeId: valMedium.id },
    { sku: 'MDE-EVE-001-L', name: 'Emerald / L', regular: 13000, sale: 10499, offer: 8999, sizeId: valLarge.id },
  ];

  for (const v of gownVariants) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: gown.id,
        sku: v.sku,
        name: v.name,
        regularPrice: v.regular,
        salePrice: v.sale,
        offerPrice: v.offer,
        stockQuantity: 15,
      },
    });

    await prisma.productVariantAttribute.upsert({
      where: { variantId_attributeValueId: { variantId: variant.id, attributeValueId: v.sizeId } },
      update: {},
      create: { variantId: variant.id, attributeValueId: v.sizeId },
    });

    await prisma.productVariantAttribute.upsert({
      where: { variantId_attributeValueId: { variantId: variant.id, attributeValueId: valEmerald.id } },
      update: {},
      create: { variantId: variant.id, attributeValueId: valEmerald.id },
    });
  }

  // Product 2: Velvet Saree
  const saree = await prisma.product.upsert({
    where: { slug: 'royal-crimson-velvet-saree' },
    update: {},
    create: {
      name: 'Royal Crimson Velvet Saree',
      slug: 'royal-crimson-velvet-saree',
      description: 'Exquisite micro-velvet saree with intricate zardozi golden embroidery along the border.',
      brand: 'Maison De Élégance',
      sku: 'MDE-SAR-002',
      categoryId: sarees.id,
      regularPrice: 8500,
      salePrice: 6800,
      offerPrice: null,
      stockQuantity: 20,
      isFeatured: true,
      totalSold: 120,
      rating: 4.8,
      reviewCount: 45,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
            altText: 'Royal Crimson Velvet Saree',
            isThumbnail: true,
            sortOrder: 1,
          },
        ],
      },
      attributes: {
        create: [
          { attributeValueId: valVelvet.id },
          { attributeValueId: valFestive.id },
          { attributeValueId: valCrimson.id },
        ],
      },
      modifierGroups: {
        create: [
          {
            name: 'Blouse Stitching',
            isRequired: false,
            options: {
              create: [
                { name: 'Unstitched Fabric Piece', priceDelta: 0, isDefault: true },
                { name: 'Custom Standard Stitched Blouse', priceDelta: 990, isDefault: false },
              ],
            },
          },
        ],
      },
    },
  });

  // Product 3: Bespoke Navy Suit (Regular Price Only, No Discount)
  const suit = await prisma.product.upsert({
    where: { slug: 'bespoke-navy-tailored-linen-suit' },
    update: {},
    create: {
      name: 'Bespoke Navy Tailored Linen Suit',
      slug: 'bespoke-navy-tailored-linen-suit',
      description: 'Crafted from breathable organic Irish linen, single-breasted with horn buttons.',
      brand: 'Savile & Co',
      sku: 'SAV-SUIT-003',
      categoryId: mensSuits.id,
      regularPrice: 18000,
      salePrice: null,
      offerPrice: null,
      stockQuantity: 12,
      isFeatured: false,
      totalSold: 45,
      rating: 4.7,
      reviewCount: 18,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
            altText: 'Navy Linen Suit',
            isThumbnail: true,
            sortOrder: 1,
          },
        ],
      },
      attributes: {
        create: [
          { attributeValueId: valLinen.id },
          { attributeValueId: valNavy.id },
          { attributeValueId: valEvening.id },
        ],
      },
    },
  });

  // Product 4: Classic Oxford Cotton Shirt (Bestseller, Simple Add-to-cart ready or sized)
  const shirt = await prisma.product.upsert({
    where: { slug: 'classic-ivory-oxford-cotton-shirt' },
    update: {},
    create: {
      name: 'Classic Ivory Oxford Cotton Shirt',
      slug: 'classic-ivory-oxford-cotton-shirt',
      description: 'Refined 120s two-ply organic cotton shirt with mother-of-pearl buttons.',
      brand: 'Savile & Co',
      sku: 'SAV-SHIRT-004',
      categoryId: mensShirts.id,
      regularPrice: 3200,
      salePrice: 2800,
      offerPrice: 2400,
      stockQuantity: 80,
      isFeatured: true,
      totalSold: 350,
      rating: 4.95,
      reviewCount: 92,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
            altText: 'Ivory Oxford Shirt',
            isThumbnail: true,
            sortOrder: 1,
          },
        ],
      },
      attributes: {
        create: [
          { attributeValueId: valCotton.id },
          { attributeValueId: valIvory.id },
          { attributeValueId: valCasual.id },
        ],
      },
    },
  });

  console.log('--- Catalog Seed Finished Successfully! ---');
};

seedCatalog()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Seed Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
