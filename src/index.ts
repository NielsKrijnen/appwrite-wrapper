import { Client, Databases, ID, Storage, Query, type Models, ImageFormat, ImageGravity, type UploadProgress, Account, Avatars, Functions, ExecutionMethod, Graphql, Locale, Messaging, Teams } from "appwrite";

type AppwriteConfig<Database, Storage extends string, Functions extends string> = {
  database: DatabaseConfig<Database>,
  storage: StorageConfig<Storage>,
  functions: FunctionsConfig<Functions>
}

type DatabaseConfig<T> = {
  [db in keyof T]: {
    id: string,
    colls: {
      [coll in keyof T[db]]: string
    }
  }
}

type StorageConfig<T extends string> = {
  [k in T]: string
}

type FunctionsConfig<T extends string> = {
  [k in T]: string
}

export function createWebClient
<Database = any, Storage extends string = string, Functions extends string = string>
(endpoint: string, project: string, config: AppwriteConfig<Database, Storage, Functions>, session?: string) {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
  ;

  if (session) client.setSession(session);

  type SelectQuery<DB extends keyof Database, COLL extends keyof Database[DB]> = Array<keyof Database[DB][COLL]>;

  return {
    get databases() {
      const databases = new Databases(client);
      return {
        async get<DB extends keyof Database, COLL extends keyof Database[DB], S extends SelectQuery<DB, COLL> | undefined>(db: DB, coll: COLL, id: string, select?: S, queries?: string[]) {
          if (select) {
            if (queries) queries.push(Query.select(select as string[]))
            else queries = [Query.select(select as string[])]
          }
          type Document = (S extends SelectQuery<DB, COLL> ? Pick<Database[DB][COLL], S[number]> : Database[DB][COLL]) & Models.Document
          const document = await databases.getDocument<Document>(config.database[db] ? config.database[db].id : db as string, config.database[db] ? config.database[db].colls[coll] : coll as string, id, queries);
          return rebuildDocument(document);
        },
        async list<DB extends keyof Database, COLL extends keyof Database[DB], S extends SelectQuery<DB, COLL> | undefined>(db: DB, coll: COLL, select?: S, queries?: string[]) {
          if (select) {
            if (queries) queries.push(Query.select(select as string[]))
            else queries = [Query.select(select as string[])]
          }
          type Document = (S extends SelectQuery<DB, COLL> ? Pick<Database[DB][COLL], S[number]> : Database[DB][COLL]) & Models.Document
          const documents = await databases.listDocuments<Document>(config.database[db] ? config.database[db].id : db as string, config.database[db] ? config.database[db].colls[coll] : coll as string, queries);
          const newDocuments: Document[] = [];
          for (const document of documents.documents) {
            newDocuments.push(rebuildDocument(document));
          }
          return {
            documents: newDocuments,
            total: documents.total
          } as Models.DocumentList<Document>;
        },
        create<DB extends keyof Database, COLL extends keyof Database[DB], Doc extends Models.Document = Database[DB][COLL] & Models.Document>(db: DB, coll: COLL, id: string = ID.unique(), data: Omit<Doc, keyof Models.Document>, permissions?: string[]) {
          return databases.createDocument<Doc>(config.database[db] ? config.database[db].id : db as string, config.database[db] ? config.database[db].colls[coll] : coll as string, id, data, permissions);
        },
        update<DB extends keyof Database, COLL extends keyof Database[DB], Doc extends Models.Document = Database[DB][COLL] & Models.Document>(db: DB, coll: COLL, id: string, data: Partial<Omit<Doc, keyof Models.Document>>, permissions?: string[]) {
          return databases.updateDocument<Doc>(config.database[db] ? config.database[db].id : db as string, config.database[db] ? config.database[db].colls[coll] : coll as string, id, data, permissions);
        },
        delete<DB extends keyof Database>(db: DB, coll: keyof Database[DB], id: string) {
          return databases.deleteDocument(config.database[db] ? config.database[db].id : db as string, config.database[db] ? config.database[db].colls[coll] : coll as string, id);
        }
      } as const;
    },
    get storage() {
      const storage = new Storage(client);
      return {
        get(bucket: Storage, id: string) {
          return storage.getFile(bucket, id);
        },
        download(bucket: Storage, id: string) {
          return storage.getFileDownload(bucket, id);
        },
        preview(bucket: Storage, id: string, width?: number, height?: number, gravity?: ImageGravity, quality?: number, borderWidth?: number, borderColor?: string, borderRadius?: number, opacity?: number, rotation?: number, background?: string, output?: ImageFormat) {
          return storage.getFilePreview(bucket, id, width, height, gravity, quality, borderWidth, borderColor, borderRadius, opacity, rotation, background, output);
        },
        view(bucket: Storage, id: string) {
          return storage.getFileView(bucket, id);
        },
        list(bucket: Storage, queries?: string[], search?: string) {
          return storage.listFiles(bucket, queries, search);
        },
        create(bucket: Storage, file: File, id: string = ID.unique(), permissions?: string[], onProgress?: (progress: UploadProgress) => void) {
          return storage.createFile(bucket, id, file, permissions, onProgress);
        },
        update(bucket: Storage, id: string, name?: string, permissions?: string[]) {
          return storage.updateFile(bucket, id, name, permissions);
        },
        delete(bucket: Storage, id: string) {
          return storage.deleteFile(bucket, id);
        }
      } as const;
    },
    get functions() {
      const functions = new Functions(client);
      return {
        execute(functionId: Functions, body?: string, async?: boolean, xpath?: string, method?: ExecutionMethod, headers?: object) {
          return functions.createExecution(functionId, body, async, xpath, method, headers);
        },
        get(functionId: Functions, id: string) {
          return functions.getExecution(functionId, id);
        },
        list(functionId: Functions, queries?: string[], search?: string) {
          return functions.listExecutions(functionId, queries, search);
        }
      } as const;
    },
    get account() {
      return new Account(client);
    },
    get avatars() {
      return new Avatars(client);
    },
    get graphQl() {
      return new Graphql(client);
    },
    get locale() {
      return new Locale(client);
    },
    get messaging() {
      return new Messaging(client);
    },
    get teams() {
      return new Teams(client);
    }
  } as const;
}

function rebuildDocument<T extends { [k: string]: any }>(document: T): T {
  let newDocument: any = {};
  for (const property of Object.getOwnPropertyNames(document)) {
    try {
      newDocument[property] = new Date(document[property])
    } catch {
      try {
        newDocument[property] = new URL(document[property]);
      } catch {
        newDocument[property] = document[property];
      }
    }
  }
  return newDocument as T;
}