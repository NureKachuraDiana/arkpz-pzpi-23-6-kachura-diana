import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import { BackupStatus } from "@prisma/client";

const exec = promisify(child_process.exec);

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly backupDirectory = path.join(process.cwd(), 'backups');
    private readonly dbBackupPath = path.join(this.backupDirectory, 'db');
    private readonly fileSystemBackupPath = path.join(this.backupDirectory, 'filesystem');

    private readonly pgDumpPath = process.env.PG_DUMP_PATH || 'C:\\Program Files\\PostgreSQL\\9.4\\bin\\pg_dump';
    private readonly dbHost = process.env.DB_HOST || 'localhost';
    private readonly dbPort = process.env.DB_PORT || '5432';
    private readonly dbName = process.env.DB_NAME;
    private readonly dbUser = process.env.DB_USER;
    private readonly dbPassword = process.env.DB_PASSWORD;

    private activeBackupProcesses: Map<number, child_process.ChildProcess> = new Map();

    constructor(private readonly prisma: PrismaService) {
        this.ensureBackupDirectories();
    }

    private async ensureBackupDirectories(): Promise<void> {
        try {
            await fsPromises.access(this.backupDirectory);
        } catch {
            await fsPromises.mkdir(this.backupDirectory, { recursive: true });
        }

        try {
            await fsPromises.access(this.dbBackupPath);
        } catch {
            await fsPromises.mkdir(this.dbBackupPath, { recursive: true });
        }

        try {
            await fsPromises.access(this.fileSystemBackupPath);
        } catch {
            await fsPromises.mkdir(this.fileSystemBackupPath, { recursive: true });
        }
    }

    async createBackup(
        type: 'database' | 'full' = 'database',
        description?: string,
    ): Promise<any> {
        const backupRecord = await this.prisma.systemBackup.create({
            data: {
                fileName: '',
                filePath: '',
                status: BackupStatus.PENDING,
                description,
                startedAt: new Date(),
            },
        });

        try {
            let result;
            if (type === 'full') {
                result = await this.createFullBackupInternal(backupRecord.id);
            } else {
                result = await this.createDatabaseBackupInternal(backupRecord.id);
            }

            return result;
        } catch (error) {
            this.logger.error(`Backup creation failed: ${error.message}`, error.stack);
            await this.prisma.systemBackup.update({
                where: { id: backupRecord.id },
                data: {
                    status: BackupStatus.FAILED,
                    errorMessage: error.message,
                    completedAt: new Date(),
                },
            });
            throw error;
        }
    }

    private async createDatabaseBackupInternal(backupId: number): Promise<any> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${timestamp}.sql`;
        const filePath = path.join(this.dbBackupPath, fileName);

        try {
            await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: { fileName, filePath },
            });

            if (!this.dbName || !this.dbUser) {
                throw new Error('Database configuration is not set. Check DB_NAME and DB_USER environment variables.');
            }

            const command = `"${this.pgDumpPath}" -U ${this.dbUser} -h ${this.dbHost} -p ${this.dbPort} -d ${this.dbName}`;

            this.logger.log(`Starting database backup with command: ${command}`);
            this.logger.log(`Output file: ${filePath}`);

            const childProcess = child_process.exec(command, {
                env: { ...process.env, PGPASSWORD: this.dbPassword },
                maxBuffer: 1024 * 1024 * 10
            });

            this.activeBackupProcesses.set(backupId, childProcess);

            let stdout = '';
            let stderr = '';

            childProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            childProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            await new Promise((resolve, reject) => {
                childProcess.on('exit', (code) => {
                    this.activeBackupProcesses.delete(backupId);

                    if (code === 0) {
                        fs.writeFile(filePath, stdout, (writeError) => {
                            if (writeError) {
                                reject(new Error(`Error writing backup file: ${writeError.message}`));
                            } else {
                                resolve(null);
                            }
                        });
                    } else {
                        const errorMsg = `pg_dump process exited with code ${code}. stderr: ${stderr}`;
                        reject(new Error(errorMsg));
                    }
                });

                childProcess.on('error', (error) => {
                    this.activeBackupProcesses.delete(backupId);
                    reject(new Error(`Failed to start pg_dump: ${error.message}`));
                });
            });

            const stats = await fsPromises.stat(filePath);
            if (stats.size === 0) {
                throw new Error('Backup file is empty');
            }

            const fileSizeMB = stats.size / (1024 * 1024);

            const updatedBackup = await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: {
                    fileSize: parseFloat(fileSizeMB.toFixed(2)),
                    status: BackupStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });

            this.logger.log(`Database backup completed: ${fileName} (${fileSizeMB.toFixed(2)} MB)`);
            return updatedBackup;
        } catch (error) {
            await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: {
                    status: BackupStatus.FAILED,
                    errorMessage: error.message,
                    completedAt: new Date(),
                },
            });
            throw error;
        }
    }

    private async createFullBackupInternal(backupId: number): Promise<any> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sqlFileName = `backup_${timestamp}.sql`;
        const zipFileName = `backup_${timestamp}.zip`;
        const sqlFilePath = path.join(this.dbBackupPath, sqlFileName);
        const zipFilePath = path.join(this.fileSystemBackupPath, zipFileName);

        try {
            await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: { fileName: zipFileName, filePath: zipFilePath },
            });

            if (!this.dbName || !this.dbUser) {
                throw new Error('Database configuration is not set. Check DB_NAME and DB_USER environment variables.');
            }

            const command = `"${this.pgDumpPath}" -U ${this.dbUser} -h ${this.dbHost} -p ${this.dbPort} -d ${this.dbName}`;

            this.logger.log(`Creating database dump...`);

            const { stdout } = await exec(command, {
                env: { ...process.env, PGPASSWORD: this.dbPassword },
                maxBuffer: 1024 * 1024 * 10
            });

            await fsPromises.writeFile(sqlFilePath, stdout);
            this.logger.log(`Database dump created: ${sqlFilePath}`);

            await this.createArchive(sqlFilePath, zipFilePath);

            await fsPromises.unlink(sqlFilePath);

            const stats = await fsPromises.stat(zipFilePath);
            const fileSizeMB = stats.size / (1024 * 1024);

            const updatedBackup = await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: {
                    fileSize: parseFloat(fileSizeMB.toFixed(2)),
                    status: BackupStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });

            this.logger.log(`Full backup completed: ${zipFileName} (${fileSizeMB.toFixed(2)} MB)`);
            return updatedBackup;
        } catch (error) {
            try {
                await fsPromises.unlink(sqlFilePath).catch(() => {});
            } catch {}

            await this.prisma.systemBackup.update({
                where: { id: backupId },
                data: {
                    status: BackupStatus.FAILED,
                    errorMessage: error.message,
                    completedAt: new Date(),
                },
            });
            throw error;
        }
    }

    private async createArchive(databaseBackupPath: string, archivePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                this.logger.log(`Archive created: ${archivePath} (${archive.pointer()} bytes)`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            const databaseBackupName = path.basename(databaseBackupPath);
            archive.file(databaseBackupPath, { name: databaseBackupName });

            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (fs.existsSync(uploadsDir)) {
                archive.directory(uploadsDir, 'uploads');
            }

            const configFiles = ['.env', 'package.json', 'docker-compose.yml'];
            configFiles.forEach(file => {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: file });
                }
            });

            archive.finalize();
        });
    }

    async checkPgDump(): Promise<{ available: boolean; version?: string; error?: string }> {
        try {
            const command = `"${this.pgDumpPath}" --version`;
            const { stdout } = await exec(command);
            const version = stdout.trim();
            return { available: true, version };
        } catch (error) {
            const errorMsg = `pg_dump not found or not accessible at: ${this.pgDumpPath}`;
            return { available: false, error: errorMsg };
        }
    }

    async listBackups(
        skip: number = 0,
        take: number = 10,
        status?: BackupStatus,
    ): Promise<any[]> {
        const where = status ? { status } : {};

        return this.prisma.systemBackup.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                status: true,
                description: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
            },
        });
    }

    async getBackup(id: number): Promise<any> {
        const backup = await this.prisma.systemBackup.findUnique({
            where: { id },
        });

        if (!backup) {
            throw new NotFoundException(`Backup with ID ${id} not found`);
        }

        return backup;
    }

    async cancelBackup(id: number): Promise<any> {
        const backup = await this.prisma.systemBackup.findUnique({
            where: { id },
        });

        if (!backup) {
            throw new NotFoundException(`Backup with ID ${id} not found`);
        }

        if (backup.status !== BackupStatus.PENDING) {
            throw new Error(`Cannot cancel backup with status ${backup.status}`);
        }

        const process = this.activeBackupProcesses.get(id);
        if (process) {
            process.kill('SIGTERM');
            this.activeBackupProcesses.delete(id);
        }

        const updatedBackup = await this.prisma.systemBackup.update({
            where: { id },
            data: {
                status: BackupStatus.CANCELLED,
                completedAt: new Date(),
                errorMessage: 'Backup cancelled by user',
            },
        });

        this.logger.log(`Backup ${id} cancelled`);
        return updatedBackup;
    }

    async getBackupFileStream(id: number): Promise<{ stream: fs.ReadStream; fileName: string }> {
        const backup = await this.prisma.systemBackup.findUnique({
            where: { id },
        });

        if (!backup) {
            throw new NotFoundException(`Backup with ID ${id} not found`);
        }

        if (backup.status !== BackupStatus.COMPLETED) {
            throw new Error(`Backup with status ${backup.status} cannot be downloaded`);
        }

        if (!backup.filePath) {
            throw new Error('Backup file path not found');
        }

        try {
            await fsPromises.access(backup.filePath);
            const stream = fs.createReadStream(backup.filePath);
            return { stream, fileName: backup.fileName };
        } catch (error) {
            throw new NotFoundException(`Backup file not found: ${backup.filePath}`);
        }
    }

    async deleteBackup(id: number): Promise<void> {
        const backup = await this.prisma.systemBackup.findUnique({
            where: { id },
        });

        if (!backup) {
            throw new NotFoundException(`Backup with ID ${id} not found`);
        }

        if (backup.filePath) {
            try {
                await fsPromises.unlink(backup.filePath);
            } catch (error) {
                this.logger.warn(`Could not delete backup file: ${backup.filePath}`, error.message);
            }
        }

        await this.prisma.systemBackup.delete({
            where: { id },
        });
    }

    async getBackupStats(): Promise<{
        total: number;
        completed: number;
        failed: number;
        pending: number;
        cancelled: number;
        totalSizeMB: number;
    }> {
        const backups = await this.prisma.systemBackup.findMany();
        const completedBackups = backups.filter(b => b.status === BackupStatus.COMPLETED);

        return {
            total: backups.length,
            completed: completedBackups.length,
            failed: backups.filter(b => b.status === BackupStatus.FAILED).length,
            pending: backups.filter(b => b.status === BackupStatus.PENDING).length,
            cancelled: backups.filter(b => b.status === BackupStatus.CANCELLED).length,
            totalSizeMB: completedBackups
                .filter(b => b.fileSize)
                .reduce((sum, backup) => sum + (backup.fileSize || 0), 0),
        };
    }
}