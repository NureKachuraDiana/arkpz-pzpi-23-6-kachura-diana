import {Injectable, UnauthorizedException} from '@nestjs/common';
import {UpdateSettingDto} from './dto/update-setting.dto';
import {SessionService} from "../session/session.service";
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(
      private prisma: PrismaService,
      private sessionService: SessionService,
  ) {}

  async update(token: string, updateSettingDto: UpdateSettingDto) {
    const session = await this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    const {
      language,
      measurementUnit,
      emailNotifications,
      notificationsEnabled,
      pushNotifications,
      smsNotifications,
      darkModeEnabled
    } = updateSettingDto

    return this.prisma.userPreferences.update({
      where: {userId: session.user.id},
      data: {
        // Only update fields that were sent
        ...(language !== undefined && {language}),
        ...(measurementUnit !== undefined && {measurementUnit}),
        ...(emailNotifications !== undefined && {emailNotifications}),
        ...(notificationsEnabled !== undefined && {notificationsEnabled}),
        ...(pushNotifications !== undefined && {pushNotifications}),
        ...(smsNotifications !== undefined && {smsNotifications}),
        ...(darkModeEnabled !== undefined && {darkModeEnabled}),
      }
    });

  }

  async get(token: string) {
    const session = await this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    return this.prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });
  }

  async create(userId: number){
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      await this.prisma.userPreferences.create({
        data: { userId },
      });
    }
    return 0;
  }

}
