import 'dotenv/config';
import { sql } from 'drizzle-orm';
import {
  mysqlTable,
  int as mysqlInt,
  varchar,
  double as mysqlDouble,
  boolean as mysqlBoolean,
  json as mysqlJson,
  text as mysqlText,
  primaryKey as mysqlPrimaryKey,
  uniqueIndex as mysqlUniqueIndex,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import {
  sqliteTable,
  integer,
  text as sqliteText,
  real as sqliteReal,
  primaryKey as sqlitePrimaryKey,
  uniqueIndex as sqliteUniqueIndex,
} from 'drizzle-orm/sqlite-core';

type DbType = 'sqlite' | 'mysql' | 'mariadb';
const dbType = (process.env.DATABASE as DbType) ?? 'sqlite';
const isMySql = dbType === 'mysql' || dbType === 'mariadb';

export const table = isMySql ? mysqlTable : sqliteTable;
export const primaryKey = isMySql ? mysqlPrimaryKey : sqlitePrimaryKey;
export const uniqueIndex = isMySql ? mysqlUniqueIndex : sqliteUniqueIndex;

export const serial = isMySql
  ? (name: string) => mysqlInt(name).autoincrement().primaryKey()
  : (name: string) => integer(name).primaryKey({ autoIncrement: true });

export const int = isMySql
  ? (name: string) => mysqlInt(name)
  : (name: string) => integer(name);

export const text = isMySql
  ? (name: string, opts?: { length?: number }) =>
      opts?.length ? varchar(name, { length: opts.length }) : mysqlText(name)
  : (name: string, _opts?: { length?: number }) => sqliteText(name);

export const double = isMySql
  ? (name: string) => mysqlDouble(name)
  : (name: string) => sqliteReal(name);

export const boolean = isMySql
  ? (name: string) => mysqlBoolean(name)
  : (name: string) => integer(name, { mode: 'boolean' });

export const timestamp = isMySql
  ? (name: string) => mysqlInt(name)
  : (name: string) => integer(name, { mode: 'timestamp' });

export const json = isMySql
  ? (name: string) => mysqlJson(name)
  : (name: string) => sqliteText(name, { mode: 'json' });

export const jsonDefault = (value: unknown) =>
  isMySql ? JSON.stringify(value) : value;

export const enumeration = isMySql
  ? (name: string, values: readonly [string, ...string[]]) => mysqlEnum(name, values)
  : (name: string, values: readonly [string, ...string[]]) =>
      sqliteText(name, { enum: values });

export const now = () =>
  isMySql ? sql`UNIX_TIMESTAMP()` : sql`(strftime('%s', 'now'))`;
