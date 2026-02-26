import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsNotEmpty, IsUrl, IsUUID, IsBoolean, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum HalqaType {
    MEN = 'men',
    WOMEN = 'women',
    CHILDREN = 'children',
    MIXED = 'mixed',
}

export class CreateHalqaDto {
    @IsString()
    @IsNotEmpty()
    circle_name!: string;

    @IsString()
    @IsNotEmpty()
    mosque_name!: string;

    @IsEnum(HalqaType)
    @IsNotEmpty()
    halqa_type!: HalqaType;

    @IsString()
    @IsNotEmpty()
    governorate!: string;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    city?: string;

    @IsString()
    @IsOptional()
    district?: string;

    @IsUUID()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    area_id?: string;

    @IsBoolean()
    @Type(() => Boolean)
    is_online!: boolean;

    @ValidateIf((o) => !o.is_online)
    @IsUrl()
    @IsNotEmpty()
    google_maps_url!: string;

    @ValidateIf((o) => !o.is_online)
    @IsNumber()
    @Type(() => Number)
    lat?: number; // legacy fallback

    @ValidateIf((o) => !o.is_online)
    @IsNumber()
    @Type(() => Number)
    lng?: number; // legacy fallback

    @IsString()
    @IsNotEmpty()
    whatsapp!: string;

    @IsString()
    @IsOptional()
    additional_info?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    media_ids?: string[];
}

export class HalqaQueryDto {
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
    @IsEnum(HalqaType)
    type?: HalqaType;

    @IsOptional()
    @IsString()
    governorate?: string;

    @IsOptional()
    @IsString()
    city?: string;

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
    status?: string;
}
