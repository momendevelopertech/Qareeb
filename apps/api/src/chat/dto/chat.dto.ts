import { IsNumber, IsOptional, IsString } from 'class-validator';

export class NearestChatDto {
    @IsString()
    text!: string;

    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lng?: number;
}
