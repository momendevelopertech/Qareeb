import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
    @IsString()
    @MaxLength(20)
    @Matches(/^\+?[0-9]{8,15}$/, { message: 'whatsapp must be a valid phone number' })
    whatsapp?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;
}
