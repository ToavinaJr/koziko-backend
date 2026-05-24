import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Enable CORS FIRST - before any other middleware
  // In development allow any origin (friendly for testing on LAN). In production keep a strict list.
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  } else {
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  }
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Increase payload size limit for image uploads (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ?? 3001;
  // Add a tiny root route so a browser visiting / on the host IP gets a friendly response
  const server = app.getHttpAdapter().getInstance();
  server.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Koziko backend running' });
  });

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ CORS: development mode allowing all origins (0.0.0.0 bind)`);
  } else {
    console.log(`✅ CORS: production mode (restricted origins)`);
  }
}
bootstrap();

