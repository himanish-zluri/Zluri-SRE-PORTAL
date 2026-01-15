import { getEntityManager } from '../../config/database';
import { DbInstance } from '../../entities';
import { decrypt } from '../../utils/crypto';

interface DecryptedDbInstance {
  id: string;
  name: string;
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  mongo_uri?: string;
  created_at: Date;
}

function decryptInstance(instance: DbInstance | null): DecryptedDbInstance | null {
  if (!instance) return null;
  
  return {
    id: instance.id,
    name: instance.name,
    type: instance.type,
    host: instance.host,
    port: instance.port,
    username: instance.username,
    password: instance.password ? decrypt(instance.password) : undefined,
    mongo_uri: instance.mongoUri ? decrypt(instance.mongoUri) : undefined,
    created_at: instance.createdAt,
  };
}

export class DbInstanceRepository {
  static async findById(instanceId: string): Promise<DecryptedDbInstance | null> {
    const em = getEntityManager();
    const instance = await em.findOne(DbInstance, { id: instanceId });
    return decryptInstance(instance);
  }

  static async findByType(type: string): Promise<{ id: string; name: string; type: string }[]> {
    const em = getEntityManager();
    const instances = await em.find(
      DbInstance, 
      { type: type as any },
      { 
        fields: ['id', 'name', 'type'],
        orderBy: { name: 'ASC' }
      }
    );
    
    return instances.map(i => ({ id: i.id, name: i.name, type: i.type }));
  }

  static async findAll(): Promise<{ id: string; name: string; type: string }[]> {
    const em = getEntityManager();
    const instances = await em.find(
      DbInstance, 
      {},
      { 
        fields: ['id', 'name', 'type'],
        orderBy: { name: 'ASC' }
      }
    );
    
    return instances.map(i => ({ id: i.id, name: i.name, type: i.type }));
  }
}
