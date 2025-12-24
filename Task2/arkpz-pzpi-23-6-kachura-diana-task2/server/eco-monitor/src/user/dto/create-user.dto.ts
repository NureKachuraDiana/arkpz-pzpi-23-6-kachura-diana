import {ApiProperty} from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(20)
    password: string;
}
