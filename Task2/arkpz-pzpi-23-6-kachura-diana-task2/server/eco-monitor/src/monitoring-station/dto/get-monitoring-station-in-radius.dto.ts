import {ApiProperty} from "@nestjs/swagger";
import {IsNumber, Max, Min} from "class-validator";

export class GetMonitoringStationInRadiusDto {
    @ApiProperty({ example: '45.000493', required: true })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({ example: '-13.000493', required: true })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({ example: '5', required: true })
    @IsNumber()
    @Min(-180)
    @Max(180)
    radius: number;
}