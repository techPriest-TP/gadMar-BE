# GadMar Backend

NestJS API for GadMar, a Nigerian gadget marketplace connecting customers with verified gadget brands.

The MVP supports product and brand discovery, WhatsApp purchase intents, purchase tracking, rewards, commissions, authentication, email OTPs, and notifications. Payments are completed outside GadMar through WhatsApp in MVP 1.

## Technology

- NestJS 11
- Prisma 7
- MongoDB
- Passport and JWT authentication
- Agenda for queued email delivery
- Firebase Cloud Messaging for notifications
- Cloudinary for media uploads

## Requirements

- Node.js
- Yarn
- MongoDB

## Setup

```bash
yarn install
```

Create a `.env` file and provide the application, authentication, database, email, Google OAuth, Firebase, and Cloudinary values required by the enabled modules.

The main MongoDB connection and the Agenda email worker both use `DATABASE_URL`.

Required variables:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
POSTMARK_URL
POSTMARK_TOKEN
POSTMARK_FROM_EMAIL
```

`JWT_SECRET` and `JWT_REFRESH_SECRET` must each contain at least 32 characters. Google OAuth, Firebase, Cloudinary, CORS, and other integration variables are optional until their respective features are enabled.

Google OAuth requires all three values before its routes become available:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CLIENT_CALLBACK_URL
```

If they are absent, Google OAuth endpoints return `503 Service Unavailable`. If `FIREBASE_CONFIG` is absent, push notifications remain disabled while the rest of the API continues to start.

Generate Prisma Client:

```bash
yarn prisma generate
```

## Running the application

```bash
# Development
yarn start:dev

# Production build
yarn build
yarn start:prod
```

## Render development deployment

The repository includes a `render.yaml` Blueprint for a free Render web
service. It does not configure a cron job or an external keep-alive service.

1. Push the repository to your Git provider.
2. In Render, create a new Blueprint and select this repository.
3. Provide the environment variables marked as requiring manual values.
4. Deploy the `gadmar-api` service.

Render runs these commands:

```bash
yarn install && yarn build
yarn start:prod
```

The build generates Prisma Client before compiling NestJS. The application
binds to Render's `PORT` on `0.0.0.0`.

After deployment:

```text
Health:  https://<service-name>.onrender.com/api/v1/health
Swagger: https://<service-name>.onrender.com/api/docs
API:     https://<service-name>.onrender.com/api/v1
```

Required Render variables:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
POSTMARK_URL
POSTMARK_TOKEN
POSTMARK_FROM_EMAIL
```

Set `FRONTEND_URL` to the frontend origin allowed by CORS. `DATABASE_URL`
must point to a reachable MongoDB deployment. Render's free filesystem is
ephemeral, so uploaded media must remain in external storage such as
Cloudinary.

The free web service can sleep during inactivity and Render can restart it.
Agenda stores queued email jobs in MongoDB and now shuts down cleanly when
the NestJS process receives a termination signal.

## Verification

```bash
yarn lint
yarn test
yarn test:e2e
```

Some integration tests require a reachable MongoDB database and the corresponding environment variables.

## Source structure

```text
src/
  auth/                Authentication, OAuth, passwords, and OTPs
  user/                Customer and account management
  brand/               Gadget brands
  product/             Gadget listings
  transaction-intent/  WhatsApp purchase tracking
  reward/              Customer rewards
  commission/          Brand commission records
  analytics/           Marketplace reporting
  activity-log/        Operational activity records
  notification/        User notifications
  email/               Email delivery and templates
  queue/               Agenda email queue
  common/              Shared guards, decorators, and integrations
```

## MVP boundary

GadMar does not process customer payments in MVP 1. A purchase intent and reference code are created before the customer continues the purchase conversation with a verified brand on WhatsApp.
