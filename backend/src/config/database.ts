import { MikroORM, EntityManager } from '@mikro-orm/postgresql';
import config from './mikro-orm.config';

export let orm: MikroORM;
export let em: EntityManager;

export async function initializeDatabase(): Promise<MikroORM> {
  orm = await MikroORM.init(config);
  em = orm.em;
  
  console.log('MikroORM initialized successfully');
  return orm;
}

export async function closeDatabase(): Promise<void> {
  if (orm) {
    await orm.close();
    console.log('MikroORM connection closed');
  }
}

export function getEntityManager(): EntityManager {
  return orm.em.fork();
}
