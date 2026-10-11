import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation';
import { baseTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...baseTypeOrmOptions(config.get('DATABASE_URL', { infer: true })),
        // Entities register themselves through TypeOrmModule.forFeature() in each module.
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
