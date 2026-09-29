import fs from 'node:fs';
const url='https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.2/LICENSE';
const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
const text=await response.text();if(!text.includes('Apache License'))throw Error('Unexpected license');
fs.mkdirSync('licenses',{recursive:true});fs.writeFileSync('licenses/drizzle-orm-0.45.2-LICENSE.txt',text);
fs.writeFileSync('artifacts/t102_1/LICENSE_SOURCE.json',JSON.stringify({url,status:response.status},null,2));
