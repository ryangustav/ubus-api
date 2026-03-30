import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { loadOciSecrets } from './config/oci-vault';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  await loadOciSecrets();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('UBUS API')
    .setDescription(
      'University bus seat reservation system API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and registration')
    .addTag('management', 'Management (multi-tenant)')
    .addTag('fleet', 'Fleet (routes and buses)')
    .addTag('trips', 'Trips')
    .addTag('reservations', 'Seat reservations')
    .addTag('health', 'Health check (Redis + DB, load test)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`UBUS API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger Docs: http://localhost:${port}/api/v1/docs`);
}
void bootstrap();
