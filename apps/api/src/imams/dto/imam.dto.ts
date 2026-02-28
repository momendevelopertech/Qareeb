import { IsString, IsOptional, IsNumber, IsUrl, IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateImamDto {
    @IsString()
    @IsNotEmpty()
    imam_name!: string;

    @IsString()
    @IsNotEmpty()
    mosque_name!: string;

    @IsString()
    @IsNotEmpty()
    governorate!: string;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    city?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsUUID()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    area_id?: string;

    @IsUrl()
    @IsNotEmpty()
    google_maps_url!: string;

    @IsUrl()
    @IsOptional()
    video_url?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Transform(({ value }) => (value === '' || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)))
    lat?: number; // legacy fallback

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Transform(({ value }) => (value === '' || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)))
    lng?: number; // legacy fallback

    @IsString()
    @IsNotEmpty()
    whatsapp!: string;

    @IsOptional()
    @IsUrl()
    recitation_url?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    media_ids?: string[];
}

export class ImamQueryDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    lat?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    lng?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    radius?: number;

    @IsOptional()
    @IsString()
    governorate?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsOptional()
    @IsUUID()
    area_id?: string;

    @IsOptional()
    @IsUUID()
    governorateId?: string;

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;

    @IsOptional()
    @IsString()
    query?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
