import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS - PERMITIR PETICIONES DESDE TU FRONTEND
  app.enableCors({
    origin: [
      'https://garagewings-production.up.railway.app', // ← Tu frontend en Railway
      'http://localhost:4200' // ← Para desarrollo local
    ],
    credentials: true
  });

  app.useGlobalPipes(new ValidationPipe());

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();