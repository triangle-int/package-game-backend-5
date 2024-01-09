import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { BigIntInterceptor } from './helpers/interceptor/big-int.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new BigIntInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Package game API')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  config();
  await app.listen(process.env.PORT);
}

bootstrap();
