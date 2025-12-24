import {Injectable, NotFoundException, BadRequestException, Logger, UnauthorizedException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportFilterDto } from './dto/export-filter.dto';
import { ExportFormat, ExportStatus, SensorType } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-writer';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {SessionService} from "../session/session.service";

interface CsvRecord {
    type: string;
    timestamp: string;
    sensorType: string;
    value: any;
    station: string;
    unit: string;
}

@Injectable()
export class DataExportService {
    private readonly logger = new Logger(DataExportService.name);
    private readonly exportDir = path.join(process.cwd(), 'exports');

    constructor(private prisma: PrismaService,
                private sessionService: SessionService
    ) {
        // Ensure exports directory exists
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    async createExportRequest(token: string, createExportDto: CreateExportDto) {
        const userId = await this.getUserIdFromToken(token);
        const { format, filters, description } = createExportDto;

        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Create export record in database
        const exportRecord = await this.prisma.dataExport.create({
            data: {
                userId,
                format,
                filters: filters as any,
                status: ExportStatus.PENDING,
                fileName: null,
                filePath: null,
            },
        });

        // Start background processing
        this.processExport(exportRecord.id, filters).catch(error => {
            this.logger.error(`Export processing failed for ID ${exportRecord.id}:`, error);
            this.updateExportStatus(exportRecord.id, ExportStatus.FAILED, undefined, error.message);
        });

        return exportRecord;
    }

    private async processExport(exportId: number, filters: ExportFilterDto) {
        try {
            // Update status to processing
            await this.updateExportStatus(exportId, ExportStatus.PROCESSING);

            // Get export record
            const exportRecord = await this.prisma.dataExport.findUnique({
                where: { id: exportId },
                include: { user: true },
            });

            if (!exportRecord) {
                throw new NotFoundException('Export record not found');
            }

            // Fetch data based on filters
            const data = await this.fetchExportData(filters);

            // Generate file based on format
            const fileInfo = await this.generateExportFile(exportRecord.format, data, exportId);

            // Update export record with file info and complete status
            await this.updateExportStatus(
                exportId,
                ExportStatus.COMPLETED,
                fileInfo.filePath,
                undefined,
                fileInfo.fileName,
                fileInfo.fileSize,
            );

            this.logger.log(`Export ${exportId} completed successfully`);
        } catch (error) {
            this.logger.error(`Export processing failed for ID ${exportId}:`, error);
            await this.updateExportStatus(exportId, ExportStatus.FAILED, undefined, error.message);
        }
    }

    private async fetchExportData(filters: ExportFilterDto) {
        const {
            startDate,
            endDate,
            sensorTypes,
            stationIds,
            severity,
            includeReadings = true,
            includeAlerts = true,
            includeAggregated = false,
        } = filters;

        const whereClause: any = {};

        // Date range filter
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate) whereClause.timestamp.gte = new Date(startDate);
            if (endDate) whereClause.timestamp.lte = new Date(endDate);
        }

        // Sensor type filter
        if (sensorTypes && sensorTypes.length > 0) {
            whereClause.sensor = {
                type: { in: sensorTypes },
            };
        }

        // Station filter
        if (stationIds && stationIds.length > 0) {
            whereClause.sensor = {
                ...whereClause.sensor,
                stationId: { in: stationIds },
            };
        }

        const result: any = {};

        // Fetch sensor readings if requested
        if (includeReadings) {
            result.readings = await this.prisma.sensorReading.findMany({
                where: whereClause,
                include: {
                    sensor: {
                        include: {
                            station: true,
                        },
                    },
                },
                orderBy: { timestamp: 'desc' },
                take: filters.limit || 10000, // Limit to prevent memory issues
            });
        }

        // Fetch alerts if requested
        if (includeAlerts) {
            const alertWhere: any = {};
            if (startDate) alertWhere.createdAt = { gte: new Date(startDate) };
            if (endDate) alertWhere.createdAt = { lte: new Date(endDate) };
            if (severity) alertWhere.severity = severity;
            if (sensorTypes && sensorTypes.length > 0) {
                alertWhere.sensorType = { in: sensorTypes };
            }
            if (stationIds && stationIds.length > 0) {
                alertWhere.stationId = { in: stationIds };
            }

            result.alerts = await this.prisma.stationAlert.findMany({
                where: alertWhere,
                include: {
                    station: true,
                    sensor: true,
                },
                orderBy: { createdAt: 'desc' },
                take: filters.limit || 10000,
            });
        }

