import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { User } from './User.entity';
import { Pod } from './Pod.entity';
import { DbInstance } from './DbInstance.entity';

export enum SubmissionType {
  QUERY = 'QUERY',
  SCRIPT = 'SCRIPT',
}

export enum QueryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

@Entity({ tableName: 'query_requests' })
export class QueryRequest {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuid();

  @ManyToOne(() => User, { fieldName: 'requester_id' })
  requester!: User;

  @ManyToOne(() => Pod, { fieldName: 'pod_id' })
  pod!: Pod;

  @ManyToOne(() => DbInstance, { fieldName: 'instance_id' })
  instance!: DbInstance;

  @Property({ fieldName: 'database_name' })
  databaseName!: string;

  @Enum({ items: () => SubmissionType, fieldName: 'submission_type' })
  submissionType!: SubmissionType;

  @Property({ fieldName: 'query_text', type: 'text' })
  queryText!: string;

  @Property({ fieldName: 'script_path', nullable: true })
  scriptPath?: string;

  @Property({ type: 'text', nullable: true })
  comments?: string;

  @Enum({ items: () => QueryStatus })
  status: QueryStatus = QueryStatus.PENDING;

  @ManyToOne(() => User, { fieldName: 'approved_by', nullable: true })
  approvedBy?: User;

  @Property({ fieldName: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Property({ fieldName: 'execution_result', type: 'json', nullable: true })
  executionResult?: Record<string, any>;

  @Property({ fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
