import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationTemplate, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification template
   */
  async create(createTemplateDto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const { type, language, title, message, isActive } = createTemplateDto;

    try {
      return await this.prisma.notificationTemplate.create({
        data: {
          type,
          language,
          title,
          message,
          isActive,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Template for type ${type} and language ${language} already exists`);
      }
      throw error;
    }
  }

  /**
   * Get all notification templates
   */
  async findAll(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: [
        { type: 'asc' },
        { language: 'asc' },
      ],
    });
  }

  /**
   * Get template by type and language
   */
  async findOne(type: NotificationType, language: string): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: {
        type_language: {
          type,
          language,
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template for type ${type} and language ${language} not found`);
    }

    return template;
  }

  /**
   * Update notification template
   */
  async update(
      type: NotificationType,
      language: string,
      updateTemplateDto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    try {
      return await this.prisma.notificationTemplate.update({
        where: {
          type_language: {
            type,
            language,
          },
        },
        data: updateTemplateDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Template for type ${type} and language ${language} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete notification template
   */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.notificationTemplate.delete({
        where: {
          id: id
          },
        },
      );
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Template for id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async findById(id: number): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }
}