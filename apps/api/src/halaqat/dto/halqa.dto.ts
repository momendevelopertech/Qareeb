import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsNotEmpty, IsUrl, IsUUID, IsBoolean, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum HalqaType {
    MEN = 'men',
    WOMEN = 'women',
    CHILDREN = 'children',
}

export class CreateHalqaDto {
    @IsString()
    @IsNotEmpty()
    circle_name!: string;

    @ValidateIf((o) => !o.is_online)
    @IsString()
    @IsNotEmpty()
    mosque_name?: string;

    @IsEnum(HalqaType)
    @IsNotEmpty()
    halqa_type!: HalqaType;

    @ValidateIf((o) => !o.is_online)
    @IsString()
    @IsNotEmpty()
    governorate?: string;

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
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Transform(({ value }) => (value === '' || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)))
    lat?: number; // legacy fallback

    @ValidateIf((o) => !o.is_online)
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Transform(({ value }) => (value === '' || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)))
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
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes'].includes(normalized)) return true;
            if (['false', '0', 'no'].includes(normalized)) return false;
        }
        return value;
    })
    @IsBoolean()
    isOnline?: boolean;

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
