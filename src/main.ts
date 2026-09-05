import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { setServers } from 'node:dns';
import { AppModule } from './app.module';

async function bootstrap() {
  const dnsServers = process.env.DNS_SERVERS?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers?.length) setServers(dnsServers);

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin:
      configService.get<string>('CORS_ORIGIN') ||
      configService.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GadMar API')
    .setDescription('API for the GadMar multi-brand gadget marketplace')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'Account, login, password, OTP, and OAuth endpoints')
    .addTag('Public Website', 'Guest-facing browsing, storefront, WhatsApp, and purchase-intent endpoints')
    .addTag('Customer Dashboard', 'Customer profile, purchase tracking, credits, and activity endpoints')
    .addTag('Brand Owner Dashboard', 'Brand-owned stores, products, purchase intents, commissions, and analytics endpoints')
    .addTag('Super Admin Dashboard', 'Platform administration, verification, moderation, reconciliation, and reporting endpoints')
    .addTag('Media Uploads', 'Direct image upload authorization and Cloudinary webhook endpoints')
    .addTag('System', 'Health and infrastructure endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 4500);
  await app.listen(port, '0.0.0.0');

  logger.log(`GadMar API is running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

void bootstrap();
