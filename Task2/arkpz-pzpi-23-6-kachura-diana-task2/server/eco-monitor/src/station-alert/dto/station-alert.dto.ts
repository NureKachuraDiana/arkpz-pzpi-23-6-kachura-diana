import { ApiProperty } from '@nestjs/swagger';
import { SensorType, AlertSeverity } from '@prisma/client';

export class StationAlertDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    stationId: number;

    @ApiProperty({ required: false, nullable: true })
    sensorId?: number | null;
    @ApiProperty({ enum: SensorType })
    sensorType: SensorType;

    @ApiProperty()
    value: number;

    @ApiProperty()
    thresholdValue: number;

    @ApiProperty({ enum: AlertSeverity })
    severity: AlertSeverity;

    @ApiProperty()
    message: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    acknowledged: boolean;

    @ApiProperty({ required: false, nullable: true })
    acknowledgedBy?: number | null;

    @ApiProperty({ required: false, nullable: true })
    acknowledgedAt?: Date | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty({ required: false, nullable: true })
    resolvedAt?: Date | null;

    // Include related data if needed
    @ApiProperty({ required: false })
    station?: { name: string; latitude: number; longitude: number };

    @ApiProperty({ required: false, nullable: true })
    sensor?: { name: string; serialNumber: string } | null;

    constructor(partial: Partial<StationAlertDto>) {
        Object.assign(this, partial);
    }
}

