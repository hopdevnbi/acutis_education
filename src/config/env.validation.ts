import * as Joi from 'joi';
import { NODE_ENV_VALUES } from './config.types';

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
  DB_PASSWORD: Joi.string().required(),
  DB_ENCRYPT: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  DB_TRUST_SERVER_CERTIFICATE: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
});
