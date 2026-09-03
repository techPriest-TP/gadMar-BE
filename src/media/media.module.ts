import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { AgendaModule } from '../queue/agenda.module';
import { CleanupOrphanedUploadsJob } from './jobs/cleanup-orphaned-uploads.job';

@Module({
  imports: [CloudinaryModule, AgendaModule],
  controllers: [MediaController],
  providers: [MediaService, CleanupOrphanedUploadsJob],
  exports: [MediaService],
})
export class MediaModule {}
