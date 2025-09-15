import { table, boolean } from './helpers';

export const setup = table('setup', {
  completed: boolean('completed').primaryKey().default(false),
});
