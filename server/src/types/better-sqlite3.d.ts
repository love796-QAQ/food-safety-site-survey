declare module 'better-sqlite3' {
  type BindParameters = any[] | Record<string, unknown> | unknown

  interface RunResult {
    changes: number
    lastInsertRowid: unknown
  }

  interface Statement<Params extends BindParameters = any[], Row = any> {
    get(...params: Params extends any[] ? Params : [Params]): Row
    all(...params: Params extends any[] ? Params : [Params]): Row[]
    run(...params: Params extends any[] ? Params : [Params]): RunResult
  }

  interface Pragmas {
    simple?: boolean
  }

  interface Database {
    prepare<Params extends BindParameters = any[], Row = any>(sql: string): Statement<Params, Row>
    pragma(source: string, options?: Pragmas): unknown
    exec(sql: string): Database
  }

  interface DatabaseConstructor {
    new (filename: string, options?: object): Database
    (filename: string, options?: object): Database
    prototype: Database
  }

  const BetterSqlite3: DatabaseConstructor
  export default BetterSqlite3
}
