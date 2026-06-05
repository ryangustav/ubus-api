import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { UploadsService, UploadType } from './application/uploads.service';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post(':type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (photo, document, proof)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @UploadedFile() file: any,
  ) {
    const validTypes: UploadType[] = [
      'PROFILE_PHOTO',
      'GRADE_DOCUMENT',
      'RESIDENCIA_DOCUMENT',
      'ACCESSIBILITY_PROOF',
    ];
    const upperType = type.toUpperCase() as UploadType;
    if (!validTypes.includes(upperType)) {
      throw new BadRequestException(
        `Invalid upload type: ${type}. Valid: ${validTypes.join(', ')}`,
      );
    }
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadsService.upload(user.sub, upperType, file);
  }

  @Get('files/*')
  @ApiOperation({ summary: 'Serve a file by signed URL' })
  @ApiQuery({ name: 'sig', required: true })
  @ApiQuery({ name: 'expires', required: true })
  @ApiResponse({ status: 200, description: 'File stream' })
  async serve(
    @Param('0') filePath: string,
    @Query('sig') sig: string,
    @Query('expires') expires: string,
    @Res() res: any,
  ) {
    const stream = this.uploadsService.verifyAndGetStream(
      filePath,
      sig,
      expires,
    );
    stream.pipe(res);
  }
}
