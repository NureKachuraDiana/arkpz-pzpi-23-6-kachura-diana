import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import {NotificationTemplate, NotificationType, Role} from '@prisma/client';
import {Roles} from "../auth/decorators/roles.decorator";
import {NotificationTemplateService} from "./notification-template.service";

@ApiTags('notification-templates')
@Controller('notification-templates')
export class NotificationTemplateController {
  constructor(private readonly templatesService: NotificationTemplateService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new notification template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 409, description: 'Template already exists' })
  async create(
      @Body() createTemplateDto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiResponse({ status: 200, description: 'Returns all templates' })
  async findAll(): Promise<NotificationTemplate[]> {
    return this.templatesService.findAll();
  }

  @Get('id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get template by type and language' })
  @ApiResponse({ status: 200, description: 'Returns template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
      @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationTemplate> {
    return this.templatesService.findById(id);
  }

  @Put(':type/:language')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'type', enum: NotificationType })
  @ApiParam({ name: 'language', type: String })
  async update(
      @Param('type') type: NotificationType,
      @Param('language') language: string,
      @Body() updateTemplateDto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.templatesService.update(type, language, updateTemplateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'id', type: Number })
  async remove(
      @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.templatesService.remove(id);
  }
}
