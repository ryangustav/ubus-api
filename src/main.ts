import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('UBUS API')
    .setDescription(
      'API do sistema de reserva de assentos em ônibus universitários',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e cadastro')
    .addTag('prefeitura', 'Prefeituras (multi-tenant)')
    .addTag('fleet', 'Frota (linhas e ônibus)')
    .addTag('trips', 'Viagens')
    .addTag('reservations', 'Reservas de assentos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`UBUS API running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}
void bootstrap();
