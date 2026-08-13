import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STAFF_ROLES, type StaffRoleValue } from '@restaurantos/shared';

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role!: StaffRoleValue;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}
