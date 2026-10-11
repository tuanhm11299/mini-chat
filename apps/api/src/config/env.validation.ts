import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';

/**
 * Every environment variable the API reads. The app refuses to start if one is invalid,
 * so a typo in `.env` fails loudly instead of causing strange behaviour later.
 */
export class Env {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  WEB_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  /** Access tokens are short-lived; the web app silently refreshes them. */
  @IsInt()
  @Min(10)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, { enableImplicitConversion: true });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((error) => `  - ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return env;
}
