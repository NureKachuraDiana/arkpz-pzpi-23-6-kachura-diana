import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationFromTemplateDto } from './dto/create-notification-from-template.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { Notification} from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        private settingsService: SettingsService,
    ) {}

    /**
     * Create a new notification for a user
     */
    async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
        const { userId, title, message, type, priority, expiresAt } = createNotificationDto;

        // Verify user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                priority,
                expiresAt,
            },
        });

        // @todo: Implement notification sending to different channels
        // This will be implemented when channel services are ready
        console.log(`Notification created for user ${userId}: ${title}`);

        return notification;
    }

    /**
     * Create notification from template
     */
    async createFromTemplate(
        createTemplateDto: CreateNotificationFromTemplateDto,
        token?: string,
    ): Promise<Notification> {
        const { userId, type, language, priority, variables = {} } = createTemplateDto;

        // Verify user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // Determine language - use provided, user preference, or default
        let userLanguage = language || 'uk';
        if (!userLanguage && token) {
            try {
                const userPreferences = await this.settingsService.get(token);
                userLanguage = userPreferences?.language || 'uk';
            } catch (error) {
                // If settings service fails, use default
                userLanguage = 'uk';
            }
        }

        // Find template
        const template = await this.prisma.notificationTemplate.findUnique({
            where: {
                type_language: {
                    type,
                    language: userLanguage,
                },
            },
        });

        if (!template) {
            throw new NotFoundException(
                `Notification template for type ${type} and language ${userLanguage} not found`,
            );
        }

        // Replace template variables
        let title = template.title;
        let message = template.message;

        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = variables[key]?.toString() || '';
            title = title.replace(new RegExp(placeholder, 'g'), value);
            message = message.replace(new RegExp(placeholder, 'g'), value);
        });

        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                priority,
            },
        });

        // @todo: Implement notification sending to different channels
        console.log(`Notification from template created for user ${userId}: ${title}`);

        return notification;
    }

    /**
     * Get notifications for authenticated user - MAIN FUNCTIONALITY
     */
    async getUserNotifications(userId: number) {
        const notifications = await this.prisma.notification.findMany({
            where: {
                userId: userId
            }
        })
        return notifications;
    }

    /**
     * Mark notifications as read
     */
    async markAsRead(userId: number, markAsReadDto: MarkAsReadDto): Promise<{ count: number }> {
        const { notificationIds } = markAsReadDto;

        const where: any = {
            userId,
            isRead: false,
        };

        if (notificationIds && notificationIds.length > 0) {
            where.id = { in: notificationIds };
        }

        const result = await this.prisma.notification.updateMany({
            where,
            data: {
                isRead: true,
            },
        });

        return { count: result.count };
    }

    /**
     * Get notification by ID
     */
    async findOne(id: number): Promise<Notification> {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            throw new NotFoundException(`Notification with ID ${id} not found`);
        }

        return notification;
    }

}
