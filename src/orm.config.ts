import { MikroORM } from '@mikro-orm/core';

export default {
    migrations: {
        path: './src/migrations',
        tableName: 'migrations',
        transactional: true,
    },
    tsNode: process.env.NODE_DEV === 'true' ? true : false,
    user: 'root',
    password: 'root',
    dbName: 'graphql',
    host: 'localhost',
    port: 5432,
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    type: 'postgresql',
} as Parameters<typeof MikroORM.init>[0];