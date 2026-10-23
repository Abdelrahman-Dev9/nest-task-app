import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export const REMIND_BEFORE_OPTIONS = [15, 30, 60, 1440] as const;

export class CreateTaskDto {
  @ApiProperty({ example: 'Buy groceries' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'Milk, eggs, bread' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 30.0444 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 31.2357 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'Downtown Cairo' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 due date/time (UTC recommended)',
    example: '2026-10-13T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({
    description:
      'Minutes before dueAt to remind (15, 30, 60, 1440). Omit for no advance reminder.',
    example: 30,
    enum: REMIND_BEFORE_OPTIONS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([...REMIND_BEFORE_OPTIONS])
  remindBeforeMinutes?: number;
}
