import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Agenda } from '@hokify/agenda';
import { MediaService } from '../media.service';

const CLEANUP_ORPHANED_UPLOADS = 'CLEANUP_ORPHANED_MEDIA_UPLOADS';

@Injectable()
export class CleanupOrphanedUploadsJob implements OnModuleInit {
  private readonly logger = new Logger(CleanupOrphanedUploadsJob.name);

  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly mediaService: MediaService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.agenda.define(CLEANUP_ORPHANED_UPLOADS, async () => {
      const removed = await this.mediaService.cleanupExpiredUploads();
      if (removed > 0) {
        this.logger.log(`Removed ${removed} abandoned media upload(s)`);
      }
    });
    await this.agenda.every('30 minutes', CLEANUP_ORPHANED_UPLOADS);
  }
}
