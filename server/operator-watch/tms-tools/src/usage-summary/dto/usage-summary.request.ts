import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UsageSummaryRequest {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
