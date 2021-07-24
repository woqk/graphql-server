import { Collection, Entity, Enum, OneToMany, Property } from '@mikro-orm/core';
import { PublisherType } from '../enums/publisherType.enum';
import { PublisherValidator } from '../validators/publisher.validator';
import { Book } from './book.entity';
import { Field, ObjectType } from 'type-graphql';
import { Base } from './base.entity';

@ObjectType()
@Entity()
export class Publisher extends Base<Publisher> {
    @Field()
    @Property()
    public name: string;

    @Field(() => PublisherType)
    @Enum(() => PublisherType)
    public type: PublisherType;

    @Field(() => [Book])
    @OneToMany(() => Book, (b: Book) => b.publisher)
    public books = new Collection<Book>(this);

    constructor(body: PublisherValidator) {
        super(body);
    }
}