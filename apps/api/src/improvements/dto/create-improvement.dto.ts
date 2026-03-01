import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateImprovementDto {
    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    suggestion_text!: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;
}
