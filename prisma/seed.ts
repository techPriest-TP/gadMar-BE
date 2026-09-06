import {
  ActivityType,
  BrandStatus,
  ConfirmationProofStatus,
  CreditWithdrawalStatus,
  NigerianRegion,
  PrismaClient,
  ProductCondition,
  RewardStatus,
  RewardType,
  StockStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.creditWithdrawal.deleteMany();
  await prisma.transactionConfirmationProof.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.transactionIntentItem.deleteMany();
  await prisma.transactionIntent.deleteMany();
  await prisma.purchaseBatch.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gadmar.com',
      phone: '+2348012345678',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create brand owner
  const brandOwnerPassword = await bcrypt.hash('owner123', 10);
  const brandOwner = await prisma.user.create({
    data: {
      firstName: 'Brand',
      lastName: 'Owner',
      email: 'owner@apple.com',
      phone: '+2348098765432',
      password: brandOwnerPassword,
      role: UserRole.BRAND_OWNER,
    },
  });
  console.log('✅ Created brand owner:', brandOwner.email);

  // Create regular users
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+2348034567890',
      password: userPassword,
      role: UserRole.USER,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+2348045678901',
      password: userPassword,
      role: UserRole.USER,
    },
  });
  console.log('✅ Created regular users');

  // Create brands
  const apple = await prisma.brand.create({
    data: {
      name: 'Apple',
      slug: 'apple',
      logo: 'https://example.com/apple-logo.png',
      about:
        'Premium technology products including iPhones, MacBooks, and accessories.',
      phone: '+2348011111111',
      whatsappLink: 'https://wa.me/2348011111111',
      email: 'support@apple.com',
      isFeatured: true,
      featuredUntil: new Date('2027-12-31'),
      verificationStatus: BrandStatus.VERIFIED,
      region: NigerianRegion.SOUTH_WEST,
      state: 'Lagos',
      lga: 'Ikeja',
      nationwideDelivery: true,
      deliveryStates: ['Lagos', 'Ogun', 'Oyo', 'FCT'],
      pickupLocations: ['Ikeja, Lagos'],
      inspectionLocations: ['Ikeja, Lagos'],
      warrantyPolicy: 'Manufacturer warranty applies where available.',
      returnsPolicy: 'Returns are subject to inspection and store policy.',
      commissionRate: 5.0,
      canDirectlyConfirmPurchases: true,
      ownerId: brandOwner.id,
    },
  });

  const samsung = await prisma.brand.create({
    data: {
      name: 'Samsung',
      slug: 'samsung',
      logo: 'https://example.com/samsung-logo.png',
      about:
        'Leading electronics brand with smartphones, tablets, and home appliances.',
      phone: '+2348022222222',
      whatsappLink: 'https://wa.me/2348022222222',
      email: 'support@samsung.com',
      isFeatured: true,
      commissionRate: 4.5,
      canDirectlyConfirmPurchases: false,
      verificationStatus: BrandStatus.VERIFIED,
      region: NigerianRegion.SOUTH_WEST,
      state: 'Lagos',
      nationwideDelivery: true,
      deliveryStates: ['Lagos', 'FCT', 'Rivers'],
    },
  });

  const sony = await prisma.brand.create({
    data: {
      name: 'Sony',
      slug: 'sony',
      logo: 'https://example.com/sony-logo.png',
      about: 'High-quality electronics, gaming, and entertainment products.',
      phone: '+2348033333333',
      whatsappLink: 'https://wa.me/2348033333333',
      email: 'support@sony.com',
      isFeatured: false,
      commissionRate: 6.0,
      canDirectlyConfirmPurchases: false,
      verificationStatus: BrandStatus.VERIFIED,
      region: NigerianRegion.SOUTH_WEST,
      state: 'Lagos',
    },
  });
  console.log('✅ Created brands');

  // Create products
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max',
        description:
          'Latest iPhone with A17 Pro chip, 256GB storage, Titanium design.',
        price: 1500000,
        category: 'Smartphones',
        brandId: apple.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.IN_STOCK,
        stockQuantity: 8,
        rewardEligible: true,
        region: NigerianRegion.SOUTH_WEST,
        state: 'Lagos',
        lga: 'Ikeja',
        nationwideDelivery: true,
        pickupAvailable: true,
        inspectionAvailable: true,
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'MacBook Pro 16" M3',
        slug: 'macbook-pro-16-m3',
        description: 'Powerful laptop with M3 chip, 16GB RAM, 512GB SSD.',
        price: 2500000,
        category: 'Laptops',
        brandId: apple.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.LOW_STOCK,
        stockQuantity: 3,
        rewardEligible: true,
        state: 'Lagos',
        pickupAvailable: true,
        inspectionAvailable: true,
        isActive: true,
      },
      {
        name: 'AirPods Pro 2',
        slug: 'airpods-pro-2',
        description: 'Premium wireless earbuds with active noise cancellation.',
        price: 250000,
        category: 'Accessories',
        brandId: apple.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.IN_STOCK,
        isActive: true,
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        description:
          'Flagship smartphone with S Pen, 200MP camera, AI features.',
        price: 1400000,
        category: 'Smartphones',
        brandId: samsung.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.IN_STOCK,
        rewardEligible: true,
        nationwideDelivery: true,
        isActive: true,
      },
      {
        name: 'Samsung Galaxy Tab S9',
        slug: 'samsung-galaxy-tab-s9',
        description: 'Premium Android tablet with S Pen included.',
        price: 800000,
        category: 'Tablets',
        brandId: samsung.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.IN_STOCK,
        isActive: true,
      },
      {
        name: 'Sony WH-1000XM5',
        slug: 'sony-wh-1000xm5',
        description: 'Industry-leading noise canceling headphones.',
        price: 350000,
        category: 'Accessories',
        brandId: sony.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.IN_STOCK,
        isActive: true,
      },
      {
        name: 'PlayStation 5',
        slug: 'playstation-5',
        description: 'Next-gen gaming console with ultra-high speed SSD.',
        price: 600000,
        category: 'Gaming',
        brandId: sony.id,
        condition: ProductCondition.NEW,
        stockStatus: StockStatus.PREORDER,
        isActive: true,
      },
    ],
  });
  console.log('✅ Created products:', products.count);

  // Get created products for transaction creation
  const createdProducts = await prisma.product.findMany();
  await prisma.productImage.createMany({
    data: createdProducts.map((product) => ({
      productId: product.id,
      publicId: `gadmar/brands/${product.brandId}/products/${product.slug}`,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${product.slug}.jpg`,
      width: 1200,
      height: 1200,
      format: 'jpg',
      bytes: 250000,
      altText: product.name,
      position: 0,
      isPrimary: true,
    })),
  });
  const productsWithImages = await prisma.product.findMany({
    include: { images: { orderBy: { position: 'asc' } } },
  });

  // Create one multi-brand cart batch, split into one intent per brand.
  const seededBatch = await prisma.purchaseBatch.create({
    data: { batchCode: 'BATCH-SEED01', userId: user1.id },
  });
  const seededItems = [productsWithImages[0], productsWithImages[3]];
  const transactions = await Promise.all(
    seededItems.map((product, index) => {
      const brand = product.brandId === apple.id ? apple : samsung;
      const refCode = `GAD-SEED0${index + 1}`;
      const message = `Hi ${brand.name}, I'd like to buy ${product.name}. Reference: ${refCode}`;
      return prisma.transactionIntent.create({
        data: {
          batchId: seededBatch.id,
          userId: user1.id,
          productId: product.id,
          brandId: brand.id,
          status: TransactionStatus.CONFIRMED,
          refCode,
          amount: product.price,
          finalAmount: product.price,
          commission: (product.price * brand.commissionRate) / 100,
          completedAt: new Date(),
          whatsappMessage: message,
          whatsappUrl: `${brand.whatsappLink}?text=${encodeURIComponent(message)}`,
          items: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                productSlug: product.slug,
                productImage: product.images[0]?.secureUrl,
                unitPrice: product.price,
                quantity: 1,
                rewardEligible: product.rewardEligible,
                brandId: brand.id,
                brandName: brand.name,
              },
            ],
          },
        },
      });
    }),
  );
  console.log('✅ Created transaction intents:', transactions.length);

  const pendingBatch = await prisma.purchaseBatch.create({
    data: { batchCode: 'BATCH-SEED02', userId: user1.id },
  });
  const pendingProduct = productsWithImages.find(
    (product) => product.slug === 'macbook-pro-16-m3',
  )!;
  const pendingMessage = `Hi Apple, I'd like to buy ${pendingProduct.name}. Reference: GAD-PENDING01`;
  const pendingIntent = await prisma.transactionIntent.create({
    data: {
      batchId: pendingBatch.id,
      userId: user1.id,
      productId: pendingProduct.id,
      brandId: apple.id,
      status: TransactionStatus.PENDING,
      refCode: 'GAD-PENDING01',
      amount: pendingProduct.price,
      whatsappMessage: pendingMessage,
      whatsappUrl: `${apple.whatsappLink}?text=${encodeURIComponent(pendingMessage)}`,
      items: {
        create: [
          {
            productId: pendingProduct.id,
            productName: pendingProduct.name,
            productSlug: pendingProduct.slug,
            productImage: pendingProduct.images[0]?.secureUrl,
            unitPrice: pendingProduct.price,
            quantity: 1,
            rewardEligible: pendingProduct.rewardEligible,
            brandId: apple.id,
            brandName: apple.name,
          },
        ],
      },
    },
  });

  const proofBatch = await prisma.purchaseBatch.create({
    data: { batchCode: 'BATCH-SEED03', userId: user1.id },
  });
  const proofProduct = productsWithImages.find(
    (product) => product.slug === 'airpods-pro-2',
  )!;
  const proofToken = 'seed-confirmation-token';
  const proofMessage = `Hi Apple, I'd like to buy ${proofProduct.name}. Reference: GAD-PROOF01`;
  const proofIntent = await prisma.transactionIntent.create({
    data: {
      batchId: proofBatch.id,
      userId: user1.id,
      productId: proofProduct.id,
      brandId: apple.id,
      status: TransactionStatus.CONTACTED,
      refCode: 'GAD-PROOF01',
      amount: proofProduct.price,
      confirmationLinkToken: proofToken,
      confirmationLinkFinalAmount: proofProduct.price,
      confirmationLinkGeneratedById: brandOwner.id,
      confirmationLinkGeneratedAt: new Date(),
      confirmationLinkExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      confirmationNote: 'Seeded customer proof review scenario',
      whatsappMessage: proofMessage,
      whatsappUrl: `${apple.whatsappLink}?text=${encodeURIComponent(proofMessage)}`,
      items: {
        create: [
          {
            productId: proofProduct.id,
            productName: proofProduct.name,
            productSlug: proofProduct.slug,
            productImage: proofProduct.images[0]?.secureUrl,
            unitPrice: proofProduct.price,
            quantity: 1,
            rewardEligible: proofProduct.rewardEligible,
            brandId: apple.id,
            brandName: apple.name,
          },
        ],
      },
    },
  });
  await prisma.transactionConfirmationProof.create({
    data: {
      transactionId: proofIntent.id,
      userId: user1.id,
      confirmationLink: `http://localhost:3000/dashboard/purchases/${proofIntent.refCode}/confirm?token=${proofToken}`,
      finalAmount: proofProduct.price,
      status: ConfirmationProofStatus.PENDING,
      note: 'Customer submitted the brand confirmation link after payment.',
    },
  });
  console.log('✅ Created dashboard test purchase states');

  // Create activity logs
  const activities = await Promise.all([
    prisma.activityLog.create({
      data: {
        type: ActivityType.LOGIN,
        userId: user1.id,
        message: 'User logged in',
      },
    }),
    prisma.activityLog.create({
      data: {
        type: ActivityType.PRODUCT_VIEW,
        userId: user1.id,
        productId: createdProducts[0].id,
        brandId: apple.id,
        message: 'Viewed iPhone 15 Pro Max',
      },
    }),
    prisma.activityLog.create({
      data: {
        type: ActivityType.WHATSAPP_CLICK,
        userId: user1.id,
        productId: createdProducts[0].id,
        brandId: apple.id,
        message: 'Clicked WhatsApp for iPhone 15 Pro Max',
      },
    }),
    prisma.activityLog.create({
      data: {
        type: ActivityType.TRANSACTION_COMPLETED,
        userId: user1.id,
        productId: createdProducts[0].id,
        brandId: apple.id,
        message: 'Completed transaction for iPhone 15 Pro Max',
      },
    }),
    prisma.activityLog.create({
      data: {
        type: ActivityType.SEARCH,
        userId: user2.id,
        message: 'Searched for "gaming console"',
      },
    }),
    prisma.activityLog.create({
      data: {
        type: ActivityType.BRAND_VIEW,
        userId: user2.id,
        brandId: sony.id,
        message: 'Viewed Sony brand page',
      },
    }),
  ]);
  console.log('✅ Created activity logs:', activities.length);

  // Create commissions
  const commissions = await Promise.all(
    transactions.map((transaction, index) =>
      prisma.commission.create({
        data: {
          transactionId: transaction.id,
          brandId: transaction.brandId,
          amount: transaction.commission!,
          rate: (transaction.commission! / transaction.amount!) * 100,
          status: index === 0 ? 'PAID' : 'PENDING',
          paidAt: index === 0 ? new Date() : undefined,
        },
      }),
    ),
  );
  console.log('✅ Created commissions:', commissions.length);

  // Create GadMar Credits. Paid commission unlocks available credits; unpaid
  // commission keeps customer credits pending.
  const rewardExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const customerRewardShare = 0.4;
  const availableWithdrawalSeed = 10000;
  const paidWithdrawalSeed = 7000;
  const rewards = await Promise.all([
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.BASE_PURCHASE_CREDIT,
        amount:
          Math.round(commissions[0].amount * customerRewardShare * 100) / 100,
        status: RewardStatus.AVAILABLE,
        description: 'Base GadMar Credits from 40% of paid GadMar commission',
        transactionId: transactions[0].id,
        commissionId: commissions[0].id,
        availableAt: commissions[0].paidAt,
        expiresAt: rewardExpiry,
      },
    }),
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.BASE_PURCHASE_CREDIT,
        amount:
          Math.round(commissions[1].amount * customerRewardShare * 100) / 100,
        status: RewardStatus.PENDING,
        description:
          'Base GadMar Credits pending brand commission reconciliation',
        transactionId: transactions[1].id,
        commissionId: commissions[1].id,
        expiresAt: rewardExpiry,
      },
    }),
    prisma.reward.create({
      data: {
        userId: user2.id,
        type: RewardType.MANUAL_CREDIT,
        amount: 5000,
        status: RewardStatus.AVAILABLE,
        description: 'Manual launch credit for early customer testing',
        availableAt: new Date(),
        expiresAt: rewardExpiry,
      },
    }),
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.MANUAL_CREDIT,
        amount: availableWithdrawalSeed,
        status: RewardStatus.AVAILABLE,
        description: 'Available manual credit for withdrawal testing',
        availableAt: new Date(),
        expiresAt: rewardExpiry,
      },
    }),
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.MANUAL_CREDIT,
        amount: paidWithdrawalSeed,
        status: RewardStatus.WITHDRAWN,
        description: 'Paid withdrawal seed credit',
        availableAt: new Date(),
        claimedAt: new Date(),
        withdrawnAt: new Date(),
        expiresAt: rewardExpiry,
      },
    }),
  ]);
  console.log('✅ Created GadMar Credits:', rewards.length);

  const pendingWithdrawal = await prisma.creditWithdrawal.create({
    data: {
      userId: user1.id,
      amount: 5000,
      status: CreditWithdrawalStatus.PENDING,
      bankName: 'GTBank',
      accountNumber: '0123456789',
      accountName: 'John Doe',
      note: 'Seeded pending withdrawal request',
    },
  });
  await prisma.reward.update({
    where: { id: rewards[3].id },
    data: {
      amount: 5000,
      status: RewardStatus.WITHDRAWAL_REQUESTED,
      withdrawalId: pendingWithdrawal.id,
    },
  });
  await prisma.reward.create({
    data: {
      userId: user1.id,
      type: RewardType.MANUAL_CREDIT,
      amount: 5000,
      status: RewardStatus.AVAILABLE,
      description: 'Remainder from seeded withdrawal reservation',
      availableAt: new Date(),
      expiresAt: rewardExpiry,
    },
  });

  const approvedWithdrawal = await prisma.creditWithdrawal.create({
    data: {
      userId: user2.id,
      amount: 5000,
      status: CreditWithdrawalStatus.APPROVED,
      bankName: 'Access Bank',
      accountNumber: '0987654321',
      accountName: 'Jane Smith',
      note: 'Seeded approved withdrawal request',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: 'Approved for payout testing',
    },
  });
  await prisma.reward.update({
    where: { id: rewards[2].id },
    data: {
      status: RewardStatus.WITHDRAWAL_REQUESTED,
      withdrawalId: approvedWithdrawal.id,
    },
  });

  const paidWithdrawal = await prisma.creditWithdrawal.create({
    data: {
      userId: user1.id,
      amount: paidWithdrawalSeed,
      status: CreditWithdrawalStatus.PAID,
      bankName: 'Zenith Bank',
      accountNumber: '1111222233',
      accountName: 'John Doe',
      note: 'Seeded paid withdrawal request',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: 'Paid during seed setup',
      paidById: admin.id,
      paidAt: new Date(),
      paymentReference: 'SEED-PAID-001',
    },
  });
  await prisma.reward.update({
    where: { id: rewards[4].id },
    data: { withdrawalId: paidWithdrawal.id },
  });
  console.log('✅ Created withdrawal scenarios: pending, approved, paid');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\nTest Accounts:');
  console.log('  Admin: admin@gadmar.com / admin123');
  console.log('  Brand Owner: owner@apple.com / owner123');
  console.log('  User: john@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
