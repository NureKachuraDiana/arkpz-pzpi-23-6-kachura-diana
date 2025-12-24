import { SensorReading, StationAlert, AggregatedData } from '@prisma/client';

export interface ExportResult {
    readings?: SensorReading[];
    alerts?: StationAlert[];
    aggregated?: AggregatedData[];
    metadata: {
        exportedAt: Date;
        recordCount: {
            readings: number;
            alerts: number;
            aggregated: number;
        };
    };
}