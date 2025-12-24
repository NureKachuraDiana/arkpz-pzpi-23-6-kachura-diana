import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards, Req
} from '@nestjs/common';
import { UserService } from './user.service';
import {ApiOperation, ApiParam, ApiResponse, ApiTags} from "@nestjs/swagger";
import {Roles} from "../auth/decorators/roles.decorator";
import {ChangeUserRoleDto} from "./dto/change-user-role.dto";
import {UpdateProfileDto} from "./dto/update-profile.dto";
import type { Response, Request } from 'express';
import {Role} from "@prisma/client";

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200 })
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
      @Param('id') id: string
  ) {
    return this.userService.findOne(+id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async remove(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.userService.remove(id);
  }

  @Patch('/block/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Block user by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async block(
      @Param('id', ParseIntPipe) id: number
  ){
    return this.userService.block(id)
  }

  @Patch('/unblock/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unblock user by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async unblock(
      @Param('id', ParseIntPipe) id: number
  ){
    return this.userService.unblock(id)
  }

  @Get('/email')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by email' })
  @ApiParam({ name: 'email', type: String, description: 'User email' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async getByEmail(
      @Body('email') email: string
  ){
    return this.userService.findByEmail(email)
  }

  @Post('/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Change user role' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async changeUserRole(
      @Body() changeUserRoleDto: ChangeUserRoleDto
  ){
    await this.userService.changeUserRole(changeUserRoleDto)
  }

  @Patch('/profile')
  @ApiOperation({ summary: 'Change user profile data' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
      @Body() updateProfileDto: UpdateProfileDto,
      @Req() request: Request,
  ){
    const token = request.cookies?.session_token;
    await this.userService.updateProfile(token, updateProfileDto)
  }
}
