import { IsIn, IsISO8601, IsOptional } from 'class-validator';

const statuses = ['pending', 'planned', 'completed', 'rejected'] as const;

export class AdminQueryImprovementsDto {
    @IsOptional()
    @IsIn(['all', ...statuses])
    status?: 'all' | (typeof statuses)[number];

    @IsOptional()
    @IsISO8601()
    from?: string;

    @IsOptional()
    @IsISO8601()
    to?: string;
}
