import {copyFile,mkdir} from 'node:fs/promises';await mkdir('dist/packages/platform',{recursive:true});await copyFile('packages/platform/governor.lua','dist/packages/platform/governor.lua');
await mkdir('dist/certs',{recursive:true});await copyFile('certs/russian-trusted-root-ca.crt','dist/certs/russian-trusted-root-ca.crt');
