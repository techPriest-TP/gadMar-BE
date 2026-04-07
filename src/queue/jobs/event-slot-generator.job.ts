import { Agenda } from '@hokify/agenda';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export const EVENT_SLOT_GENERATOR_JOB = 'event-slot-generator';
// This job generates event slots for recurring events based on their recurrence rules.
@Injectable()
export class EventSlotGeneratorJob implements OnModuleInit {
  private readonly logger = new Logger(EventSlotGeneratorJob.name);

  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.agenda.define(EVENT_SLOT_GENERATOR_JOB, async () => {
      this.logger.log('Starting recurring slot generation...');
      await this.generateRecurringEventSlots();
    });

    // Run every 3 days (72 hours)
    await this.agenda.every('24 hours', EVENT_SLOT_GENERATOR_JOB);
  }

  async generateRecurringEventSlots(specificEventId?: string) {
    const DAYS_AHEAD = 30;
    const events = await this.prisma.event.findMany({
      where: { 
        isActive: true,
        ...(specificEventId && { id: specificEventId })
      },
    });

    for (const event of events) {
      let targetDates: Date[] = [];
      const { hours, minutes } = this.parseEventTime(event.time || '00:00');

      if (event.eventType === 'RECURRING') {
        targetDates = this.resolveRecurrence(
          event.recurrenceRule || '',
          DAYS_AHEAD,
        );
      } else if (
        event.eventType === 'SEASONAL' &&
        event.startDate &&
        event.endDate
      ) {
        targetDates = this.generateSeasonalDates(
          event.startDate,
          event.endDate,
          event.recurrenceRule,
        );
      }

      for (const date of targetDates) {
        // Set the specific time in UTC to match your database strategy
        date.setUTCHours(hours, minutes, 0, 0);

        // Optimization: Use upsert or a unique constraint to prevent duplicates
        // without a separate findFirst call if possible.
        // But with your current setup, findFirst is safe.
        const exists = await this.prisma.eventSlot.findFirst({
          where: {
            eventId: event.id,
            startTime: date,
          },
        });

        if (!exists) {
          await this.prisma.eventSlot.create({
            data: {
              eventId: event.id,
              startTime: date,
              capacity: event.capacity ?? 0,
              available: event.capacity ?? 0,
            },
          });
        }
      }
    }
    this.logger.log('Slot generation complete.');
  }

  private resolveRecurrence(rule: string, daysAhead: number): Date[] {
    const results: Date[] = [];
    const today = new Date();
    // Work in UTC to prevent Fly.io server shifts
    today.setUTCHours(0, 0, 0, 0);

    const weekdays = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);

      const weekdayName = weekdays[date.getUTCDay()];

      if (rule.includes(weekdayName)) {
        if (rule.match(/1st|2nd|3rd|4th|5th/)) {
          const dayOfMonth = date.getUTCDate();
          const ordinal = Math.ceil(dayOfMonth / 7);
          const ordinalStr = this.getOrdinalString(ordinal);

          if (rule.includes(ordinalStr)) {
            results.push(date);
          }
        } else {
          results.push(date);
        }
      }
    }
    return results;
  }

  // ... (keep your parseEventTime and getOrdinalString as they are)

  private generateSeasonalDates(
    start: Date,
    end: Date,
    rule?: string | null,
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);
    const finish = new Date(end);
    finish.setUTCHours(0, 0, 0, 0);

    const weekdays = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    while (current <= finish) {
      const weekdayName = weekdays[current.getUTCDay()];
      if (!rule || rule.trim() === '' || rule.includes(weekdayName)) {
        dates.push(new Date(current));
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private parseEventTime(timeStr: string): { hours: number; minutes: number } {
    // Matches "3:00pm", "03:00 PM", "15:00" etc.
    const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)?/i);
    if (!match) return { hours: 0, minutes: 0 };

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]?.toLowerCase();

    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  private getOrdinalString(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
