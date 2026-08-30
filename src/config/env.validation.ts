import * as Joi from 'joi';
import { NODE_ENV_VALUES } from './config.types';
import {
  FORBIDDEN_JWT_ACCESS_SECRETS,
  FORBIDDEN_JWT_REFRESH_HASH_SECRETS,
  JWT_ACCESS_SECRET_MIN_LENGTH,
  JWT_REFRESH_HASH_SECRET_MIN_LENGTH,
} from '../modules/auth/config/auth.config.types';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...NODE_ENV_VALUES)
    .default('development'),
  PORT: Joi.number().port().default(3000),
  SWAGGER_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  DB_HOST: Joi.string().min(1).required(),
  DB_PORT: Joi.number().port().default(1433),
  DB_NAME: Joi.string().min(1).required(),
  DB_USER: Joi.string().min(1).required(),
  DB_PASSWORD: Joi.string().min(1).required(),
  DB_ENCRYPT: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  DB_TRUST_SERVER_CERTIFICATE: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  MSSQL_PUBLISH_PORT: Joi.number().port().optional(),
  JWT_ACCESS_SECRET: Joi.string()
    .min(JWT_ACCESS_SECRET_MIN_LENGTH)
    .invalid(...FORBIDDEN_JWT_ACCESS_SECRETS)
    .required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_HASH_SECRET: Joi.string()
    .min(JWT_REFRESH_HASH_SECRET_MIN_LENGTH)
    .invalid(...FORBIDDEN_JWT_REFRESH_HASH_SECRETS)
    .required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  AUTH_RBAC_DEMO_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
});
