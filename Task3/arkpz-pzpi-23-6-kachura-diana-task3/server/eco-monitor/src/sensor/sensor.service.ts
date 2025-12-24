import {Injectable, NotFoundException} from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import {PrismaService} from "../prisma/prisma.service";
import {Prisma, SensorType} from "@prisma/client";

@Injectable()
export class SensorService {
  constructor(private prisma: PrismaService) {}
  async create(createSensorDto: CreateSensorDto) {
    return this.prisma.$transaction(async (tx) => {
      // Filter out fields that don't exist in Prisma schema (description, location)
      const { description, location, ...validSensorData } = createSensorDto as any;
      
      const sensorData = {
        ...validSensorData,
        statusHistory: {
          create: {
            isOnline: true,
          },
        } as Prisma.SensorStatusCreateNestedManyWithoutSensorInput,
      };
      const createArgs: Prisma.SensorCreateArgs = {
        data: sensorData as Prisma.SensorUncheckedCreateInput,
      };
      const sensor = await tx.sensor.create(createArgs);

      return sensor;
    });
  }

  async findInStation(stationId: number) {
    const queryArgs: Prisma.SensorFindManyArgs = {
      where: { stationId: stationId },
      include: {
        statusHistory: {
          take: 1,
          orderBy: { lastCheck: 'desc' },
        },
      },
    };
    return this.prisma.sensor.findMany(queryArgs);
  }

  async getAll(){
    const queryArgs: Prisma.SensorFindManyArgs = {
      include: {
        statusHistory: {
          take: 1, // Get only the latest status
          orderBy: { lastCheck: 'desc' },
        },
      },
    };
    return this.prisma.sensor.findMany(queryArgs)
  }

  async getTypeSensors(type: SensorType){
    const queryArgs: Prisma.SensorFindManyArgs = {
      where: { type },
      include: {
        statusHistory: {
          take: 1,
          orderBy: { lastCheck: 'desc' },
        },
      },
    };
    return this.prisma.sensor.findMany(queryArgs)
  }

  async setActive(id: number){
    return this.prisma.sensor.update({
      where: { id: id },
      data: { isActive: true },
    });
  }

  async setInactive(id: number){
    return this.prisma.sensor.update({
      where: { id: id },
      data: { isActive: false },
    });
  }

  async sensorCalibration(id: number) {
    return this.prisma.sensor.update({
      where: { id: id },
      data: { calibrationDate: new Date() },
    });
  }

  async getSensorStatus(id: number){
    const status = await this.prisma.sensorStatus.findFirst({
      where: { id },
      orderBy: { lastCheck: 'desc' },
    } as any );
    if (!status) {
      throw new NotFoundException(
          `No status found for sensor with ID ${id}`,
      );
    }
    return status;
  }

  async getSensorStatusHistory(id: number){
    return this.prisma.sensorStatus.findMany({
      where: { id },
      orderBy: { lastCheck: 'desc' }, // Latest first
    } as any );
  }

  async findOne(id: number) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        statusHistory: {
          take: 1,
          orderBy: { lastCheck: 'desc' },
        },
      },
    } as any );
    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }
    return sensor;
  }

  async update(id: number, updateSensorDto: UpdateSensorDto) {
    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
    });
  }

  async remove(id: number) {
    return this.prisma.sensor.delete({
      where: { id },
    });
  }
}
