import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Upload d'une seule image pour le profil
   */
  @Post('profile')
  @UseInterceptors(FileInterceptor('image'))
  uploadProfileImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = this.uploadsService.getFileUrl(file.filename, 'profile');
    
    return {
      success: true,
      filename: file.filename,
      url: fileUrl,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Upload de plusieurs images pour les posts
   */
  @Post('posts')
  @UseInterceptors(FilesInterceptor('images', 10))
  uploadPostImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      url: this.uploadsService.getFileUrl(file.filename, 'posts'),
      mimetype: file.mimetype,
      size: file.size,
    }));

    return {
      success: true,
      files: uploadedFiles,
    };
  }
}
