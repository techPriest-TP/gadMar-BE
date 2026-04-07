import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Agenda } from '@hokify/agenda';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminSlotService } from 'src/product-slots/service';
// import { AUTO_SLOT_GENERATOR_JOB } from './job.constants';

export const AUTO_SLOT_GENERATOR_JOB = 'auto-slot-generator';

@Injectable()
export class AutoSlotGeneratorJob implements OnModuleInit {
  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly prisma: PrismaService,
    private readonly adminSlotService: AdminSlotService,
  ) {}

  async onModuleInit() {
    this.agenda.define(AUTO_SLOT_GENERATOR_JOB, async () => {
      console.log('AUTO SLOT JOB RUNNING FOR PRODUCT...');
      await this.generateSlotsFromActiveConfigs();
    });

    await this.agenda.every('23 hours', AUTO_SLOT_GENERATOR_JOB);
  }

  // private async generateFutureSlots() {
  //   const pricings = await this.prisma.productPricing.findMany({
  //     include: { product: true },
  //   });

  //   const DAYS_AHEAD = 14;
  //   const DEFAULT_CAPACITY = 1;

  //   for (const pricing of pricings) {
  //     for (let i = 0; i < DAYS_AHEAD; i++) {
  //       const slotDate = new Date();
  //       slotDate.setDate(slotDate.getDate() + i);

  //       const exists = await this.prisma.productSlot.findFirst({
  //         where: {
  //           pricingId: pricing.id,
  //           createdAt: {
  //             gte: new Date(slotDate.setHours(0, 0, 0, 0)),
  //             lt: new Date(slotDate.setHours(23, 59, 59, 999)),
  //           },
  //         },
  //       });

  //       if (!exists) {
  //         await this.prisma.productSlot.create({
  //           data: {
  //             productId: pricing.productId,
  //             pricingId: pricing.id,
  //             available: DEFAULT_CAPACITY,
  //           },
  //         });
  //       }
  //     }
  //   }
  // }

  //this guarantees single source of truth
  private async generateSlotsFromActiveConfigs() {
    const configs = await this.prisma.productSlotConfig.findMany({
      where: { isActive: true },
    });

    for (const config of configs) {
      await this.adminSlotService.generateProductSlotsFromConfig(config.id);
    }
  }
}