        // Fetch aggregated data if requested
        if (includeAggregated) {
            const aggregatedWhere: any = {};
            if (sensorTypes && sensorTypes.length > 0) {
                aggregatedWhere.sensorType = { in: sensorTypes };
            }
            if (stationIds && stationIds.length > 0) {
                aggregatedWhere.stationId = { in: stationIds };
            }
            if (startDate) aggregatedWhere.startTime = { gte: new Date(startDate) };
            if (endDate) aggregatedWhere.endTime = { lte: new Date(endDate) };

            result.aggregated = await this.prisma.aggregatedData.findMany({
                where: aggregatedWhere,
                include: {
                    station: true,
                },
                orderBy: { startTime: 'desc' },
            });
        }

        return result;
    }

    private async generateExportFile(format: ExportFormat, data: any, exportId: number) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `export-${exportId}-${timestamp}`;

        switch (format) {
            case ExportFormat.CSV:
                return await this.generateCsv(data, fileName);
            case ExportFormat.JSON:
                return await this.generateJson(data, fileName);
            case ExportFormat.EXCEL:
                return await this.generateExcel(data, fileName);
            case ExportFormat.PDF:
                return await this.generatePdf(data, fileName);
            default:
                throw new BadRequestException(`Unsupported export format: ${format}`);
        }
    }

    private async generateCsv(data: any, fileName: string) {
        const filePath = path.join(this.exportDir, `${fileName}.csv`);

        // Create CSV writer
        const csvWriter = csv.createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'type', title: 'DATA_TYPE' },
                { id: 'timestamp', title: 'TIMESTAMP' },
                { id: 'sensorType', title: 'SENSOR_TYPE' },
                { id: 'value', title: 'VALUE' },
                { id: 'station', title: 'STATION' },
                { id: 'unit', title: 'UNIT' },
            ],
        });

        const records: CsvRecord[] = [];

        // Process readings
        if (data.readings) {
            for (const reading of data.readings) {
                records.push({
                    type: 'READING',
                    timestamp: reading.timestamp.toISOString(),
                    sensorType: reading.sensor.type,
                    value: reading.value,
                    station: reading.sensor.station.name,
                    unit: reading.unit,
                });
            }
        }

        // Process alerts
        if (data.alerts) {
            for (const alert of data.alerts) {
                records.push({
                    type: 'ALERT',
                    timestamp: alert.createdAt.toISOString(),
                    sensorType: alert.sensorType,
                    value: alert.value,
                    station: alert.station.name,
                    unit: alert.severity,
                });
            }
        }

        await csvWriter.writeRecords(records);

        const stats = fs.statSync(filePath);
        return {
            filePath,
            fileName: `${fileName}.csv`,
            fileSize: stats.size,
        };
    }

    private async generateJson(data: any, fileName: string) {
        const filePath = path.join(this.exportDir, `${fileName}.json`);

        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                recordCount: {
                    readings: data.readings?.length || 0,
                    alerts: data.alerts?.length || 0,
                    aggregated: data.aggregated?.length || 0,
                },
            },
            data,
        };

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

        const stats = fs.statSync(filePath);
        return {
            filePath,
            fileName: `${fileName}.json`,
            fileSize: stats.size,
        };
    }

    private async generateExcel(data: any, fileName: string) {
        const filePath = path.join(this.exportDir, `${fileName}.xlsx`);
        const workbook = new ExcelJS.Workbook();

        // Add readings sheet
        if (data.readings && data.readings.length > 0) {
            const readingsSheet = workbook.addWorksheet('Sensor Readings');
            readingsSheet.columns = [
                { header: 'Timestamp', key: 'timestamp', width: 20 },
                { header: 'Station', key: 'station', width: 15 },
                { header: 'Sensor Type', key: 'sensorType', width: 15 },
                { header: 'Value', key: 'value', width: 15 },
                { header: 'Unit', key: 'unit', width: 10 },
                { header: 'Quality', key: 'quality', width: 10 },
            ];

            data.readings.forEach((reading: any) => {
                readingsSheet.addRow({
                    timestamp: reading.timestamp,
                    station: reading.sensor.station.name,
                    sensorType: reading.sensor.type,
                    value: reading.value,
                    unit: reading.unit,
                    quality: reading.quality,
                });
            });
        }

        // Add alerts sheet
        if (data.alerts && data.alerts.length > 0) {
            const alertsSheet = workbook.addWorksheet('Alerts');
            alertsSheet.columns = [
                { header: 'Created At', key: 'createdAt', width: 20 },
                { header: 'Station', key: 'station', width: 15 },
                { header: 'Sensor Type', key: 'sensorType', width: 15 },
                { header: 'Severity', key: 'severity', width: 12 },
                { header: 'Value', key: 'value', width: 15 },
                { header: 'Threshold', key: 'thresholdValue', width: 15 },
                { header: 'Message', key: 'message', width: 30 },
                { header: 'Acknowledged', key: 'acknowledged', width: 12 },
            ];

            data.alerts.forEach((alert: any) => {
                alertsSheet.addRow({
                    createdAt: alert.createdAt,
                    station: alert.station.name,
                    sensorType: alert.sensorType,
                    severity: alert.severity,
                    value: alert.value,
                    thresholdValue: alert.thresholdValue,
                    message: alert.message,
                    acknowledged: alert.acknowledged ? 'Yes' : 'No',
                });
            });
        }

        await workbook.xlsx.writeFile(filePath);

        const stats = fs.statSync(filePath);
        return {
            filePath,
            fileName: `${fileName}.xlsx`,
            fileSize: stats.size,
        };
    }

    private async generatePdf(data: any, fileName: string) {
        const filePath = path.join(this.exportDir, `${fileName}.pdf`);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Add title
        doc.fontSize(20).text('Environmental Data Export', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown();

        // Add summary
        doc.fontSize(16).text('Summary');
        doc.fontSize(10).text(`Total Readings: ${data.readings?.length || 0}`);
        doc.text(`Total Alerts: ${data.alerts?.length || 0}`);
        doc.text(`Total Aggregated Data: ${data.aggregated?.length || 0}`);
        doc.moveDown();

        // Add recent readings
        if (data.readings && data.readings.length > 0) {
            doc.fontSize(14).text('Recent Readings');
            data.readings.slice(0, 10).forEach((reading: any, index: number) => {
                doc.fontSize(8)
                    .text(`${index + 1}. ${reading.timestamp.toLocaleString()} - ${reading.sensor.station.name} - ${reading.sensor.type}: ${reading.value} ${reading.unit || ''}`);
            });
            doc.moveDown();
        }

        // Add recent alerts
        if (data.alerts && data.alerts.length > 0) {
            doc.addPage();
            doc.fontSize(14).text('Recent Alerts');
            data.alerts.slice(0, 10).forEach((alert: any, index: number) => {
                doc.fontSize(8)
                    .text(`${index + 1}. ${alert.createdAt.toLocaleString()} - ${alert.station.name} - ${alert.sensorType} (${alert.severity}): ${alert.value}`);
                doc.text(`   Message: ${alert.message}`);
            });
        }

        doc.end();

        return new Promise<{ filePath: string; fileName: string; fileSize: number }>((resolve, reject) => {
            stream.on('finish', () => {
                const stats = fs.statSync(filePath);
                resolve({
                    filePath,
                    fileName: `${fileName}.pdf`,
                    fileSize: stats.size,
                });
            });
            stream.on('error', reject);
        });
    }

    async getUserExports(token: string, page: number = 1, limit: number = 10) {
        const userId = await this.getUserIdFromToken(token);
        const skip = (page - 1) * limit;

        const [exports, total] = await Promise.all([
            this.prisma.dataExport.findMany({
                where: { userId: userId },
                orderBy: { createdAt: 'desc' },
                skip,
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
            }),
            this.prisma.dataExport.count({
                where: { userId: userId },
            }),
        ]);

        return {
            exports,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getExportById(exportId: number, token: string) {
        const userId = await this.getUserIdFromToken(token);
        const exportRecord = await this.prisma.dataExport.findFirst({
            where: {
                id: exportId,
                userId: userId, // Ensure user can only access their own exports
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

        if (!exportRecord) {
            throw new NotFoundException('Export not found');
        }

        return exportRecord;
    }

    async downloadExport(exportId: number, token: string, res: Response) {
        const exportRecord = await this.getExportById(exportId, token);

        if (exportRecord.status !== ExportStatus.COMPLETED) {
            throw new BadRequestException('Export is not ready for download');
        }

        if (!exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
            throw new NotFoundException('Export file not found');
        }

        const filename = exportRecord.fileName || `export-${exportId}.${this.getFileExtension(exportRecord.format)}`;

        res.setHeader('Content-Type', this.getMimeType(exportRecord.format));
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', exportRecord.fileSize?.toString() || '0');

        return fs.createReadStream(exportRecord.filePath).pipe(res);
    }

    async cancelExport(exportId: number, token: string) {
        const exportRecord = await this.getExportById(exportId, token);

        if (exportRecord.status !== ExportStatus.PENDING && exportRecord.status !== ExportStatus.PROCESSING) {
            throw new BadRequestException('Cannot cancel export in current status');
        }

        return this.prisma.dataExport.update({
            where: { id: exportId },
            data: {
                status: ExportStatus.CANCELLED,
                completedAt: new Date(),
            },
        });
    }

    async deleteExport(exportId: number, token: string) {
        const exportRecord = await this.getExportById(exportId, token);

        // Delete physical file if exists
        if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
            try {
                fs.unlinkSync(exportRecord.filePath);
            } catch (error) {
                this.logger.warn(`Failed to delete file: ${exportRecord.filePath}`, error);
            }
        }

        return this.prisma.dataExport.delete({
            where: { id: exportId },
        });
    }

    async cleanupOldExports(days: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const oldExports = await this.prisma.dataExport.findMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });

        let deletedCount = 0;
        let errorCount = 0;

        for (const exportRecord of oldExports) {
            try {
                // Delete physical file
                if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
                    fs.unlinkSync(exportRecord.filePath);
                }

                // Delete database record
                await this.prisma.dataExport.delete({
                    where: { id: exportRecord.id },
                });

                deletedCount++;
            } catch (error) {
                this.logger.error(`Failed to delete export ${exportRecord.id}:`, error);
                errorCount++;
            }
        }

        this.logger.log(`Cleanup completed: ${deletedCount} exports deleted, ${errorCount} errors`);

        return {
            deletedCount,
            errorCount,
            totalProcessed: oldExports.length,
        };
    }

    private async updateExportStatus(
        exportId: number,
        status: ExportStatus,
        filePath?: string,
        errorMessage?: string,
        fileName?: string,
        fileSize?: number,
    ) {
        const updateData: any = {
            status,
            updatedAt: new Date(),
        };

        if (status === ExportStatus.PROCESSING) {
            updateData.startedAt = new Date();
        } else if (status === ExportStatus.COMPLETED || status === ExportStatus.FAILED || status === ExportStatus.CANCELLED) {
            updateData.completedAt = new Date();
        }

        if (filePath) updateData.filePath = filePath;
        if (fileName) updateData.fileName = fileName;
        if (fileSize) updateData.fileSize = fileSize;
        if (errorMessage) updateData.errorMessage = errorMessage;

        return this.prisma.dataExport.update({
            where: { id: exportId },
            data: updateData,
        });
    }

    private getFileExtension(format: ExportFormat): string {
        switch (format) {
            case ExportFormat.CSV:
                return 'csv';
            case ExportFormat.JSON:
                return 'json';
            case ExportFormat.EXCEL:
                return 'xlsx';
            case ExportFormat.PDF:
                return 'pdf';
            default:
                return 'bin';
        }
    }

    private getMimeType(format: ExportFormat): string {
        switch (format) {
            case ExportFormat.CSV:
                return 'text/csv';
            case ExportFormat.JSON:
                return 'application/json';
            case ExportFormat.EXCEL:
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case ExportFormat.PDF:
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }

    private async getUserIdFromToken(token: string): Promise<number> {
        const session = await this.sessionService.validateSession(token);
        if (!session) {
            throw new UnauthorizedException('Invalid session');
        }
        return session.user.id;
    }
}