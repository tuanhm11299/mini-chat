import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env.validation';
import { SocketIoAdapter } from './modules/realtime/socket-io.adapter';

/** Shared by main.ts and the e2e tests, so tests run the app exactly as production does. */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigin, credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that have no decorator in the DTO
      forbidNonWhitelisted: true, // ...and reject the request if any were sent
      transform: true, // turn plain JSON into DTO class instances (enables defaults and @Type)
    }),
  );
  app.useWebSocketAdapter(new SocketIoAdapter(app, webOrigin));
  app.enableShutdownHooks();
}
