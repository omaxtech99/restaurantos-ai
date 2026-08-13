import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class JoinWaitlistDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Enter a valid phone number in international format, e.g. +919876543210',
  })
  phone!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(50)
  partySize!: number;
}

export class ListWaitlistQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
