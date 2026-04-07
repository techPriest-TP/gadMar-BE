import { Agenda } from '@hokify/agenda';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AdminSlotService } from 'src/product-slots/service';
// import { AUTO_SLOT_GENERATOR_JOB } from './job.constants';

export const AUTO_SLOT_GENERATOR_JOB = 'auto-slot-generator';

@Injectable()
export class AutoSlotGeneratorJob implements OnModuleInit {
  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    // private readonly prisma: PrismaService,
    private readonly productSlotService: AdminSlotService,
  ) {}

  async onModuleInit() {
    // Inside your Agenda setup file
    this.agenda.define(
      'CLEAN_OLD_SLOTS',
      async () => {
        await this.productSlotService.cleanOldSlots();
      },
      { lockLifetime: 10 * 60 * 1000 },
    );

    // Run this once every night at 3 AM Lagos time
    await this.agenda.every(
      '0 3 * * *',
      'CLEAN_OLD_SLOTS',
      {},
      { timezone: 'Africa/Lagos' },
    );
  }
}
