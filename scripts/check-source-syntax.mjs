import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.TYPESCRIPT_MODULE;
const imported=modulePath?await import(pathToFileURL(modulePath).href):await import('typescript');
const ts=imported.default??imported;
const root=process.cwd();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(new Set(['node_modules','dist','.git']).has(e.name)?[]:walk(path.join(dir,e.name))):[path.join(dir,e.name)]);}
const files=walk(root).filter(p=>/\.tsx?$/.test(p)&&!p.endsWith('.d.ts')).sort();
const diagnostics=[];
for(const filename of files){const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,jsx:ts.JsxEmit.ReactJSX}});for(const d of out.diagnostics??[])diagnostics.push({file:path.relative(root,filename),code:d.code,category:d.category,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});}
console.log(JSON.stringify({check:'syntax-transpile-only',typescript_version:ts.version,file_count:files.length,files:files.map(p=>path.relative(root,p)),diagnostics,limitation:'No full semantic typecheck, module resolution, dependency installation or target build.'},null,2));
process.exitCode=diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error)?1:0;
