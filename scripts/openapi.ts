import {writeFile} from 'node:fs/promises';
import {buildApp} from '../apps/api/app.ts';
import {config} from '../packages/platform/config.ts';
const {app}=await buildApp(config());await app.ready();
await writeFile('openapi.json',JSON.stringify(app.swagger(),null,2)+'\n');await app.close();
