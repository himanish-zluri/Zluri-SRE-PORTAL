import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';

export enum DbType {
  POSTGRES = 'POSTGRES',
  MONGODB = 'MONGODB',
}

@Entity({ tableName: 'db_instances' })
export class DbInstance {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuid();

  @Property()
  name!: string;

  @Property({ nullable: true })
  host?: string;

  @Property({ nullable: true })
  port?: number;

  @Property({ nullable: true })
  username?: string;

  @Property({ nullable: true })
  password?: string;

  @Enum({ items: () => DbType })
  type!: DbType;

  @Property({ fieldName: 'mongo_uri', nullable: true })
  mongoUri?: string;

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();
}
