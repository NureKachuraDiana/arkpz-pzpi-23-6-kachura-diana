import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import {PrismaService} from "../prisma/prisma.service";
import * as bcrypt from 'bcrypt';
import {SessionService} from "../session/session.service";
import {ChangeUserRoleDto} from "./dto/change-user-role.dto";
import {UpdateProfileDto} from "./dto/update-profile.dto";
import {SettingsService} from "../settings/settings.service";
import {Role} from "@prisma/client";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService,
              private sessionService: SessionService,
              private settingsService: SettingsService)
  {}
  async create(createUserDto: CreateUserDto)  {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    await this.settingsService.create(user.id)

    return this.excludePassword(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.excludePassword(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.excludePassword(user);
  }

  async remove(id: number) {
    await this.findOne(id);

    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    return this.excludePassword(deletedUser);
  }

  async block(id: number) {
    await this.findOne(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return this.excludePassword(updatedUser);
  }

  async unblock(id: number) {
    await this.findOne(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return this.excludePassword(updatedUser);
  }

  async updateLastLogin(id: number){
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  private excludePassword(user: any): Omit<any, "password"> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async changeUserRole(changeUserRoleDto: ChangeUserRoleDto) {
    const {id, role} = changeUserRoleDto
    if (!Object.values(Role).includes(role as Role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    await this.findOne(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: role as Role },
    });

    await this.sessionService.updateUserRoleInAllSessions(id, role as Role)

    return this.excludePassword(updatedUser);
  }

  async updateProfile(token: string, dto: UpdateProfileDto) {
    const session = await this.sessionService.validateSession(token);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    const userId = session.user.id

    await this.findOne(userId);

    const { firstName, lastName } = dto;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Only update fields that were sent
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
    });

    return this.excludePassword(updatedUser);
  }
}
