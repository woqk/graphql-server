import "reflect-metadata";
import fastify from 'fastify';
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL, ExecutionContext } from 'graphql-helix';
import { envelop, useLogger, useAsyncSchema, useTiming, useExtendContext } from '@envelop/core';
import { useDepthLimit } from '@envelop/depth-limit';
import { useRateLimiter, IdentifyFn } from '@envelop/rate-limiter';
import { MikroORM, IDatabaseDriver, Connection } from '@mikro-orm/core';
import ormConfig from './orm.config';
import { buildSchema, registerEnumType } from 'type-graphql';
import { createContext } from './context'
import fs from 'fs/promises'
import { BookResolver } from "./resolvers/book.resolver";
import { PublisherType } from "./enums/publisherType.enum";
import { AuthorResolver } from "./resolvers/author.resolver";
import { SampleResolver } from "./resolvers/sample.resolver";

const identifyFn: IdentifyFn = (context: ExecutionContext) => {
    return context.request['ip'];
};

registerEnumType(PublisherType, {
    name: 'PublisherType',
    description: 'Type of the publisher',
});

async function start() {
    let orm: MikroORM<IDatabaseDriver<Connection>>;
    try {
        orm = await MikroORM.init(ormConfig);
        const migrator = orm.getMigrator();
        const migrations = await migrator.getPendingMigrations();
        if (migrations && migrations.length > 0) {
            await migrator.up();
        }
        console.log('ORM connect')
    } catch (error) {
        console.error('📌 Could not connect to the database', error);
        throw Error(error);
    }

    const graphiQLContent = (await fs.readFile(`${__dirname}/graphiql-content.txt`)).toString()

    const getEnveloped = envelop({
        plugins: [
            useAsyncSchema(
                buildSchema({
                    resolvers: [AuthorResolver, BookResolver, SampleResolver],
                })
            ),
            useExtendContext((ctx) => createContext(orm, ctx)),
            useLogger(),
            useTiming(),
            useDepthLimit({
                maxDepth: 10,
            }),
            useRateLimiter({
                identifyFn,
            }),
        ],
    });
    const app = fastify();


    app.route({
        method: ['GET', 'POST'],
        url: '/graphql',
        async handler(req, res) {
            const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req });
            const request = {
                body: req.body,
                headers: req.headers,
                method: req.method,
                query: req.query,
            };

            if (shouldRenderGraphiQL(request)) {
                res.type('text/html');
                res.send(
                    renderGraphiQL({
                        defaultQuery: graphiQLContent
                            .split('\n')
                            .slice(1)
                            .map(line => line.replace('  ', ''))
                            .join('\n'),
                    })
                );
            } else {
                const request = {
                    body: req.body,
                    headers: req.headers,
                    method: req.method,
                    query: req.query,
                };
                const { operationName, query, variables } = getGraphQLParameters(request);
                const result = await processRequest({
                    operationName,
                    query,
                    variables,
                    request,
                    schema,
                    parse,
                    validate,
                    execute,
                    contextFactory,
                });

                if (result.type === 'RESPONSE') {
                    res.status(result.status);
                    res.send(result.payload);
                } else if (result.type === 'MULTIPART_RESPONSE') {
                    res.raw.writeHead(200, {
                        Connection: 'keep-alive',
                        'Content-Type': 'multipart/mixed; boundary="-"',
                        'Transfer-Encoding': 'chunked',
                    });

                    req.raw.on('close', () => {
                        result.unsubscribe();
                    });

                    res.raw.write('---');

                    await result.subscribe(result => {
                        const chunk = Buffer.from(JSON.stringify(result), 'utf8');
                        const data = [
                            '',
                            'Content-Type: application/json; charset=utf-8',
                            'Content-Length: ' + String(chunk.length),
                            '',
                            chunk,
                        ];

                        if (result.hasNext) {
                            data.push('---');
                        }

                        res.raw.write(data.join('\r\n'));
                    });

                    res.raw.write('\r\n-----\r\n');
                    res.raw.end();
                } else {
                    res.raw.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        Connection: 'keep-alive',
                        'Cache-Control': 'no-cache',
                    });

                    req.raw.on('close', () => {
                        result.unsubscribe();
                    });

                    await result.subscribe(result => {
                        res.raw.write(`data: ${JSON.stringify(result)}\n\n`);
                    });
                }
            }
        },
    });

    app.listen(3000, () => {
        console.log(`GraphQL server is running.`);
    });
}

start()