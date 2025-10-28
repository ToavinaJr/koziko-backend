import { IsEmail, IsOptional, IsString, MinLength, IsBoolean, IsDateString, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateIf((o) => o.dateOfBirth !== null && o.dateOfBirth !== '' && o.dateOfBirth !== undefined)
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

