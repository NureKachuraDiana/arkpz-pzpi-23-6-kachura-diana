import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {ApiProperty} from "@nestjs/swagger";
import {IsEmail, IsNotEmpty, MaxLength, MinLength} from "class-validator";

export class LoginUserDto extends PartialType(CreateUserDto) {
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
