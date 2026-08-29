export const DATABASE_CONFIGURATION_NAMESPACE = 'database' as const;

export interface DatabaseConfiguration {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly encrypt: boolean;
  readonly trustServerCertificate: boolean;
}
