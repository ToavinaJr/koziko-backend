// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { AppModule } from './app.module';
// import { json, urlencoded } from 'express';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { join } from 'path';

// async function bootstrap() {
//   const app = await NestFactory.create<NestExpressApplication>(AppModule, {
//     logger: ['error', 'warn', 'log', 'debug', 'verbose'],
//   });
  
//   // Enable CORS FIRST - before any other middleware
//   // In development allow any origin (friendly for testing on LAN). In production keep a strict list.
//   if (process.env.NODE_ENV !== 'production') {
//     app.enableCors({
//       origin: true,
//       methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
//       allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
//       exposedHeaders: ['Content-Range', 'X-Content-Range'],
//       credentials: true,
//       preflightContinue: false,
//       optionsSuccessStatus: 204,
//     });
//   } else {
//     app.enableCors({
//       origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
//       methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
//       allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
//       exposedHeaders: ['Content-Range', 'X-Content-Range'],
//       credentials: true,
//       preflightContinue: false,
//       optionsSuccessStatus: 204,
//     });
//   }
  
//   // Serve static files from uploads directory
//   app.useStaticAssets(join(__dirname, '..', 'uploads'), {
//     prefix: '/uploads/',
//   });
  
//   // Increase payload size limit for image uploads (50MB)
//   app.use(json({ limit: '50mb' }));
//   app.use(urlencoded({ limit: '50mb', extended: true }));

//   // Enable validation
//   app.useGlobalPipes(new ValidationPipe({
//     whitelist: true,
//     forbidNonWhitelisted: true,
//     transform: true,
//   }));

//   const port = process.env.PORT ?? 3001;
//   // Add a tiny root route so a browser visiting / on the host IP gets a friendly response
//   const server = app.getHttpAdapter().getInstance();
//   server.get('/', (_req, res) => {
//     res.json({ status: 'ok', message: 'Koziko backend running' });
//   });

//   await app.listen(port, '0.0.0.0');
//   console.log(`🚀 Backend is running on: http://localhost:${port}`);
//   if (process.env.NODE_ENV !== 'production') {
//     console.log(`✅ CORS: development mode allowing all origins (0.0.0.0 bind)`);
//   } else {
//     console.log(`✅ CORS: production mode (restricted origins)`);
//   }
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ========================================
  // CORS Configuration
  // ========================================
  const isProduction = process.env.NODE_ENV === 'production';
  
  const allowedOrigins = isProduction
    ? [
        process.env.FRONTEND_URL, // Vercel URL principale
        'https://ton-app.vercel.app', // Remplace par ton URL Vercel
        // Ajoute ici d'autres domaines autorisés (custom domain, etc.)
      ].filter(Boolean) // Retire les undefined
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/, // Regex pour LAN
      ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === 'string') return allowed === origin;
        if (allowed instanceof RegExp) return allowed.test(origin);
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ========================================
  // Static Files (Uploads)
  // ========================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // ========================================
  // Payload Size Limits
  // ========================================
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // ========================================
  // Global Validation Pipe
  // ========================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Convertit automatiquement les types
      },
    }),
  );

  // ========================================
  // Global Prefix (API Versioning)
  // ========================================
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health'],
  });

  // Health Check & Root Route
  // ========================================
  const server = app.getHttpAdapter().getInstance();
  
  server.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Koziko API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  server.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    });
  });

  // ========================================
  // Graceful Shutdown
  // ========================================
  app.enableShutdownHooks();

  // ========================================
  // Start Server
  // ========================================
  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  // ========================================
  // Startup Logs
  // ========================================
  console.log('='.repeat(50));
  console.log(`🚀 Koziko Backend Started`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`🔒 CORS Origins: ${JSON.stringify(allowedOrigins, null, 2)}`);
  console.log(`📁 Static files: /uploads`);
  console.log(`🏥 Health check: /health`);
  console.log('='.repeat(50));
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});