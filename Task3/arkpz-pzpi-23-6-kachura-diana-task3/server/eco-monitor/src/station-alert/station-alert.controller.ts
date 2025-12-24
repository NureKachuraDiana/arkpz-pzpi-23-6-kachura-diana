import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { StationAlertService } from './station-alert.service';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto';
import { ClearHistoryDto } from './dto/clear-history.dto';
import { StationAlertDto } from './dto/station-alert.dto';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import {SessionService} from "../session/session.service";
import {Roles} from "../auth/decorators/roles.decorator";
import {Role} from "@prisma/client";

@ApiTags('Station Alerts')
@Controller('station-alerts')
@UseInterceptors(ClassSerializerInterceptor)
export class StationAlertController {
  constructor(
      private readonly stationAlertService: StationAlertService,
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

  @Get('active')
  @ApiOperation({ summary: 'Get active alerts with filtering and pagination' })
  @ApiResponse({ status: 200, type: [StationAlertDto] })
  async getActiveAlerts(@Query() query: GetAlertsQueryDto) {
    return this.stationAlertService.getActiveAlerts(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get alert history with filtering and pagination' })
  @ApiResponse({ status: 200, type: [StationAlertDto] })
  async getAlertHistory(@Query() query: GetAlertsQueryDto) {
    return this.stationAlertService.getAlertHistory(query);
  }

  @Patch(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an active alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiBody({ type: Object }) // Empty body but documented
  @ApiResponse({ status: 200, type: StationAlertDto })
  @ApiResponse({ status: 404, description: 'Alert not found or not active' })
  async acknowledgeAlert(
      @Param('id', ParseIntPipe) id: number,
      @Req() request: Request,
  ) {
    const userId = await this.getUserIdFromSession(request);
    return this.stationAlertService.acknowledgeAlert(id, userId);
  }

  @Delete('history')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Clear historical alerts (Admin only)' })
  @ApiResponse({ status: 200, description: 'History cleared successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async clearHistory(@Body() clearHistoryDto: ClearHistoryDto) {
    return this.stationAlertService.clearHistory(clearHistoryDto);
  }
}