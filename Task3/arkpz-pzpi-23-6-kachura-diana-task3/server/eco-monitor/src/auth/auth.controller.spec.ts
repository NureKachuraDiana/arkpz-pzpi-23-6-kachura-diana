import { Test, TestingModule } from '@nestjs/testing';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import {ConflictException, UnauthorizedException} from "@nestjs/common";

describe('AuthController', () => {
    let authController: AuthController;
    let authService: AuthService;

    const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
    };

    const mockAuthService = {
        login: jest.fn(),
        registration: jest.fn(),
        logout: jest.fn(),
        getCurrentUser: jest.fn(),
    };

    const mockResponse = () => {
        const res: Partial<Response> = {};
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res as Response;
    };

    const mockRequest = (cookies = {}) => {
        const req: Partial<Request> = {
            cookies: cookies,
        };
        return req as Request;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        authController = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    describe('login', () => {
        const loginDto: LoginUserDto = {
            email: 'test@example.com',
            password: 'password123',
        };

        it('should login user and set cookie', async () => {
            const mockResponseObj = mockResponse();
            const loginResult = {
                sessionToken: 'jwt-token',
                user: mockUser,
            };

            mockAuthService.login.mockResolvedValue(loginResult);

            const result = await authController.login(loginDto, mockResponseObj);

            expect(authService.login).toHaveBeenCalledWith(loginDto);
            expect(mockResponseObj.cookie).toHaveBeenCalledWith(
                'session_token',
                'jwt-token',
                {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000,
                    path: '/',
                },
            );
            expect(result).toEqual({ user: mockUser });
        });

        it('should handle login failure', async () => {
            const mockResponseObj = mockResponse();
            mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

            await expect(
                authController.login(loginDto, mockResponseObj),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('registration', () => {
        const createUserDto: CreateUserDto = {
            email: 'new@example.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Doe',
        };

        it('should register user successfully', async () => {
            const mockResponseObj = mockResponse();
            mockAuthService.registration.mockResolvedValue(mockUser);

            const result = await authController.registration(createUserDto, mockResponseObj);

            expect(authService.registration).toHaveBeenCalledWith(createUserDto);
            expect(result).toEqual(mockUser);
        });

        it('should handle registration failure - user already exists', async () => {
            const mockResponseObj = mockResponse();
            mockAuthService.registration.mockRejectedValue(
                new ConflictException('User with this email already exists'),
            );

            await expect(
                authController.registration(createUserDto, mockResponseObj),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('logout', () => {
        it('should logout user and clear cookie when token exists', async () => {
            const mockRequestObj = mockRequest({ session_token: 'valid-token' });
            const mockResponseObj = mockResponse();

            mockAuthService.logout.mockResolvedValue(undefined);

            const result = await authController.logout(mockRequestObj, mockResponseObj);

            expect(authService.logout).toHaveBeenCalledWith('valid-token');
            expect(mockResponseObj.clearCookie).toHaveBeenCalledWith('session_token', {
                httpOnly: true,
                sameSite: 'strict',
                path: '/',
            });
            expect(result).toEqual({ message: 'Logout successful' });
        });

        it('should clear cookie even when no token exists', async () => {
            const mockRequestObj = mockRequest();
            const mockResponseObj = mockResponse();

            const result = await authController.logout(mockRequestObj, mockResponseObj);

            expect(authService.logout).not.toHaveBeenCalled();
            expect(mockResponseObj.clearCookie).toHaveBeenCalledWith('session_token', {
                httpOnly: true,
                sameSite: 'strict',
                path: '/',
            });
            expect(result).toEqual({ message: 'Logout successful' });
        });
    });

    describe('getCurrentUser', () => {
        it('should return current user when valid token exists', async () => {
            const mockRequestObj = mockRequest({ session_token: 'valid-token' });
            mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

            const result = await authController.getCurrentUser(mockRequestObj);

            expect(authService.getCurrentUser).toHaveBeenCalledWith('valid-token');
            expect(result).toEqual(mockUser);
        });

        it('should throw UnauthorizedException when session is invalid', async () => {
            const mockRequestObj = mockRequest({ session_token: 'invalid-token' });

            mockAuthService.getCurrentUser.mockRejectedValue(
                new UnauthorizedException('Invalid session'),
            );

            await expect(
                authController.getCurrentUser(mockRequestObj),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when no token provided', async () => {
            const mockRequestObj = mockRequest();

            mockAuthService.getCurrentUser.mockRejectedValue(
                new UnauthorizedException('Invalid session'),
            );

            await expect(
                authController.getCurrentUser(mockRequestObj),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});