import {ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags} from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req, UnauthorizedException
} from "@nestjs/common";
import {NotificationsService} from "./notifications.service";
import {CreateNotificationDto} from "./dto/create-notification.dto";
import {CreateNotificationFromTemplateDto} from "./dto/create-notification-from-template.dto";
import {MarkAsReadDto} from "./dto/mark-as-read.dto";
import type {Request} from "express";
import {SessionService} from "../session/session.service";

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
      private readonly notificationsService: NotificationsService,
      private readonly sessionService: SessionService,
  ) {}

  private async getUserIdFromSession(request: Request): Promise<number> {
    const token = request.cookies?.session_token;
    const session = await this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session.user.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create notification from template' })
  @ApiResponse({ status: 201, description: 'Notification created from template successfully' })
  @ApiResponse({ status: 404, description: 'Template or user not found' })
  @ApiHeader({ name: 'authorization', description: 'User token for preferences', required: false })
  async createFromTemplate(
      @Body() createTemplateDto: CreateNotificationFromTemplateDto,
      @Req() request: Request,
  ) {
    const token = request.cookies?.session_token;
    return this.notificationsService.createFromTemplate(createTemplateDto, token);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Returns user notifications with pagination' })
  async getUserNotifications(
      @Req() request: Request,
  ) {
    const userId = await this.getUserIdFromSession(request);
    return this.notificationsService.getUserNotifications(userId);
  }

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read successfully' })
  async markAsRead(
      @Req() request: Request,
      @Body() markAsReadDto: MarkAsReadDto,
  ) {
    const userId = await this.getUserIdFromSession(request);
    return this.notificationsService.markAsRead(userId, markAsReadDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Returns notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
      @Req() request: Request,
      @Param('id') id: string) {
    const userId = await this.getUserIdFromSession(request);
    const notification = await this.notificationsService.findOne(+id);

    // Ensure user can only access their own notifications
    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}