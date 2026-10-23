import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { REMIND_BEFORE_OPTIONS } from './create-task.dto';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Buy groceries' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ example: 'Milk, eggs, bread' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  done?: boolean;

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
    description: 'Set true to clear task location',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  clearLocation?: boolean;

  @ApiPropertyOptional({
    description:
      'JSON array or comma-separated list of TaskImage ids to remove',
    example: '["uuid-1","uuid-2"]',
  })
  @IsOptional()
  @IsString()
  removeImageIds?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 due date/time',
    example: '2026-10-13T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({
    description: 'Minutes before dueAt to remind (15, 30, 60, 1440)',
    example: 30,
    enum: REMIND_BEFORE_OPTIONS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([...REMIND_BEFORE_OPTIONS])
  remindBeforeMinutes?: number;

  @ApiPropertyOptional({
    description: 'Set true to clear due date and reminder settings',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  clearDueAt?: boolean;

  @ApiPropertyOptional({
    description: 'Set true to clear only the advance reminder (keep dueAt)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  clearRemindBefore?: boolean;
}
