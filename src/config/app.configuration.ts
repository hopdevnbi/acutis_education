import { registerAs } from '@nestjs/config';
import {
  CONFIGURATION_NAMESPACE,
  NODE_ENV_VALUES,
  type AppConfiguration,
  type NodeEnvironment,
} from './config.types';

const DEFAULT_PORT = 3000;

export function parseNodeEnvironment(rawValue: string | undefined): NodeEnvironment {
  if (rawValue === undefined) {
    return 'development';
  }

  if ((NODE_ENV_VALUES as readonly string[]).includes(rawValue)) {
    return rawValue as NodeEnvironment;
  }

  throw new Error(`Invalid NODE_ENV value: ${rawValue}`);
}

export function parsePort(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value: ${rawValue}`);
  }

  return parsedPort;
}

export function parseSwaggerEnabled(
  rawValue: string | undefined,
  nodeEnv: NodeEnvironment,
): boolean {
  if (rawValue === undefined) {
    return nodeEnv === 'development';
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  throw new Error(`Invalid SWAGGER_ENABLED value: ${rawValue}`);
}

export function buildAppConfiguration(): AppConfiguration {
  const nodeEnv = parseNodeEnvironment(process.env['NODE_ENV']);
  const port = parsePort(process.env['PORT']);
  const swaggerEnabled = parseSwaggerEnabled(process.env['SWAGGER_ENABLED'], nodeEnv);

  return {
    nodeEnv,
    port,
    swaggerEnabled,
  };
}

export default registerAs(CONFIGURATION_NAMESPACE, buildAppConfiguration);
