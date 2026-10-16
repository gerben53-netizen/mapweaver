import fs from 'node:fs/promises';import Database from 'better-sqlite3';
await fs.mkdir('.qa.local/organic-v2/data',{recursive:true});const db=new Database('.qa.local/land-comparison/data/mapweaver.sqlite3',{readonly:true,fileMustExist:true});await db.backup('.qa.local/organic-v2/data/mapweaver.sqlite3');db.close();
