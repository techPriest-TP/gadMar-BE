import * as admin from 'firebase-admin';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Check if Firebase is already initialized to prevent the [DEFAULT] error
    if (admin.apps.length > 0) {
      return;
    }

    const rawConfig = process.env.FIREBASE_CONFIG;

    if (!rawConfig) {
      this.logger.warn('FIREBASE_CONFIG is missing; push notifications are disabled');
      return;
    }

    try {
      // 1. Scrub the string of PowerShell/Terminal "gremlins"
      const match = rawConfig.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No valid JSON object found');

      const firebaseConfig = JSON.parse(match[0]);

      // 2. Fix the private key newline escape characters
      if (firebaseConfig.private_key) {
        firebaseConfig.private_key = firebaseConfig.private_key.replace(
          /\\n/g,
          '\n',
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });

      this.logger.log('Firebase Admin initialized');
    } catch (error: any) {
      this.logger.error('Firebase initialization failed', error.message);
    }
  }
  // Inside your AuthService
  async authenticateWithFirebase(idToken: string) {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const {
      uid,
      email,
      name: providerName,
      email_verified,
      firebase,
    } = decodedToken;

    const provider = firebase?.sign_in_provider; // 'google.com', 'apple.com', 'password'

    if (!email) {
      throw new UnauthorizedException('Account has no email');
    }

    if (!email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    const nameParts = providerName?.trim().split(/\s+/) ?? [];
    const firstName = nameParts.shift() || 'Firebase';
    const lastName = nameParts.join(' ') || 'User';

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { authProviders: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          isVerified: true,
          authProviders: {
            create: {
              provider: this.mapProvider(provider),
              providerId: uid,
            },
          },
        },
        include: { authProviders: true },
      });

      return user;
    }

    const mappedProvider = this.mapProvider(provider);

    const existingProvider = user.authProviders.find(
      (p) => p.provider === mappedProvider,
    );

    if (!existingProvider) {
      // Link provider
      await this.prisma.authProvider.create({
        data: {
          provider: mappedProvider,
          providerId: uid,
          userId: user.id,
        },
      });
    } else {
      if (existingProvider.providerId !== uid) {
        throw new UnauthorizedException(
          `${mappedProvider} account mismatch detected`,
        );
      }
    }

    return user;
  }

  private mapProvider(provider: string) {
    switch (provider) {
      case 'google.com':
        return 'GOOGLE';
      case 'apple.com':
        return 'APPLE';
      case 'password':
        return 'EMAIL';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * BROADCAST: Sends to all users and saves to DB for inbox history
   */
  async sendBroadcast(title: string, body: string) {
    try {
      /**
       * 1️⃣ Persist broadcast in DB first
       */
      const notification = await this.prisma.notification.create({
        data: {
          title,
          body,
          userId: null, // 👈 broadcast
        },
      });

      /**
       * 2️⃣ Fetch device tokens
       */
      const tokens = await this.prisma.userDeviceToken.findMany({
        select: { token: true },
      });

      const tokenList = tokens.map((t) => t.token);

      if (tokenList.length === 0) {
        return {
          message: 'No devices found',
          notificationId: notification.id,
        };
      }

      /**
       * 3️⃣ Send Push
       */
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokenList,
        notification: {
          title,
          body,
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          type: 'ADMIN_BROADCAST',
          notificationId: notification.id, // 👈 important
        },
      });

      /**
       * 4️⃣ Cleanup invalid tokens
       */
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;

          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokenList[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await this.prisma.userDeviceToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
      }

      return {
        notificationId: notification.id,
        total: tokenList.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokensRemoved: invalidTokens.length,
      };
    } catch (error) {
      this.logger.error('Failed to send notification broadcast', error);
      throw error;
    }
  }

  /**
   * TOKEN MANAGEMENT
   */
  async saveToken(userId: string, token: string, deviceType?: string) {
    return this.prisma.userDeviceToken.upsert({
      where: { token: token }, // This works because of your @unique decorator
      update: {
        userId: userId, // Update owner if someone else logs into the same device
        updatedAt: new Date(),
      },
      create: {
        token: token,
        userId: userId,
        deviceType: deviceType,
      },
    });
  }

  async deleteToken(token: string) {
    try {
      return this.prisma.userDeviceToken.delete({
        where: { token },
      });
    } catch (error) {
      throw error;
    }
  }
  //===============================================================================

  /**
   * INBOX HISTORY: Fetches notifications with isRead status
   */
  // async getMyNotifications(userId: string) {
  //   try {
  //     const notifications = await this.prisma.notification.findMany({
  //       where: {
  //         OR: [{ userId: userId }, { userId: null }],
  //       },
  //       include: {
  //         readBy: {
  //           where: { userId: userId },
  //         },
  //       },
  //       orderBy: { createdAt: 'desc' },
  //       take: 20,
  //     });

  //     if (!notifications) {
  //       throw new NotFoundException('notification not found!');
  //     }

  //     console.log({ notifications });

  //     // Map the data so the mobile app gets a simple "isRead" boolean
  //     return notifications.map((n) => ({
  //       id: n.id,
  //       title: n.title,
  //       body: n.body,
  //       createdAt: n.createdAt,
  //       isRead: n.readBy.length > 0,
  //     }));
  //   } catch (error) {
  //     console.log({ error });
  //   }
  // }
  async getMyNotifications(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsLastReadAt: true },
    });

    const notifications = await this.prisma.notification.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        readBy: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return notifications.map((n) => {
      let isRead = false;

      if (n.userId === null) {
        // broadcast
        isRead =
          !!user?.notificationsLastReadAt &&
          n.createdAt <= user.notificationsLastReadAt;
      } else {
        // personal
        isRead = n.readBy.length > 0;
      }

      return {
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        isRead,
      };
    });
  }

  /**
   * MARK READ: Updates the individual notification and the global "Last Read" timestamp
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true, createdAt: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId === null) {
      // Broadcast → update global timestamp
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          notificationsLastReadAt: notification.createdAt,
        },
      });
    } else {
      // Personal → mark individually
      await this.prisma.notificationReadReceipt.upsert({
        where: {
          notificationId_userId: { notificationId, userId },
        },
        update: {},
        create: { notificationId, userId },
      });
    }

    return { success: true };
  }
  // async markAsRead(userId: string, notificationId: string) {
  //   // 1. Mark individual item as read
  //   await this.prisma.notificationReadReceipt.upsert({
  //     where: { notificationId_userId: { notificationId, userId } },
  //     update: {},
  //     create: { notificationId, userId },
  //   });

  //   // 2. Update user's last read timestamp to clear the "Red Box" badge
  //   await this.prisma.user.update({
  //     where: { id: userId },
  //     data: { notificationsLastReadAt: new Date() },
  //   });

  //   return { success: true };
  // }

  /**
   * UNREAD COUNT: Powers the "Red Box" on the Bell Icon
   */
  async getUnreadCount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsLastReadAt: true },
    });

    const lastReadAt = user?.notificationsLastReadAt ?? new Date(0);

    const [broadcastUnread, personalUnread] = await Promise.all([
      // 1️⃣ Broadcast unread
      this.prisma.notification.count({
        where: {
          userId: null,
          createdAt: { gt: lastReadAt },
        },
      }),

      // 2️⃣ Personal unread
      this.prisma.notification.count({
        where: {
          userId,
          readBy: {
            none: {
              userId,
            },
          },
        },
      }),
    ]);

    return broadcastUnread + personalUnread;
  }
  // async getUnreadCount(userId: string) {
  //   const user = await this.prisma.user.findUnique({
  //     where: { id: userId },
  //     select: { notificationsLastReadAt: true },
  //   });

  //   return this.prisma.notification.count({
  //     where: {
  //       AND: [
  //         { OR: [{ userId: userId }, { userId: null }] },
  //         { createdAt: { gt: user?.notificationsLastReadAt ?? new Date(0) } },
  //       ],
  //     },
  //   });
  // }

  //   async markAsRead(userId: string, notificationId: string) {
  //     return this.prisma.notificationReadReceipt.upsert({
  //       where: {
  //         notificationId_userId: { notificationId, userId },
  //       },
  //       update: {}, // Do nothing if already read
  //       create: { notificationId, userId },
  //     });
  //   }
}
