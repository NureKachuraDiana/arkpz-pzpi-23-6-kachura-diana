import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

async function bootstrap() {
  const PORT = process.env.PORT || 5193; // HTTPS
  const WOKWI_PORT = process.env.WOKWI_PORT || 5195; //  HTTP

  let appOptions: any = {};
  let httpsEnabled = false;

  // SSL paths
  const sslKeyPath = path.join(process.cwd(), 'ssl', 'key.pem');
  const sslCertPath = path.join(process.cwd(), 'ssl', 'cert.pem');

  // Check SSL availability
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    appOptions = {
      httpsOptions: {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      },
    };
    httpsEnabled = true;
    console.log('SSL certificates found → starting HTTPS server');
  } else {
    console.warn('SSL certificates not found → starting HTTP server');
  }

  // Create main app (HTTPS or HTTP)
  const app = await NestFactory.create(AppModule, appOptions);

  // Swagger config
  const config = new DocumentBuilder()
      .setTitle('API')
      .setDescription('Eco-monitor api')
      .setVersion('1.0.0')
      .build();

  app.use(cookieParser());

  // CORS config - allow all localhost ports for development
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Next.js/React default port
    'http://localhost:3001', // Alternative port
    'http://localhost:3002', // Another alternative
    'https://localhost:3000', // HTTPS Next.js/React
    'https://localhost:3001', // HTTPS alternative
    'https://wokwi.com',
    'https://*.wokwi.com'
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://localhost:3000',
        'https://localhost:3001',
        'https://wokwi.com',
        'https://*.wokwi.com'
      ];

      if (allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*.', '');
          return origin.includes(pattern);
        }
        return origin === allowed;
      })) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {

        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Set-Cookie',
      'ngrok-skip-browser-warning',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    optionsSuccessStatus: 200,
    preflightContinue: false,
    maxAge: 86400,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // === MAIN SERVER (HTTPS or HTTP) ===
  await app.listen(PORT, '0.0.0.0');
  console.log(
      `Main server running on ${httpsEnabled ? 'https' : 'http'}://localhost:${PORT}`
  );

  // === SECOND HTTP SERVER FOR WOKWI ===
  // Wokwi does not support HTTPS, so we open a pure HTTP port
  const httpApp = await NestFactory.create(AppModule);
  httpApp.use(cookieParser());
  httpApp.enableCors({
    origin: '*',
    credentials: false,
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Cookie',
      'ngrok-skip-browser-warning',
      'X-Requested-With'
    ],
  });

  await httpApp.listen(WOKWI_PORT, '0.0.0.0');
  console.log(`Wokwi HTTP server running on http://localhost:${WOKWI_PORT}`);
}

bootstrap();