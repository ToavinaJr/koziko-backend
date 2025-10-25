import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export type UploadType = 'posts' | 'profile';

@Injectable()
export class UploadsService {
  private readonly uploadsDir = './uploads';

  constructor() {
    // Créer les dossiers si ils n'existent pas
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [
      this.uploadsDir,
      path.join(this.uploadsDir, 'posts'),
      path.join(this.uploadsDir, 'profile'),
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Configuration Multer pour le stockage des fichiers
   */
  getMulterOptions(uploadType: UploadType) {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(this.uploadsDir, uploadType);
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    };
  }

  /**
   * Construire l'URL complète du fichier
   */
  getFileUrl(filename: string, uploadType: UploadType): string {
    return `/uploads/${uploadType}/${filename}`;
  }

  /**
   * Supprimer un fichier
   */
  deleteFile(filename: string, uploadType: UploadType): boolean {
    try {
      const filePath = path.join(this.uploadsDir, uploadType, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Supprimer plusieurs fichiers
   */
  deleteFiles(filenames: string[], uploadType: UploadType): void {
    filenames.forEach((filename) => this.deleteFile(filename, uploadType));
  }
}
