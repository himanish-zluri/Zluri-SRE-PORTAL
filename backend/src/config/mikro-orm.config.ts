import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { User } from '../entities/User.entity';
import { Pod } from '../entities/Pod.entity';
import { DbInstance } from '../entities/DbInstance.entity';
import { QueryRequest } from '../entities/QueryRequest.entity';
import { RefreshToken } from '../entities/RefreshToken.entity';
import { QueryAuditLog } from '../entities/QueryAuditLog.entity';

const config: Options = {
  driver: PostgreSqlDriver,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  dbName: process.env.DB_NAME || 'zluri_sre',
  entities: [User, Pod, DbInstance, QueryRequest, RefreshToken, QueryAuditLog],
  metadataProvider: TsMorphMetadataProvider,
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
  driverOptions: process.env.DB_SSL === 'true' ? {
    connection: { ssl: { rejectUnauthorized: false } },
  } : undefined,
};

export default config;
