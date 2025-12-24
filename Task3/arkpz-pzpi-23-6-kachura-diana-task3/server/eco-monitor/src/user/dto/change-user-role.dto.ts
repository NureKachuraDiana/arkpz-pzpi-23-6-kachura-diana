import {ApiParam, ApiProperty} from "@nestjs/swagger";
import {IsEmail, IsNotEmpty, MaxLength, MinLength} from "class-validator";

export class ChangeUserRoleDto {
    @ApiProperty({ example: '12' })
    @IsNotEmpty()
    id: number;

    @ApiProperty({ example: 'ADMIN, OBSERVER' })
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(20)
    role: string;
}