import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  Res,
  ParseIntPipe,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { DataExportService } from './data-export.service';
import { CreateExportDto } from './dto/create-export.dto';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import {Roles} from "../auth/decorators/roles.decorator";
import {Role} from "@prisma/client";

@ApiTags('Data Export')
@ApiCookieAuth('session_token')
@Controller('data-exports')
@UseInterceptors(ClassSerializerInterceptor)
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Post()
  @ApiOperation({
    summary: 'Create export request',
    description: 'Creates a new data export request for the authenticated user',
  })
  @ApiBody({ type: CreateExportDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Export request successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @Roles(Role.OBSERVER)
  async createExport(
      @Req() request: Request,
      @Body() createExportDto: CreateExportDto,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.createExportRequest(token, createExportDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user export requests',
    description: 'Retrieves paginated list of export requests for the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of export requests retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @Roles(Role.OBSERVER)
  async getUserExports(
      @Req() request: Request,
      @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
      @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.getUserExports(token, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get export by ID',
    description: 'Retrieves specific export request details by ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Export request ID',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export request details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export request not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to access this export',
  })
  @Roles(Role.OBSERVER)
  async getExportById(
      @Req() request: Request,
      @Param('id', ParseIntPipe) exportId: number,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.getExportById(exportId, token);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download export file',
    description: 'Downloads the exported data file if available and ready',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Export request ID',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File download successful',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export request not found or file not available',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to download this export',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Export not ready for download (still processing)',
  })
  @Roles(Role.OBSERVER)
  async downloadExport(
      @Req() request: Request,
      @Param('id', ParseIntPipe) exportId: number,
      @Res() res: Response,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.downloadExport(exportId, token, res);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel export request',
    description: 'Cancels a pending or processing export request',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Export request ID',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export request cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export request not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to cancel this export',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Export cannot be cancelled (already completed or failed)',
  })
  @Roles(Role.OBSERVER)
  async cancelExport(
      @Req() request: Request,
      @Param('id', ParseIntPipe) exportId: number,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.cancelExport(exportId, token);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete export request',
    description: 'Permanently deletes an export request and associated file',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Export request ID',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export request deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export request not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to delete this export',
  })
  @Roles(Role.OBSERVER)
  async deleteExport(
      @Req() request: Request,
      @Param('id', ParseIntPipe) exportId: number,
  ) {
    const token = request.cookies?.session_token;
    return this.dataExportService.deleteExport(exportId, token);
  }

  @Post('admin/cleanup')
  @ApiOperation({
    summary: 'Cleanup old exports',
    description: 'Admin endpoint to cleanup export requests older than specified days',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: 'Number of days to keep exports (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin privileges required',
  })
  @Roles(Role.ADMIN)
  async cleanupOldExports(
      @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ) {
    return this.dataExportService.cleanupOldExports(days);
  }
}