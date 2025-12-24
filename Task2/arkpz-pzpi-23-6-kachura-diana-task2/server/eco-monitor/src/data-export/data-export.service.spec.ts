import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-writer';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DataExportService } from './data-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportFormat, ExportStatus, SensorType } from '@prisma/client';

// Mock external dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('csv-writer');
jest.mock('exceljs');
jest.mock('pdfkit');

describe('DataExportService', () => {
    let service: DataExportService;
    let prismaService: PrismaService;
    let sessionService: SessionService;

    const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
    };

    const mockSession = {
        user: mockUser,
    };

    const mockExportRecord = {
        id: 1,
        userId: 1,
        format: ExportFormat.CSV,
        filters: {},
        status: ExportStatus.PENDING,
        fileName: null,
        filePath: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
    };

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
        },
        dataExport: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        sensorReading: {
            findMany: jest.fn(),
        },
        stationAlert: {
            findMany: jest.fn(),
        },
        aggregatedData: {
            findMany: jest.fn(),
        },
    };

    const mockSessionService = {
        validateSession: jest.fn(),
    };

    const mockResponse = () => {
        const res: Partial<Response> = {};
        res.setHeader = jest.fn().mockReturnValue(res);
        res.status = jest.fn().mockReturnValue(res);
        res.send = jest.fn();
        return res as Response;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataExportService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: SessionService,
                    useValue: mockSessionService,
                },
            ],
        }).compile();

        service = module.get<DataExportService>(DataExportService);
        prismaService = module.get<PrismaService>(PrismaService);
        sessionService = module.get<SessionService>(SessionService);

        // Mock fs and path
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
        (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
        (fs.createReadStream as jest.Mock).mockReturnValue({
            pipe: jest.fn(),
        });
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

        jest.clearAllMocks();
    });

    describe('createExportRequest', () => {
        const token = 'valid-token';
        const createExportDto: CreateExportDto = {
            format: ExportFormat.CSV,
            filters: {
                startDate: '2023-01-01',
                endDate: '2023-12-31',
                sensorTypes: [SensorType.TEMPERATURE],
                stationIds: [1],
            },
            description: 'Test export',
        };

        it('should create export request successfully', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.dataExport.create.mockResolvedValue(mockExportRecord);

            const result = await service.createExportRequest(token, createExportDto);

            expect(sessionService.validateSession).toHaveBeenCalledWith(token);
            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { id: mockUser.id },
            });
            expect(prismaService.dataExport.create).toHaveBeenCalledWith({
                data: {
                    userId: mockUser.id,
                    format: createExportDto.format,
                    filters: createExportDto.filters,
                    status: ExportStatus.PENDING,
                    fileName: null,
                    filePath: null,
                },
            });
            expect(result).toEqual(mockExportRecord);
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            mockSessionService.validateSession.mockResolvedValue(null);

            await expect(
                service.createExportRequest(token, createExportDto),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.createExportRequest(token, createExportDto),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getUserExports', () => {
        const token = 'valid-token';
        const page = 1;
        const limit = 10;

        it('should return user exports with pagination', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findMany.mockResolvedValue([mockExportRecord]);
            mockPrismaService.dataExport.count.mockResolvedValue(1);

            const result = await service.getUserExports(token, page, limit);

            expect(sessionService.validateSession).toHaveBeenCalledWith(token);
            expect(prismaService.dataExport.findMany).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: limit,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            expect(result).toEqual({
                exports: [mockExportRecord],
                pagination: {
                    page,
                    limit,
                    total: 1,
                    pages: 1,
                },
            });
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            mockSessionService.validateSession.mockResolvedValue(null);

            await expect(
                service.getUserExports(token, page, limit),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('getExportById', () => {
        const token = 'valid-token';
        const exportId = 1;

        it('should return export record for authorized user', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(mockExportRecord);

            const result = await service.getExportById(exportId, token);

            expect(sessionService.validateSession).toHaveBeenCalledWith(token);
            expect(prismaService.dataExport.findFirst).toHaveBeenCalledWith({
                where: {
                    id: exportId,
                    userId: mockUser.id,
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            expect(result).toEqual(mockExportRecord);
        });

        it('should throw NotFoundException for non-existent export', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(null);

            await expect(
                service.getExportById(exportId, token),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            mockSessionService.validateSession.mockResolvedValue(null);

            await expect(
                service.getExportById(exportId, token),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('downloadExport', () => {
        const token = 'valid-token';
        const exportId = 1;
        const res = mockResponse();

        const completedExport = {
            ...mockExportRecord,
            status: ExportStatus.COMPLETED,
            filePath: '/exports/export-1.csv',
            fileName: 'export-1.csv',
            fileSize: 1024,
        };

        it('should download completed export successfully', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(completedExport);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await service.downloadExport(exportId, token, res);

            expect(sessionService.validateSession).toHaveBeenCalledWith(token);
            expect(prismaService.dataExport.findFirst).toHaveBeenCalledWith({
                where: {
                    id: exportId,
                    userId: mockUser.id,
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                'attachment; filename="export-1.csv"',
            );
            expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '1024');
            expect(fs.createReadStream).toHaveBeenCalledWith(completedExport.filePath);
        });

        it('should throw BadRequestException for non-completed export', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(mockExportRecord);

            await expect(
                service.downloadExport(exportId, token, res),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException for missing file', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(completedExport);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await expect(
                service.downloadExport(exportId, token, res),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('cancelExport', () => {
        const token = 'valid-token';
        const exportId = 1;

        it('should cancel pending export successfully', async () => {
            const pendingExport = { ...mockExportRecord, status: ExportStatus.PENDING };
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(pendingExport);
            mockPrismaService.dataExport.update.mockResolvedValue({
                ...pendingExport,
                status: ExportStatus.CANCELLED,
            });

            const result = await service.cancelExport(exportId, token);

            expect(prismaService.dataExport.update).toHaveBeenCalledWith({
                where: { id: exportId },
                data: {
                    status: ExportStatus.CANCELLED,
                    completedAt: expect.any(Date),
                },
            });
            expect(result.status).toBe(ExportStatus.CANCELLED);
        });

        it('should throw BadRequestException for non-cancellable status', async () => {
            const completedExport = { ...mockExportRecord, status: ExportStatus.COMPLETED };
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(completedExport);

            await expect(
                service.cancelExport(exportId, token),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('deleteExport', () => {
        const token = 'valid-token';
        const exportId = 1;

        it('should delete export and file successfully', async () => {
            const exportWithFile = {
                ...mockExportRecord,
                filePath: '/exports/export-1.csv',
            };
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(exportWithFile);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            mockPrismaService.dataExport.delete.mockResolvedValue(exportWithFile);

            const result = await service.deleteExport(exportId, token);

            expect(fs.unlinkSync).toHaveBeenCalledWith(exportWithFile.filePath);
            expect(prismaService.dataExport.delete).toHaveBeenCalledWith({
                where: { id: exportId },
            });
            expect(result).toEqual(exportWithFile);
        });

        it('should delete export without file successfully', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.dataExport.findFirst.mockResolvedValue(mockExportRecord);
            mockPrismaService.dataExport.delete.mockResolvedValue(mockExportRecord);

            const result = await service.deleteExport(exportId, token);

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(prismaService.dataExport.delete).toHaveBeenCalledWith({
                where: { id: exportId },
            });
            expect(result).toEqual(mockExportRecord);
        });
    });

    describe('cleanupOldExports', () => {
        it('should cleanup old exports successfully', async () => {
            const oldExport = {
                ...mockExportRecord,
                filePath: '/exports/old-export.csv',
                createdAt: new Date('2023-01-01'),
            };
            mockPrismaService.dataExport.findMany.mockResolvedValue([oldExport]);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            mockPrismaService.dataExport.delete.mockResolvedValue(oldExport);

            const result = await service.cleanupOldExports(30);

            expect(prismaService.dataExport.findMany).toHaveBeenCalledWith({
                where: {
                    createdAt: { lt: expect.any(Date) },
                },
            });
            expect(fs.unlinkSync).toHaveBeenCalledWith(oldExport.filePath);
            expect(prismaService.dataExport.delete).toHaveBeenCalledWith({
                where: { id: oldExport.id },
            });
            expect(result).toEqual({
                deletedCount: 1,
                errorCount: 0,
                totalProcessed: 1,
            });
        });

        it('should handle file deletion errors gracefully', async () => {
            const oldExport = {
                ...mockExportRecord,
                filePath: '/exports/old-export.csv',
                createdAt: new Date('2023-01-01'),
            };
            mockPrismaService.dataExport.findMany.mockResolvedValue([oldExport]);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockImplementation(() => {
                throw new Error('Delete failed');
            });

            const result = await service.cleanupOldExports(30);

            expect(result).toEqual({
                deletedCount: 0,
                errorCount: 1,
                totalProcessed: 1,
            });
        });
    });

    describe('processExport - private method tests through createExportRequest', () => {
        const token = 'valid-token';
        const createExportDto: CreateExportDto = {
            format: ExportFormat.CSV,
            filters: {},
            description: 'Test export',
        };

        it('should handle export processing failure', async () => {
            mockSessionService.validateSession.mockResolvedValue(mockSession);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.dataExport.create.mockResolvedValue(mockExportRecord);

            // Mock processExport to fail
            jest.spyOn(service as any, 'processExport').mockRejectedValue(new Error('Processing failed'));

            const result = await service.createExportRequest(token, createExportDto);

            expect(result).toEqual(mockExportRecord);
            // The error should be caught and logged, but not thrown
        });
    });

    describe('File format generation', () => {
        beforeEach(() => {
            // Mock the internal methods
            jest.spyOn(service as any, 'fetchExportData').mockResolvedValue({
                readings: [],
                alerts: [],
                aggregated: [],
            });
        });

        it('should generate CSV file', async () => {
            const mockCsvWriter = {
                writeRecords: jest.fn().mockResolvedValue(undefined),
            };
            (csv.createObjectCsvWriter as jest.Mock).mockReturnValue(mockCsvWriter);

            const result = await (service as any).generateExportFile(ExportFormat.CSV, {}, 1);

            expect(csv.createObjectCsvWriter).toHaveBeenCalled();
            expect(mockCsvWriter.writeRecords).toHaveBeenCalled();
            expect(result.fileName).toContain('.csv');
        });

        it('should generate JSON file', async () => {
            const result = await (service as any).generateExportFile(ExportFormat.JSON, {}, 1);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(result.fileName).toContain('.json');
        });

        it('should generate Excel file', async () => {
            const mockWorkbook = {
                addWorksheet: jest.fn().mockReturnValue({
                    columns: [],
                    addRow: jest.fn(),
                }),
                xlsx: {
                    writeFile: jest.fn().mockResolvedValue(undefined),
                },
            };
            (ExcelJS.Workbook as jest.MockedClass<typeof ExcelJS.Workbook>).mockImplementation(() => mockWorkbook as any);

            const result = await (service as any).generateExportFile(ExportFormat.EXCEL, {}, 1);

            expect(ExcelJS.Workbook).toHaveBeenCalled();
            expect(result.fileName).toContain('.xlsx');
        });

        it('should generate PDF file', async () => {
            const mockStream = {
                on: jest.fn().mockImplementation(function(event, callback) {
                    if (event === 'finish') {
                        // Imitate async finish event
                        setTimeout(() => callback(), 0);
                    }
                    return this;
                }),
            };

            const mockDoc = {
                fontSize: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnThis(),
                moveDown: jest.fn().mockReturnThis(),
                addPage: jest.fn().mockReturnThis(),
                end: jest.fn().mockReturnThis(),
                pipe: jest.fn().mockReturnValue(mockStream),
            };

            (PDFDocument as jest.MockedClass<typeof PDFDocument>).mockImplementation(() => mockDoc as any);
            (fs.createWriteStream as jest.Mock).mockReturnValue(mockStream);
            (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

            const result = await (service as any).generateExportFile(ExportFormat.PDF, {}, 1);

            expect(PDFDocument).toHaveBeenCalled();
            expect(mockDoc.pipe).toHaveBeenCalledWith(mockStream);
            expect(mockDoc.end).toHaveBeenCalled();
            expect(result.fileName).toContain('.pdf');
            expect(result.fileSize).toBe(1024);
        });

        it('should throw BadRequestException for unsupported format', async () => {
            await expect(
                (service as any).generateExportFile('UNSUPPORTED_FORMAT' as ExportFormat, {}, 1),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('Helper methods', () => {
        it('should return correct file extension', () => {
            expect((service as any).getFileExtension(ExportFormat.CSV)).toBe('csv');
            expect((service as any).getFileExtension(ExportFormat.JSON)).toBe('json');
            expect((service as any).getFileExtension(ExportFormat.EXCEL)).toBe('xlsx');
            expect((service as any).getFileExtension(ExportFormat.PDF)).toBe('pdf');
        });

        it('should return correct MIME type', () => {
            expect((service as any).getMimeType(ExportFormat.CSV)).toBe('text/csv');
            expect((service as any).getMimeType(ExportFormat.JSON)).toBe('application/json');
            expect((service as any).getMimeType(ExportFormat.EXCEL)).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect((service as any).getMimeType(ExportFormat.PDF)).toBe('application/pdf');
        });
    });
});