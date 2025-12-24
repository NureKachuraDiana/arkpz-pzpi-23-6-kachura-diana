import { Module } from '@nestjs/common';
import { UserActivityLogService } from './user-activity-log.service';
import { UserActivityLogController } from './user-activity-log.controller';

@Module({
  controllers: [UserActivityLogController],
  providers: [UserActivityLogService],
})
export class UserActivityLogModule {}
