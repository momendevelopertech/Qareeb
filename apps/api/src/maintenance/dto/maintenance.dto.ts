import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsNotEmpty, IsUrl, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum MaintenanceType {
    Plumbing = 'Plumbing',
    Electrical = 'Electrical',
    Carpentry = 'Carpentry',
    Painting = 'Painting',
    AC_Repair = 'AC_Repair',
    Cleaning = 'Cleaning',
    Other = 'Other',
}

export class CreateMaintenanceDto {
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

    @IsString()
    @IsOptional()
    district?: string;

    @IsUUID()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    area_id?: string;

    @IsUrl()
    @IsNotEmpty()
    google_maps_url!: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    lat?: number; // legacy fallback

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    lng?: number; // legacy fallback

    @IsArray()
    @IsEnum(MaintenanceType, { each: true })
    @IsNotEmpty()
    maintenance_types!: MaintenanceType[];

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsNumber()
    @IsOptional()
    estimated_cost_min?: number;

    @IsNumber()
    @IsOptional()
    estimated_cost_max?: number;

    @IsString()
    @IsNotEmpty()
    whatsapp!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    media_ids?: string[];
}

export class MaintenanceQueryDto {
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
    @IsEnum(MaintenanceType)
    type?: MaintenanceType;

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
