import { Migration } from '@mikro-orm/migrations';

export class Migration20210724195543 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "author" drop constraint if exists "author_terms_accepted_check";');
    this.addSql('alter table "author" alter column "terms_accepted" type bool using ("terms_accepted"::bool);');
  }

}
