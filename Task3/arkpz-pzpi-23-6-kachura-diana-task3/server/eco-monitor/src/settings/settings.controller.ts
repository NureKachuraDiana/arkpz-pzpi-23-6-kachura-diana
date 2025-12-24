import {Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Req} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import {ApiOperation, ApiResponse, ApiTags} from "@nestjs/swagger";
import type { Response, Request } from 'express';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user settings data' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'User not found' })
  async get(
      @Req() request: Request,
  ) {
    const token = request.cookies?.session_token;
    return this.settingsService.get(token);
  }

  @Patch()
  @ApiOperation({ summary: 'Change user settings data' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async update(
      @Body() updateSettingDto: UpdateSettingDto,
      @Req() request: Request,
  ) {
    const token = request.cookies?.session_token;
    return this.settingsService.update(token, updateSettingDto);
  }

}
