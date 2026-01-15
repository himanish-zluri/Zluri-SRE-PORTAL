import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { User } from './User.entity';

@Entity({ tableName: 'pods' })
export class Pod {
  @PrimaryKey({ type: 'text' })
  id!: string;

  @Property()
  name!: string;

  @ManyToOne(() => User, { fieldName: 'manager_id' })
  manager!: User;

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();
}
