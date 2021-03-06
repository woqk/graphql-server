import BookValidator from '../validators/book.validator';
import { Author } from '../entities/author.entity';
import { Book } from '../entities/book.entity';
import { Publisher } from '../entities/publisher.entity';
import { GraphQLResolveInfo } from 'graphql';
import fieldsToRelations from 'graphql-fields-to-relations';
import { Arg, Ctx, Info, Mutation, Query, Resolver } from 'type-graphql';
import { Context } from '../context';

@Resolver(() => Book)
export class BookResolver {
  @Query(() => [Book])
  public async getBooks(@Ctx() ctx: Context, @Info() info: GraphQLResolveInfo): Promise<Book[]> {
    const relationPaths = fieldsToRelations(info);
    return ctx.db.getRepository(Book).findAll(relationPaths);
  }

  @Query(() => Book, { nullable: true })
  public async getBook(
    @Arg('id') id: string,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Book | null> {
    const relationPaths = fieldsToRelations(info);
    return ctx.db.getRepository(Book).findOne({ id }, relationPaths);
  }

  @Mutation(() => Book)
  public async addBook(
    @Arg('input') input: BookValidator,
    @Arg('authorId') authorId: string,
    @Arg('publisherId', { nullable: true }) publisherId: string,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Book> {
    const book = new Book(input);
    book.author = await ctx.db
      .getRepository(Author)
      .findOneOrFail({ id: authorId }, fieldsToRelations(info));

    if (publisherId) {
      book.publisher = await ctx.db.getRepository(Publisher).findOneOrFail(
        { id: publisherId },
        fieldsToRelations(info, {
          root: 'publisher',
        }),
      );
    }
    await ctx.db.persist(book).flush();
    return book;
  }

  @Mutation(() => Book)
  public async updateBook(
    @Arg('input') input: BookValidator,
    @Arg('id') id: string,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Book> {
    const relationPaths = fieldsToRelations(info);
    const book = await ctx.db.getRepository(Book).findOneOrFail({ id }, relationPaths);
    book.assign(input);
    await ctx.db.persist(book).flush();
    return book;
  }

  @Mutation(() => Boolean)
  public async deleteBook(@Arg('id') id: string, @Ctx() ctx: Context): Promise<boolean> {
    const book = await ctx.db.getRepository(Book).findOneOrFail({ id });
    await ctx.db.getRepository(Book).remove(book).flush();
    return true;
  }
}