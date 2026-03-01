import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateImprovementDto {
    @IsOptional()
    @IsIn(['pending', 'planned', 'completed', 'rejected'])
    status?: 'pending' | 'planned' | 'completed' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    internal_note?: string;
}
