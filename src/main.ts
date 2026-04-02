import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { loadOciSecrets } from './config/oci-vault';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  dotenv.config();
  await loadOciSecrets();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  app.use(helmet());
  const origins = ['https://ubus.me'];
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);

  app.enableCors({
    origin: origins.length > 1 ? origins : origins[0] || '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

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
  SwaggerModule.setup('v1/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`UBUS API running on http://localhost:${port}/v1`);
  console.log(`Swagger Docs: http://localhost:${port}/v1/docs`);
}
void bootstrap();
