import { PrismaClient, UserRole, TransactionStatus, RewardStatus, RewardType, ActivityType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.commission.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.transactionIntent.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
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
      name: 'Brand Owner',
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
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+2348034567890',
      password: userPassword,
      role: UserRole.USER,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
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
      logo: 'https://example.com/apple-logo.png',
      about: 'Premium technology products including iPhones, MacBooks, and accessories.',
      phone: '+2348011111111',
      whatsappLink: 'https://wa.me/2348011111111',
      email: 'support@apple.com',
      isFeatured: true,
      featuredUntil: new Date('2025-12-31'),
      commissionRate: 5.0,
      ownerId: brandOwner.id,
    },
  });

  const samsung = await prisma.brand.create({
    data: {
      name: 'Samsung',
      logo: 'https://example.com/samsung-logo.png',
      about: 'Leading electronics brand with smartphones, tablets, and home appliances.',
      phone: '+2348022222222',
      whatsappLink: 'https://wa.me/2348022222222',
      email: 'support@samsung.com',
      isFeatured: true,
      commissionRate: 4.5,
    },
  });

  const sony = await prisma.brand.create({
    data: {
      name: 'Sony',
      logo: 'https://example.com/sony-logo.png',
      about: 'High-quality electronics, gaming, and entertainment products.',
      phone: '+2348033333333',
      whatsappLink: 'https://wa.me/2348033333333',
      email: 'support@sony.com',
      isFeatured: false,
      commissionRate: 6.0,
    },
  });
  console.log('✅ Created brands');

  // Create products
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'iPhone 15 Pro Max',
        description: 'Latest iPhone with A17 Pro chip, 256GB storage, Titanium design.',
        price: 1500000,
        images: ['https://example.com/iphone15-1.jpg', 'https://example.com/iphone15-2.jpg'],
        category: 'Smartphones',
        brandId: apple.id,
        isActive: true,
      },
      {
        name: 'MacBook Pro 16" M3',
        description: 'Powerful laptop with M3 chip, 16GB RAM, 512GB SSD.',
        price: 2500000,
        images: ['https://example.com/macbook-1.jpg', 'https://example.com/macbook-2.jpg'],
        category: 'Laptops',
        brandId: apple.id,
        isActive: true,
      },
      {
        name: 'AirPods Pro 2',
        description: 'Premium wireless earbuds with active noise cancellation.',
        price: 250000,
        images: ['https://example.com/airpods-1.jpg'],
        category: 'Accessories',
        brandId: apple.id,
        isActive: true,
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Flagship smartphone with S Pen, 200MP camera, AI features.',
        price: 1400000,
        images: ['https://example.com/s24-1.jpg', 'https://example.com/s24-2.jpg'],
        category: 'Smartphones',
        brandId: samsung.id,
        isActive: true,
      },
      {
        name: 'Samsung Galaxy Tab S9',
        description: 'Premium Android tablet with S Pen included.',
        price: 800000,
        images: ['https://example.com/tabs9-1.jpg'],
        category: 'Tablets',
        brandId: samsung.id,
        isActive: true,
      },
      {
        name: 'Sony WH-1000XM5',
        description: 'Industry-leading noise canceling headphones.',
        price: 350000,
        images: ['https://example.com/sony-headphones-1.jpg'],
        category: 'Accessories',
        brandId: sony.id,
        isActive: true,
      },
      {
        name: 'PlayStation 5',
        description: 'Next-gen gaming console with ultra-high speed SSD.',
        price: 600000,
        images: ['https://example.com/ps5-1.jpg', 'https://example.com/ps5-2.jpg'],
        category: 'Gaming',
        brandId: sony.id,
        isActive: true,
      },
    ],
  });
  console.log('✅ Created products:', products.count);

  // Get created products for transaction creation
  const createdProducts = await prisma.product.findMany();

  // Create transaction intents
  const transactions = await Promise.all([
    prisma.transactionIntent.create({
      data: {
        userId: user1.id,
        productId: createdProducts[0].id,
        brandId: apple.id,
        status: TransactionStatus.COMPLETED,
        refCode: 'TXN-A1B2C3',
        amount: 1500000,
        commission: 75000,
        completedAt: new Date(),
      },
    }),
    prisma.transactionIntent.create({
      data: {
        userId: user1.id,
        productId: createdProducts[1].id,
        brandId: apple.id,
        status: TransactionStatus.COMPLETED,
        refCode: 'TXN-D4E5F6',
        amount: 2500000,
        commission: 125000,
        completedAt: new Date(),
      },
    }),
    prisma.transactionIntent.create({
      data: {
        userId: user1.id,
        productId: createdProducts[3].id,
        brandId: samsung.id,
        status: TransactionStatus.COMPLETED,
        refCode: 'TXN-G7H8I9',
        amount: 1400000,
        commission: 63000,
        completedAt: new Date(),
      },
    }),
    prisma.transactionIntent.create({
      data: {
        userId: user2.id,
        productId: createdProducts[0].id,
        brandId: apple.id,
        status: TransactionStatus.PENDING,
        refCode: 'TXN-J0K1L2',
        amount: 1500000,
      },
    }),
    prisma.transactionIntent.create({
      data: {
        userId: user2.id,
        productId: createdProducts[6].id,
        brandId: sony.id,
        status: TransactionStatus.PENDING,
        refCode: 'TXN-M3N4O5',
        amount: 600000,
      },
    }),
  ]);
  console.log('✅ Created transaction intents:', transactions.length);

  // Create rewards
  const rewards = await Promise.all([
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.PURCHASE_STREAK,
        amount: 3000,
        status: RewardStatus.CLAIMED,
        description: '3 purchase streak reward',
        claimedAt: new Date(),
      },
    }),
    prisma.reward.create({
      data: {
        userId: user1.id,
        type: RewardType.PURCHASE_STREAK,
        amount: 3000,
        status: RewardStatus.PENDING,
        description: '6 purchase streak reward',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.reward.create({
      data: {
        userId: user2.id,
        type: RewardType.LOYALTY,
        amount: 1000,
        status: RewardStatus.PENDING,
        description: 'Welcome loyalty reward',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  console.log('✅ Created rewards:', rewards.length);

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
  const commissions = await Promise.all([
    prisma.commission.create({
      data: {
        transactionId: transactions[0].id,
        brandId: apple.id,
        amount: 75000,
        rate: 5.0,
        status: 'PAID',
        paidAt: new Date(),
      },
    }),
    prisma.commission.create({
      data: {
        transactionId: transactions[1].id,
        brandId: apple.id,
        amount: 125000,
        rate: 5.0,
        status: 'PENDING',
      },
    }),
    prisma.commission.create({
      data: {
        transactionId: transactions[2].id,
        brandId: samsung.id,
        amount: 63000,
        rate: 4.5,
        status: 'PENDING',
      },
    }),
  ]);
  console.log('✅ Created commissions:', commissions.length);

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
