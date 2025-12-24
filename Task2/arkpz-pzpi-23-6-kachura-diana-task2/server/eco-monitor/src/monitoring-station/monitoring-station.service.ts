import {Injectable, NotFoundException} from '@nestjs/common';
import { CreateMonitoringStationDto } from './dto/create-monitoring-station.dto';
import { UpdateMonitoringStationDto } from './dto/update-monitoring-station.dto';
import { GetMonitoringStationInRadiusDto} from "./dto/get-monitoring-station-in-radius.dto";
import {PrismaService} from "../prisma/prisma.service";
import {Prisma} from "@prisma/client";

@Injectable()
export class MonitoringStationService {
  constructor(private prisma: PrismaService) {}
  async create(createMonitoringStationDto: CreateMonitoringStationDto) {
    const data: any = {
      name: createMonitoringStationDto.name,
      latitude: createMonitoringStationDto.latitude,
      longitude: createMonitoringStationDto.longitude,
      description: createMonitoringStationDto.description || null,
      address: createMonitoringStationDto.address || null,
      isActive: createMonitoringStationDto.isActive ?? true,
    };
    
    // Add altitude if provided
    if (createMonitoringStationDto.altitude !== undefined) {
      data.altitude = createMonitoringStationDto.altitude;
    }
    
    return this.prisma.monitoringStation.create({
      data,
    });
  }

  async findAll() {
    console.log("MonitoringStationService: Finding all active stations");
    const stations = await this.prisma.monitoringStation.findMany({
      where: { isActive: true },
      include: {
        sensors: true,
        stationAlerts: true,
      },
    });
    console.log(`MonitoringStationService: Found ${stations.length} active stations`);
    return stations;
  }

  async findInRadius(getMonitoringStationInRadiusDto: GetMonitoringStationInRadiusDto) {
    const {longitude, latitude, radius} = getMonitoringStationInRadiusDto
    return this.prisma.$queryRaw`
      SELECT * FROM monitoring_stations 
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(${longitude}, ${latitude})::geography,
        ${radius}
      )
      AND isActive = true
    `;
  }

  async findOne(id: number) {
    const station = await this.prisma.monitoringStation.findUnique({
      where: { id }
    });

    if (!station) {
      throw new NotFoundException(`Monitoring station with ID ${id} not found`);
    }

    return station;
  }

  async update(id: number, updateMonitoringStationDto: UpdateMonitoringStationDto) {
    try {
      const updateData: any = {};
      
      if (updateMonitoringStationDto.name !== undefined) {
        updateData.name = updateMonitoringStationDto.name;
      }
      if (updateMonitoringStationDto.latitude !== undefined) {
        updateData.latitude = updateMonitoringStationDto.latitude;
      }
      if (updateMonitoringStationDto.longitude !== undefined) {
        updateData.longitude = updateMonitoringStationDto.longitude;
      }
      if (updateMonitoringStationDto.description !== undefined) {
        updateData.description = updateMonitoringStationDto.description || null;
      }
      if (updateMonitoringStationDto.altitude !== undefined) {
        updateData.altitude = updateMonitoringStationDto.altitude ?? null;
      }
      if (updateMonitoringStationDto.address !== undefined) {
        updateData.address = updateMonitoringStationDto.address || null;
      }
      if (updateMonitoringStationDto.isActive !== undefined) {
        updateData.isActive = updateMonitoringStationDto.isActive;
      }

      return await this.prisma.monitoringStation.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Monitoring station with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.monitoringStation.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Monitoring station with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  async deactivateStation(id: number) {
    try {
      return await this.prisma.monitoringStation.update({
        where: { id },
        data: {
       isActive: false
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Monitoring station with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  async activateStation(id: number) {
    try {
      return await this.prisma.monitoringStation.update({
        where: { id },
        data: {
          isActive: true
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Monitoring station with ID ${id} not found`);
        }
      }
      throw error;
    }
  }
}
