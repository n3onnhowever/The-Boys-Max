import {randomBytes} from 'node:crypto';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {dirname} from 'node:path';
const path=process.argv[2]??'.runtime/test.json';
try{await readFile(path);console.log('Existing isolated test configuration retained.');}catch{
 await mkdir(dirname(path),{recursive:true});
 const secret=()=>randomBytes(32).toString('hex');
 await writeFile(path,JSON.stringify({APP_MODE:'test',SESSION_KEY:secret(),ESCROW_KEY:secret(),BOT_TOKEN:secret(),WEBHOOK_SECRET:secret(),CREDENTIAL_SCOPE:'max23-isolated-test',COOKIE_PROFILE:'LAX_FIRST_PARTY',PUBLIC_ORIGIN:'http://localhost:3000',MAX_INGRESS_MODE:'WEBHOOK',DATABASE_URL:'postgres://max23:max23_test@postgres:5432/max23_test',REDIS_URL:'redis://redis:6379'},null,2),{mode:0o600,flag:'wx'});
 console.log('Generated isolated test configuration; secrets are not printed.');
}
