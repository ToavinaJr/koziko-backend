import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsDateString,
  ValidateIf,
  Matches,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(2, { message: 'Username must be at least 2 characters' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  @Transform(({ value }) => value?.trim())
  username?: string;

  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  fullName?: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.dateOfBirth !== null &&
      o.dateOfBirth !== '' &&
      o.dateOfBirth !== undefined
  )
  @IsDateString({}, { message: 'Date of birth must be a valid date string' })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'isAnonymous must be a boolean' })
  isAnonymous?: boolean;
}

