import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { PrismaService } from '../prisma/prisma.service';
import {SensorType, AlertSeverity} from '@prisma/client';

@Injectable()
export class ThresholdService {
  constructor(private prisma: PrismaService) {}

  async create(createThresholdDto: CreateThresholdDto) {
    // Validate threshold values
    this.validateThresholdValues(createThresholdDto);

    // Check if threshold with same sensorType and severity already exists
    const existingThreshold = await this.prisma.threshold.findUnique({
      where: {
        sensorType_severity: {
          sensorType: createThresholdDto.sensorType,
          severity: createThresholdDto.severity,
        },
      },
    });

    if (existingThreshold) {
      throw new ConflictException(
          `Threshold with sensorType ${createThresholdDto.sensorType} and severity ${createThresholdDto.severity} already exists`,
      );
    }

    return this.prisma.threshold.create({
      data: createThresholdDto,
    });
  }

  async findAll() {
    return this.prisma.threshold.findMany({
      orderBy: [
        { sensorType: 'asc' },
        { severity: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const threshold = await this.prisma.threshold.findUnique({
      where: { id },
    });

    if (!threshold) {
      throw new NotFoundException(`Threshold with ID ${id} not found`);
    }

    return threshold;
  }

  async findBySensorType(sensorType: SensorType) {
    return this.prisma.threshold.findMany({
      where: {
        sensorType,
        isActive: true
      },
      orderBy: { severity: 'asc' },
    });
  }

  async update(id: number, updateThresholdDto: UpdateThresholdDto) {
    // Check if threshold exists
    await this.findOne(id);

    // Validate threshold values if they are being updated
    if (updateThresholdDto.minValue !== undefined || updateThresholdDto.maxValue !== undefined) {
      this.validateThresholdValues(updateThresholdDto as CreateThresholdDto);
    }

    // If updating sensorType or severity, check for duplicates
    if (updateThresholdDto.sensorType || updateThresholdDto.severity) {
      const currentThreshold = await this.findOne(id);
      const sensorType = updateThresholdDto.sensorType || currentThreshold.sensorType;
      const severity = updateThresholdDto.severity || currentThreshold.severity;

      const existingThreshold = await this.prisma.threshold.findUnique({
        where: {
          sensorType_severity: {
            sensorType,
            severity,
          },
        },
      });

      if (existingThreshold && existingThreshold.id !== id) {
        throw new ConflictException(
            `Threshold with sensorType ${sensorType} and severity ${severity} already exists`,
        );
      }
    }

    return this.prisma.threshold.update({
      where: { id },
      data: updateThresholdDto,
    });
  }

  async remove(id: number) {
    // Check if threshold exists
    await this.findOne(id);

    return this.prisma.threshold.delete({
      where: { id },
    });
  }

  async activateThreshold(id: number) {
    await this.findOne(id); // Check if exists

    return this.prisma.threshold.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivateThreshold(id: number) {
    await this.findOne(id); // Check if exists

    return this.prisma.threshold.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Validation method for threshold values
  private validateThresholdValues(dto: CreateThresholdDto | UpdateThresholdDto) {
    const { minValue, maxValue } = dto;

    // At least one value must be provided
    if (minValue === undefined && maxValue === undefined) {
      throw new BadRequestException('Either minValue or maxValue must be provided');
    }

    // If both values are provided, validate their relationship
    if (minValue !== undefined && maxValue !== undefined) {
      if (minValue >= maxValue) {
        throw new BadRequestException('minValue must be less than maxValue');
      }
    }

    // Validate values are not negative (for most sensor types)
    if (minValue !== undefined && minValue < 0) {
      throw new BadRequestException('minValue cannot be negative');
    }

    if (maxValue !== undefined && maxValue < 0) {
      throw new BadRequestException('maxValue cannot be negative');
    }
  }

  // Method to validate sensor reading against thresholds
  async validateSensorReading(sensorType: SensorType, value: number) {
    const activeThresholds = await this.prisma.threshold.findMany({
      where: {
        sensorType,
        isActive: true
      },
      orderBy: { severity: 'asc' },
    });

    const violations: {
      thresholdId: number;
      severity: AlertSeverity;
      minValue: number | null;
      maxValue: number | null;
      description: string | null;
      actualValue: number;
    }[] = [];

    for (const threshold of activeThresholds) {
      let isViolated = false;

      if (threshold.minValue !== null && value < threshold.minValue) {
        isViolated = true;
      }

      if (threshold.maxValue !== null && value > threshold.maxValue) {
        isViolated = true;
      }

      if (isViolated) {
        violations.push({
          thresholdId: threshold.id,
          severity: threshold.severity,
          minValue: threshold.minValue,
          maxValue: threshold.maxValue,
          description: threshold.description,
          actualValue: value,
        });
      }
    }

    return violations;
  }

}
