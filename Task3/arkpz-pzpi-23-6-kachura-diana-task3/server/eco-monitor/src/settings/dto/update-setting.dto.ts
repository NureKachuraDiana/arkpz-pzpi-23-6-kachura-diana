import {ApiProperty} from "@nestjs/swagger";
import {IsBoolean, IsOptional, IsString} from "class-validator";


export class UpdateSettingDto {
    @ApiProperty({ example: 'uk', required: false })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiProperty({ example: 'metric', required: false })
    @IsString()
    @IsOptional()
    measurementUnit?: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    notificationsEnabled?: boolean;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    darkModeEnabled?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    emailNotifications?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    pushNotifications?: boolean;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    smsNotifications?: boolean;
}
