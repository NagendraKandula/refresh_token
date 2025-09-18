import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS (allow requests from frontend)
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true,               // Allows the browser to send and receive cookies
  });

  // Enables class-validator and class-transformer for all incoming requests
  app.useGlobalPipes(new ValidationPipe());

  // Enables cookie parsing for all incoming requests
  app.use(cookieParser());
  
  await app.listen(4000);
}
bootstrap();