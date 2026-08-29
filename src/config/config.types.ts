export const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENV_VALUES)[number];

export interface AppConfiguration {
  readonly nodeEnv: NodeEnvironment;
  readonly port: number;
  readonly swaggerEnabled: boolean;
}

export const CONFIGURATION_NAMESPACE = 'app' as const;
