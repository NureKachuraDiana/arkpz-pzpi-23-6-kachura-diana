import {Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Req, UnauthorizedException} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import {LoginUserDto} from "../user/dto/login-user.dto";
import {CreateUserDto} from "../user/dto/create-user.dto";
import type { Response, Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
      @Body() loginUserDto: LoginUserDto,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
  ) {
    const { sessionToken, user } = await this.authService.login(loginUserDto);

    const isProduction = process.env.NODE_ENV === 'production';
    // Check if request is over HTTPS
    const isHttps = request.protocol === 'https' || 
                    request.secure || 
                    request.get('x-forwarded-proto') === 'https';
    
    const isLocalhost = request.hostname === 'localhost' ||
        request.hostname?.includes('127.0.0.1') ||
        request.hostname?.includes('::1');

    // For HTTPS (even on localhost), secure must be true for cookies to work
    // For HTTP on localhost, secure can be false
    const useSecure = isHttps || isProduction;

    response.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: useSecure, // true for HTTPS, false only for HTTP localhost
      sameSite: isLocalhost ? 'lax' : 'strict', // 'lax' allows cross-origin for localhost
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/',
      // Don't set domain for localhost - allows cookie to work across ports
    });

    return { user };
  }

  @Public()
  @Post('registration')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async registration(
      @Body() createUserDto: CreateUserDto,
      @Res({ passthrough: true }) response: Response,
  ){
    return await this.authService.registration(createUserDto)
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.session_token;
    if (token) {
      await this.authService.logout(token);
    }

    // Clear the cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = request.protocol === 'https' || 
                    request.secure || 
                    request.get('x-forwarded-proto') === 'https';
    
    const isLocalhost = request.hostname === 'localhost' ||
        request.hostname?.includes('127.0.0.1') ||
        request.hostname?.includes('::1');

    const useSecure = isHttps || isProduction;
    
    response.clearCookie('session_token', {
      httpOnly: true,
      secure: useSecure,
      sameSite: isLocalhost ? 'lax' : 'strict',
      path: '/',
    });

    return { message: 'Logout successful' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or expired session' })
  async getCurrentUser(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.session_token;
    
    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    try {
      const user = await this.authService.getCurrentUser(token);
      
      // Extend session on successful validation (sliding window)
      // This keeps the session alive as long as user is active
      await this.authService.extendSession(token);
      
      // Update cookie expiration to match extended session
      const isProduction = process.env.NODE_ENV === 'production';
      const isHttps = request.protocol === 'https' || 
                      request.secure || 
                      request.get('x-forwarded-proto') === 'https';
      
      const isLocalhost = request.hostname === 'localhost' ||
          request.hostname?.includes('127.0.0.1') ||
          request.hostname?.includes('::1');

      const useSecure = isHttps || isProduction;
      
      response.cookie('session_token', token, {
        httpOnly: true,
        secure: useSecure,
        sameSite: isLocalhost ? 'lax' : 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
      
      return user;
    } catch (error) {
      // Clear invalid cookie
      const isProduction = process.env.NODE_ENV === 'production';
      const isHttps = request.protocol === 'https' ||
                      request.secure ||
                      request.get('x-forwarded-proto') === 'https';
      
      const isLocalhost = request.hostname === 'localhost' ||
          request.hostname?.includes('127.0.0.1') ||
          request.hostname?.includes('::1');

      const useSecure = isHttps || isProduction;
      
      response.clearCookie('session_token', {
        httpOnly: true,
        secure: useSecure,
        sameSite: isLocalhost ? 'lax' : 'strict',
        path: '/',
      });
      throw error;
    }
  }

}
