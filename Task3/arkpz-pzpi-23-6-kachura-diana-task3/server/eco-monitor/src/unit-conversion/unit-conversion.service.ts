import { Injectable } from '@nestjs/common';
import { SensorType } from '@prisma/client';

export interface ConversionResult {
    value: number;
    unit: string;
}

export interface ConversionOptions {
    fromUnit: 'metric' | 'imperial';
    toUnit: 'metric' | 'imperial';
}

@Injectable()
export class UnitConversionService {
    convertValue(
        value: number,
        sensorType: SensorType,
        options: ConversionOptions
    ): ConversionResult {
        if (options.fromUnit === options.toUnit) {
            // If the units are the same, return as is with the correct unit.
            return options.fromUnit === 'metric'
                ? this.toMetric(value, sensorType)
                : this.toImperial(value, sensorType);
        }

        if (options.fromUnit === 'metric' && options.toUnit === 'imperial') {
            return this.metricToImperial(value, sensorType);
        } else {
            return this.imperialToMetric(value, sensorType);
        }
    }

    private metricToImperial(value: number, sensorType: SensorType): ConversionResult {
        switch (sensorType) {
            case SensorType.TEMPERATURE:
                // Celsius to Fahrenheit
                return { value: (value * 9/5) + 32, unit: '°F' };

            case SensorType.PRESSURE:
                // hPa → inHg
                return { value: value * 0.02953, unit: 'inHg' };

            case SensorType.PM2_5:
            case SensorType.PM10:
                // µg/m³ the same
                return { value, unit: 'µg/m³' };

            case SensorType.NOISE:
                return { value, unit: 'dB' };

            case SensorType.HUMIDITY:
                return { value, unit: '%' };

            case SensorType.CO2:
                return { value, unit: 'ppm' };

            case SensorType.AIR_QUALITY:
                // Air Quality Index (no units)
                return { value, unit: 'AQI' };

            case SensorType.WATER_QUALITY:
                // Water Quality Index (no units)
                return { value, unit: 'WQI' };

            default:
                return { value, unit: '' };
        }
    }

    private imperialToMetric(value: number, sensorType: SensorType): ConversionResult {
        switch (sensorType) {
            case SensorType.TEMPERATURE:
                // Fahrenheit to Celsius
                return { value: (value - 32) * 5/9, unit: '°C' };

            case SensorType.PRESSURE:
                // inHg → hPa
                return { value: value / 0.02953, unit: 'hPa' };

            case SensorType.PM2_5:
            case SensorType.PM10:
                return { value, unit: 'µg/m³' };

            case SensorType.NOISE:
                return { value, unit: 'dB' };

            case SensorType.HUMIDITY:
                return { value, unit: '%' };

            case SensorType.CO2:
                return { value, unit: 'ppm' };

            case SensorType.AIR_QUALITY:
                return { value, unit: 'AQI' };

            case SensorType.WATER_QUALITY:
                return { value, unit: 'WQI' };

            default:
                return { value, unit: '' };
        }
    }

    private toMetric(value: number, sensorType: SensorType): ConversionResult {
        switch (sensorType) {
            case SensorType.TEMPERATURE:
                return { value, unit: '°C' };

            case SensorType.PRESSURE:
                return { value, unit: 'hPa' };

            case SensorType.PM2_5:
            case SensorType.PM10:
                return { value, unit: 'µg/m³' };

            case SensorType.NOISE:
                return { value, unit: 'dB' };

            case SensorType.HUMIDITY:
                return { value, unit: '%' };

            case SensorType.CO2:
                return { value, unit: 'ppm' };

            case SensorType.AIR_QUALITY:
                return { value, unit: 'AQI' };

            case SensorType.WATER_QUALITY:
                return { value, unit: 'WQI' };

            default:
                return { value, unit: '' };
        }
    }

    private toImperial(value: number, sensorType: SensorType): ConversionResult {
        switch (sensorType) {
            case SensorType.TEMPERATURE:
                return { value, unit: '°F' };

            case SensorType.PRESSURE:
                return { value, unit: 'inHg' };

            case SensorType.PM2_5:
            case SensorType.PM10:
                return { value, unit: 'µg/m³' };

            case SensorType.NOISE:
                return { value, unit: 'dB' };

            case SensorType.HUMIDITY:
                return { value, unit: '%' };

            case SensorType.CO2:
                return { value, unit: 'ppm' };

            case SensorType.AIR_QUALITY:
                return { value, unit: 'AQI' };

            case SensorType.WATER_QUALITY:
                return { value, unit: 'WQI' };

            default:
                return { value, unit: '' };
        }
    }

    // Method for determining which system stores data in a database
    getStorageUnitSystem(): 'metric' | 'imperial' {

        return 'metric';
    }

    // A simplified method for backward compatibility
    convertValueSimple(value: number, sensorType: SensorType, targetUnit: string): ConversionResult {
        const storageSystem = this.getStorageUnitSystem();

        return this.convertValue(value, sensorType, {
            fromUnit: storageSystem,
            toUnit: targetUnit as 'metric' | 'imperial'
        });
    }

    getDefaultUnit(sensorType: SensorType, measurementUnit: string): string {
        return measurementUnit === 'metric'
            ? this.toMetric(0, sensorType).unit
            : this.toImperial(0, sensorType).unit;
    }

    // Method for obtaining units of measurement in a storage system
    getStorageUnit(sensorType: SensorType): string {
        const storageSystem = this.getStorageUnitSystem();
        return storageSystem === 'metric'
            ? this.toMetric(0, sensorType).unit
            : this.toImperial(0, sensorType).unit;
    }
}
