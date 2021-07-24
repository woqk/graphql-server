import AuthorValidator from '../validators/author.validator';
import { Author } from '../entities/author.entity';
import { GraphQLResolveInfo } from 'graphql';
import fieldsToRelations from 'graphql-fields-to-relations';
import { Arg, Ctx, Info, Mutation, Query, Resolver } from 'type-graphql';
import { Context } from '../context';


@Resolver(() => Author)
export class AuthorResolver {
  @Query(() => [Author])
  public async getAuthors(@Ctx() ctx: Context, @Info() info: GraphQLResolveInfo): Promise<Author[]> {
    const relationPaths = fieldsToRelations(info);
    return ctx.db.getRepository(Author).findAll(relationPaths);
  }

  @Query(() => Author, { nullable: true })
  public async getAuthor(
    @Arg('id') id: string,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Author | null> {
    const relationPaths = fieldsToRelations(info);
    return ctx.db.getRepository(Author).findOne({ id }, relationPaths);
  }

  @Mutation(() => Author)
  public async addAuthor(@Arg('input') input: AuthorValidator, @Ctx() ctx: Context): Promise<Author> {
    const author = new Author(input);
    await ctx.db.persist(author).flush();
    return author;
  }

  @Mutation(() => Author)
  public async updateAuthor(
    @Arg('input') input: AuthorValidator,
    @Arg('id') id: string,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Author> {
    const relationPaths = fieldsToRelations(info);
    const author = await ctx.db.getRepository(Author).findOneOrFail({ id }, relationPaths);
    author.assign(input);
    await ctx.db.persist(author).flush();
    return author;
  }

  @Mutation(() => Boolean)
  public async deleteAuthor(@Arg('id') id: string, @Ctx() ctx: Context): Promise<boolean> {
    const author = await ctx.db.getRepository(Author).findOneOrFail({ id });
    await ctx.db.getRepository(Author).remove(author).flush();
    return true;
  }
}