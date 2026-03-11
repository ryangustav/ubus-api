import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('UBUS API')
    .setDescription('University bus seat reservation system API')
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
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`UBUS API running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}
void bootstrap();
