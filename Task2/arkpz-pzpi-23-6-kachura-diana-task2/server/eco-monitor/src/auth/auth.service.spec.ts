import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { SessionService } from '../session/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

describe('AuthService', () => {
    let authService: TInput;
    let userService: UserService;
    let sessionService: SessionService;
    let jwtService: JwtService;
    let prismaService: PrismaService;

    const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        lastLogin: null,
    };

    const mockUserWithoutPassword = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        lastLogin: null,
    };

    const mockSession = {
        token: 'mock-token',
        userId: 1,
        role: 'USER',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserService,
                    useValue: {
                        findByEmail: jest.fn(),
                        create: jest.fn(),
                        findOne: jest.fn(),
                        updateLastLogin: jest.fn(),
                    },
                },
                {
                    provide: SessionService,
                    useValue: {
                        createSession: jest.fn(),
                        deleteSession: jest.fn(),
                        validateSession: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                    },
                },
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        sessionService = module.get<SessionService>(SessionService);
        jwtService = module.get<JwtService>(JwtService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        const loginDto: LoginUserDto = {
            email: 'test@example.com',
            password: 'password123',
        };

        it('should validate user successfully', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await authService.validateUser(loginDto);

            expect(userService.findByEmail).toHaveBeenCalledWith(loginDto.email);
            expect(bcrypt.compare).toHaveBeenCalledWith(
                loginDto.password,
                mockUser.password,
            );
            expect(result).toEqual(mockUserWithoutPassword);
        });

        it('should throw UnauthorizedException if user not found', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

            await expect(authService.validateUser(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException if user is inactive', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue({
                ...mockUser,
                isActive: false,
            });

            await expect(authService.validateUser(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException if password is invalid', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.validateUser(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
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
            jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
            jest.spyOn(userService, 'create').mockResolvedValue(mockUserWithoutPassword);

            const result = await authService.registration(createUserDto);

            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: createUserDto.email },
            });
            expect(userService.create).toHaveBeenCalledWith(createUserDto);
            expect(result).toEqual(mockUserWithoutPassword);
        });

        it('should throw ConflictException if user already exists', async () => {
            jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

            await expect(authService.registration(createUserDto)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('logout', () => {
        it('should delete session successfully', async () => {
            const token = 'mock-token';
            jest.spyOn(sessionService, 'deleteSession').mockResolvedValue();

            await authService.logout(token);

            expect(sessionService.deleteSession).toHaveBeenCalledWith(token);
        });
    });

    describe('getCurrentUser', () => {
        it('should return current user successfully', async () => {
            const token = 'valid-token';
            const mockSession = {
                user: { id: 1 },
            };

            jest.spyOn(sessionService, 'validateSession').mockResolvedValue(mockSession as any);
            jest.spyOn(userService, 'findOne').mockResolvedValue(mockUserWithoutPassword);

            const result = await authService.getCurrentUser(token);

            expect(sessionService.validateSession).toHaveBeenCalledWith(token);
            expect(userService.findOne).toHaveBeenCalledWith(mockSession.user.id);
            expect(result).toEqual(mockUserWithoutPassword);
        });

        it('should throw UnauthorizedException if session is invalid', async () => {
            const token = 'invalid-token';
            jest.spyOn(sessionService, 'validateSession').mockResolvedValue(null);

            await expect(authService.getCurrentUser(token)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe('login', () => {
        const loginDto: LoginUserDto = {
            email: 'test@example.com',
            password: 'password123',
        };
        const ipAddress = '127.0.0.1';
        const userAgent = 'jest-test';

        it('should login user successfully', async () => {
            const mockToken = 'jwt-token';

            jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUserWithoutPassword);
            jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);
            jest.spyOn(sessionService, 'createSession').mockResolvedValue();
            jest.spyOn(userService, 'updateLastLogin').mockResolvedValue();

            const result = await authService.login(loginDto, ipAddress, userAgent);

            expect(authService.validateUser).toHaveBeenCalledWith(loginDto);
            expect(jwtService.sign).toHaveBeenCalledWith(
                { sub: mockUserWithoutPassword.id, email: mockUserWithoutPassword.email },
                { secret: process.env.JWT_SECRET || 'secret' },
            );
            expect(sessionService.createSession).toHaveBeenCalledWith({
                userId: mockUserWithoutPassword.id,
                token: mockToken,
                role: mockUserWithoutPassword.role,
                expiresAt: expect.any(Date),
                ipAddress,
                userAgent,
            });
            expect(userService.updateLastLogin).toHaveBeenCalledWith(mockUserWithoutPassword.id);
            expect(result).toEqual({
                sessionToken: mockToken,
                user: {
                    id: mockUserWithoutPassword.id,
                    email: mockUserWithoutPassword.email,
                    firstName: mockUserWithoutPassword.firstName,
                    lastName: mockUserWithoutPassword.lastName,
                    role: mockUserWithoutPassword.role,
                },
            });
        });

        it('should throw UnauthorizedException if validateUser fails', async () => {
            jest.spyOn(authService, 'validateUser').mockRejectedValue(
                new UnauthorizedException('Invalid credentials'),
            );

            await expect(authService.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});