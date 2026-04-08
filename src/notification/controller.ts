import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import type { RequestUser } from 'src/common/decorators/user.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { NotificationService } from './service';
import { BroadCastDTO, RegisterTokenDTO, UnRegisterTokenDTO } from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  /**
   * MOBILE: Register device for push notifications
   */
  @Post('register-token')
  // @UseGuards(JwtAuthGuard) // Ensure you know which user this is
  async registerToken(
    @CurrentUser() req: RequestUser,
    @Body() body: RegisterTokenDTO,
  ) {
    return this.service.saveToken(req.id, body.token, body.deviceType);
  }

  /**
   * ADMIN: Send broadcast to all users
   */
  //   @Roles('ADMIN') // Assuming you have a role-based guard
  @Post('broadcast')
  async broadcast(@Body() body: BroadCastDTO) {
    return this.service.sendBroadcast(body.title, body.message);
  }

  /**
   * MOBILE: Remove token on logout
   */
  @Delete('unregister-token')
  @UseGuards(AuthGuard('jwt'))
  async unregisterToken(@Body() body: UnRegisterTokenDTO) {
    return this.service.deleteToken(body.token);
  }

  /**
   * MOBILE: Get the count for the Red Box/Badge on the Bell Icon
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.service.getUnreadCount(user.id);
    return { unreadCount: count };
  }

  /**
   * MOBILE: Get notification history for the inbox
   */
  @Get('my-notifications')
  async getNotifications(@CurrentUser() user: RequestUser) {
    console.log({ user });
    return this.service.getMyNotifications(user.id);
  }

  /**
   * MOBILE: Mark a specific notification as read and clear the bell badge
   */
  @Patch(':id/read')
  async markRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.markAsRead(user.id, notificationId);
  }
}
