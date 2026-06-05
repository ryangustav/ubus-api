import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { join, extname } from 'path';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import type { ReadStream } from 'fs';

export type UploadType =
  | 'PROFILE_PHOTO'
  | 'GRADE_DOCUMENT'
  | 'RESIDENCIA_DOCUMENT'
  | 'ACCESSIBILITY_PROOF';

const TYPE_TO_FOLDER: Record<UploadType, string> = {
  PROFILE_PHOTO: 'profile',
  GRADE_DOCUMENT: 'documents',
  RESIDENCIA_DOCUMENT: 'documents',
  ACCESSIBILITY_PROOF: 'accessibility',
};

const TYPE_TO_FILENAME: Record<UploadType, string> = {
  PROFILE_PHOTO: 'photo',
  GRADE_DOCUMENT: 'grade',
  RESIDENCIA_DOCUMENT: 'residencia',
  ACCESSIBILITY_PROOF: 'proof',
};

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_TTL = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class UploadsService {
  private readonly uploadRoot: string;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.uploadRoot = join(process.cwd(), 'uploads');
    this.secret = config.get<string>(
      'JWT_SECRET',
      'ubus-secret-change-in-prod',
    );
    const port = config.get<number>('PORT', 3001);
    this.baseUrl = config.get<string>(
      'API_BASE_URL',
      `http://localhost:${port}/v1`,
    );

    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  async upload(
    userId: string,
    type: UploadType,
    file: any,
  ): Promise<{
    fileUrl: string;
    type: UploadType;
    path: string;
    expiresAt: string;
  }> {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file format: ${file.mimetype}. Accepted: PDF, JPEG, PNG`,
      );
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File exceeds 10 MB limit');
    }

    const folder = TYPE_TO_FOLDER[type];
    const baseName = TYPE_TO_FILENAME[type];
    const ext = extname(file.originalname) || this.mimeToExt(file.mimetype);
    const filename = `${baseName}${ext}`;
    const relativePath = join('users', userId, folder, filename);
    const absolutePath = join(this.uploadRoot, relativePath);

    const dir = join(this.uploadRoot, 'users', userId, folder);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    await writeFile(absolutePath, file.buffer);

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL).toISOString();
    const signature = this.sign(relativePath, expiresAt);
    const fileUrl = `${this.baseUrl}/uploads/files/${relativePath.replace(/\\/g, '/')}?sig=${signature}&expires=${encodeURIComponent(expiresAt)}`;

    return {
      fileUrl,
      type,
      path: `users/${userId}/${folder}/${filename}`,
      expiresAt,
    };
  }

  verifyAndGetStream(
    filePath: string,
    sig: string,
    expires: string,
  ): ReadStream {
    const now = new Date();
    const expiresDate = new Date(expires);
    if (now > expiresDate) {
      throw new BadRequestException('Signed URL has expired');
    }

    const expectedSig = this.sign(filePath, expires);
    if (sig !== expectedSig) {
      throw new BadRequestException('Invalid signature');
    }

    const absolutePath = join(this.uploadRoot, filePath);
    if (!existsSync(absolutePath)) {
      throw new BadRequestException('File not found');
    }

    return createReadStream(absolutePath);
  }

  /**
   * Validates that a fileUrl belongs to the expected user's bucket path.
   */
  validateBucketUrl(fileUrl: string, userId: string): boolean {
    try {
      const url = new URL(fileUrl);
      const pathPart = url.pathname;
      return pathPart.includes(`users/${userId}/`);
    } catch {
      return false;
    }
  }

  private sign(path: string, expires: string): string {
    return createHmac('sha256', this.secret)
      .update(`${path}:${expires}`)
      .digest('hex');
  }

  private mimeToExt(mime: string): string {
    switch (mime) {
      case 'application/pdf':
        return '.pdf';
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      default:
        return '.bin';
    }
  }
}
