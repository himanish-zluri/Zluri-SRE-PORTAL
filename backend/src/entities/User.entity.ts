import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';

export enum UserRole {
  DEVELOPER = 'DEVELOPER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuid();

  @Property({ unique: true })
  email!: string;

  @Property()
  name!: string;

  @Property({ fieldName: 'password_hash' })
  passwordHash!: string;

  @Enum({ items: () => UserRole })
  role!: UserRole;

  @Property({ fieldName: 'slack_id', nullable: true })
  slackId?: string;

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();
}
