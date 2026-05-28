import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

function maskValue(value: string | undefined, visibleChars = 4): string {
  if (!value) {
    return '<undefined>';
  }

  if (value.length <= visibleChars * 2) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, visibleChars)}***${value.slice(-visibleChars)}`;
}

function logEnvironmentDebug() {
  const databaseUrl = process.env.DATABASE_URL;
  const frontendUrl = process.env.FRONTEND_URL;

  console.log('🧪 Environment debug:');
  console.log('  NODE_ENV =', process.env.NODE_ENV ?? '<undefined>');
  console.log('  PORT =', process.env.PORT ?? '<undefined>');
  console.log('  FRONTEND_URL =', frontendUrl ?? '<undefined>');
  console.log('  DATABASE_URL =', databaseUrl ? maskValue(databaseUrl, 12) : '<undefined>');
  console.log('  DATABASE_HOST =', process.env.DATABASE_HOST ?? '<undefined>');
  console.log('  DATABASE_PORT =', process.env.DATABASE_PORT ?? '<undefined>');
  console.log('  DATABASE_USER =', process.env.DATABASE_USER ?? '<undefined>');
  console.log('  DATABASE_NAME =', process.env.DATABASE_NAME ?? '<undefined>');
  console.log('  JWT_SECRET =', maskValue(process.env.JWT_SECRET, 6));
  console.log('  JWT_REFRESH_SECRET =', maskValue(process.env.JWT_REFRESH_SECRET, 6));
  console.log('  GOOGLE_CLIENT_ID =', maskValue(process.env.GOOGLE_CLIENT_ID, 8));
  console.log('  GOOGLE_CLIENT_SECRET =', maskValue(process.env.GOOGLE_CLIENT_SECRET, 8));
}

async function bootstrap() {
  logEnvironmentDebug();

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
    // In production, read allowed origin(s) from env var `FRONTEND_URL`.
    // Support a comma-separated list of allowed origins.
    const raw = process.env.FRONTEND_URL || '';
    const allowedOrigins = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const origins = allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    console.log('✅ CORS allowed origins:', origins);

    app.enableCors({
      origin: origins,
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

