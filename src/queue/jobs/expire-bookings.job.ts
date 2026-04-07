import { Agenda } from '@hokify/agenda';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { releaseSlotLock } from 'src/booking/booking.utils';

export const EXPIRE_BOOKINGS_JOB = 'expire-bookings';

@Injectable()
export class ExpireBookingsJob implements OnModuleInit {
  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.agenda.define(EXPIRE_BOOKINGS_JOB, async () => {
      console.log('AUTO SLOT JOB RUNNING FOR EXPIRED BOOKINGS...');
      await this.expiration();
    });

    // Ensure agenda is running (if not already started in provider)
    // await this.agenda.start();

    // Run every 2 minutes
    await this.agenda.every('2 minutes', EXPIRE_BOOKINGS_JOB);
  }

  /**
   * Can be safely called manually:
   *  - expiration() -> expire all overdue
   *  - expiration(bookingId) -> force expire specific booking
   */
  async expiration(bookingId?: string) {
    const now = new Date();

    // Dynamically build OR conditions safely
    const orConditions: any[] = [
      { expiresAt: { lt: now } },
      {
        slots: {
          some: {
            slot: {
              startTime: { lt: now },
            },
          },
        },
      },
    ];

    if (bookingId) {
      orConditions.push({ id: bookingId });
    }

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        OR: orConditions,
      },
      include: {
        slots: {
          include: {
            slot: {
              select: {
                booked: true,
              },
            },
          },
        },
        eventSlot: true,
      },
    });

    if (!expiredBookings.length) {
      return; // nothing to expire
    }

    const bookingIds = expiredBookings.map((b) => b.id);

    await this.prisma.$transaction(
      async (tx) => {
        // Release slot locks first
        for (const booking of expiredBookings) {
          await releaseSlotLock(tx, booking);
        }

        // Bulk update status to reduce DB roundtrips
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { status: 'EXPIRED' },
        });
      },
      {
        maxWait: 10000,
        timeout: 50000,
      },
    );

    console.log(`Expired ${bookingIds.length} booking(s).`);
  }
}
