import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {CreateUserDto} from "../user/dto/create-user.dto";
import {LoginUserDto} from "../user/dto/login-user.dto";
import {SessionService} from "../session/session.service";
import {UserService} from "../user/user.service";
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
      private userService: UserService,
      private sessionService: SessionService,
      private jwtService: JwtService,
      private prisma: PrismaService
  ) {}

  async validateUser(userLoginDto: LoginUserDto): Promise<any> {
    const { email, password } = userLoginDto;

    const user = await this.userService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async registration(createUserDto: CreateUserDto){
      const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return await this.userService.create(createUserDto)
  }

  async logout(token: string): Promise<void> {
    await this.sessionService.deleteSession(token);
  }

  async getCurrentUser(token: string) {
    const session = await this.sessionService.validateSession(token);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    return this.userService.findOne(session.user.id);
  }

  async extendSession(token: string): Promise<void> {
    // Extend session by default TTL (30 days)
    await this.sessionService.extendSession(token);
  }

  async login(userLoginDto: LoginUserDto, ipAddress?: string, userAgent?: string): Promise<{ user: any; sessionToken: string }> {
    const user = await this.validateUser(userLoginDto);

    // Generate session token
    const token = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { secret: process.env.JWT_SECRET || 'secret' },
    );

    // Create session data
    const sessionData: {
      role: any;
      ipAddress: string | undefined;
      userAgent: string | undefined;
      userId: any;
      expiresAt: Date;
      token: string
    } = {
      userId: user.id,
      token,
      role: user.role,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ipAddress,
      userAgent,
    };

    // Store session in Redis
    await this.sessionService.createSession(sessionData);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    return {
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
