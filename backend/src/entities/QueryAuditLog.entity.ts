import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { User } from './User.entity';
import { QueryRequest } from './QueryRequest.entity';

export enum AuditAction {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

@Entity({ tableName: 'query_audit_log' })
export class QueryAuditLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuid();

  @ManyToOne(() => QueryRequest, { fieldName: 'query_request_id' })
  queryRequest!: QueryRequest;

  @Enum({ items: () => AuditAction })
  action!: AuditAction;

  @ManyToOne(() => User, { fieldName: 'performed_by' })
  performedBy!: User;

  @Property({ type: 'json', nullable: true })
  details?: Record<string, any>;

  @Property({ fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();
}
