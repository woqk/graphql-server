import type { ExecutionContext } from 'graphql-helix';
import type { MikroORM, EntityManager, IDatabaseDriver, Connection } from '@mikro-orm/core';

export interface Context extends ExecutionContext {
    db: EntityManager<IDatabaseDriver<Connection>>
}

export const createContext = (orm: MikroORM<IDatabaseDriver<Connection>>, ctx: ExecutionContext): Context => {
    return {
        db: orm.em.fork(),
    } as Context
}