import { Test, TestingModule } from '@nestjs/testing';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { CreateExportDto } from './dto/create-export.dto';
import { UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

const mockDataExportService = {
    createExportRequest: jest.fn(),
    getUserExports: jest.fn(),
    getExportById: jest.fn(),
    downloadExport: jest.fn(),
    cancelExport: jest.fn(),
    deleteExport: jest.fn(),
    cleanupOldExports: jest.fn(),
};

const mockRequest = {
    cookies: {
        session_token: 'mock-session-token'
    }
};

const mockResponse = {
    setHeader: jest.fn(),
    sendFile: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
};

describe('DataExportController', () => {
    let controller: DataExportController;
    let service: DataExportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataExportController],
            providers: [
                {
                    provide: DataExportService,
                    useValue: mockDataExportService,
                },
            ],
        }).compile();

        controller = module.get<DataExportController>(DataExportController);
        service = module.get<DataExportService>(DataExportService);
        jest.clearAllMocks();
    });

    describe('createExport', () => {
        const createExportDto: CreateExportDto = {
            format: 'csv',
            dateRange: {
                from: new Date('2024-01-01'),
                to: new Date('2024-01-31'),
            },
            dataTypes: ['sensor_data', 'measurements'],
        };

        it('should create export request successfully', async () => {
            const mockResult = { id: 1, status: 'pending' };
            mockDataExportService.createExportRequest.mockResolvedValue(mockResult);

            const result = await controller.createExport(mockRequest as any, createExportDto);

            expect(service.createExportRequest).toHaveBeenCalledWith(
                'mock-session-token',
                createExportDto
            );
            expect(result).toEqual(mockResult);
        });

        it('should handle service errors', async () => {
            mockDataExportService.createExportRequest.mockRejectedValue(
                new BadRequestException('Invalid request')
            );

            await expect(
                controller.createExport(mockRequest as any, createExportDto)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserExports', () => {
        it('should get user exports with default pagination', async () => {
            const mockExports = { data: [{ id: 1 }, { id: 2 }], total: 2 };
            mockDataExportService.getUserExports.mockResolvedValue(mockExports);

            const result = await controller.getUserExports(mockRequest as any);

            expect(service.getUserExports).toHaveBeenCalledWith('mock-session-token', 1, 10);
            expect(result).toEqual(mockExports);
        });

        it('should get user exports with custom pagination', async () => {
            const mockExports = { data: [{ id: 1 }], total: 1 };
            mockDataExportService.getUserExports.mockResolvedValue(mockExports);

            const result = await controller.getUserExports(
                mockRequest as any,
                2,
                20
            );

            expect(service.getUserExports).toHaveBeenCalledWith('mock-session-token', 2, 20);
            expect(result).toEqual(mockExports);
        });

        it('should handle missing session token', async () => {
            const requestWithoutToken = { cookies: {} };

            // Настраиваем мок сервиса, чтобы он выбрасывал ошибку при отсутствии токена
            mockDataExportService.getUserExports.mockRejectedValue(
                new UnauthorizedException('User not authenticated')
            );

            await expect(
                controller.getUserExports(requestWithoutToken as any)
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('getExportById', () => {
        it('should get export by id', async () => {
            const mockExport = { id: 1, status: 'completed' };
            mockDataExportService.getExportById.mockResolvedValue(mockExport);

            const result = await controller.getExportById(mockRequest as any, 1);

            expect(service.getExportById).toHaveBeenCalledWith(1, 'mock-session-token');
            expect(result).toEqual(mockExport);
        });

        it('should handle not found export', async () => {
            mockDataExportService.getExportById.mockRejectedValue(
                new NotFoundException('Export request not found')
            );

            await expect(
                controller.getExportById(mockRequest as any, 999)
            ).rejects.toThrow(NotFoundException);
        });

        it('should handle unauthorized access', async () => {
            mockDataExportService.getExportById.mockRejectedValue(
                new ForbiddenException('User not authorized to access this export')
            );

            await expect(
                controller.getExportById(mockRequest as any, 1)
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('downloadExport', () => {
        it('should download export file', async () => {
            const mockFileInfo = { filename: 'export.csv', path: '/path/to/file' };
            mockDataExportService.downloadExport.mockResolvedValue(mockFileInfo);

            await controller.downloadExport(
                mockRequest as any,
                1,
                mockResponse as any
            );

            expect(service.downloadExport).toHaveBeenCalledWith(
                1,
                'mock-session-token',
                mockResponse
            );
        });

        it('should handle not ready for download', async () => {
            mockDataExportService.downloadExport.mockRejectedValue(
                new ConflictException('Export not ready for download')
            );

            await expect(
                controller.downloadExport(mockRequest as any, 1, mockResponse as any)
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('cancelExport', () => {
        it('should cancel export successfully', async () => {
            const mockResult = { id: 1, status: 'cancelled' };
            mockDataExportService.cancelExport.mockResolvedValue(mockResult);

            const result = await controller.cancelExport(mockRequest as any, 1);

            expect(service.cancelExport).toHaveBeenCalledWith(1, 'mock-session-token');
            expect(result).toEqual(mockResult);
        });

        it('should handle cannot cancel completed export', async () => {
            mockDataExportService.cancelExport.mockRejectedValue(
                new ConflictException('Export cannot be cancelled')
            );

            await expect(
                controller.cancelExport(mockRequest as any, 1)
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('deleteExport', () => {
        it('should delete export successfully', async () => {
            const mockResult = { id: 1, status: 'deleted' };
            mockDataExportService.deleteExport.mockResolvedValue(mockResult);

            const result = await controller.deleteExport(mockRequest as any, 1);

            expect(service.deleteExport).toHaveBeenCalledWith(1, 'mock-session-token');
            expect(result).toEqual(mockResult);
        });

        it('should handle unauthorized deletion', async () => {
            mockDataExportService.deleteExport.mockRejectedValue(
                new ForbiddenException('User not authorized to delete this export')
            );

            await expect(
                controller.deleteExport(mockRequest as any, 1)
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('cleanupOldExports', () => {
        it('should cleanup old exports with default days', async () => {
            const mockResult = { deletedCount: 5 };
            mockDataExportService.cleanupOldExports.mockResolvedValue(mockResult);

            const result = await controller.cleanupOldExports();

            expect(service.cleanupOldExports).toHaveBeenCalledWith(30);
            expect(result).toEqual(mockResult);
        });

        it('should cleanup old exports with custom days', async () => {
            const mockResult = { deletedCount: 10 };
            mockDataExportService.cleanupOldExports.mockResolvedValue(mockResult);

            const result = await controller.cleanupOldExports(15);

            expect(service.cleanupOldExports).toHaveBeenCalledWith(15);
            expect(result).toEqual(mockResult);
        });
    });

    // Тестирование корректности передачи параметров
    describe('Parameter Handling', () => {
        it('should pass correct parameters to service methods', async () => {
            const mockExport = { id: 1 };
            mockDataExportService.getExportById.mockResolvedValue(mockExport);

            await controller.getExportById(mockRequest as any, 123);

            expect(service.getExportById).toHaveBeenCalledWith(123, 'mock-session-token');
        });
    });
});