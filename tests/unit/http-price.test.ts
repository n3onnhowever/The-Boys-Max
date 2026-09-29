import test from 'node:test';
import assert from 'node:assert/strict';
import {amountSchema,priceSchema,commandSchema} from '../../packages/contracts/http.ts';
import {priceFromQuote} from '../../modules/search/core/price.ts';
import type {Price,Amount} from '../../modules/search/core/types.ts';
import type {Command} from '../../packages/contracts/domain.ts';
import {terms,OID} from '../fixtures.ts';

test('HTTP amount discriminator rejects impossible amount field combinations',()=>{
 for(const amount of [
  {kind:'EXACT',exact_minor:null,min_minor:null,max_minor:null},
  {kind:'FREE',exact_minor:'0',min_minor:null,max_minor:null},
  {kind:'RANGE',exact_minor:null,min_minor:'100',max_minor:null},
 ])assert.equal(amountSchema.safeParse(amount).success,false);
 const parsed:Amount=amountSchema.parse({kind:'EXACT',exact_minor:'70000',min_minor:null,max_minor:null});
 assert.equal(parsed.kind,'EXACT');
});
for(const [kind,fields] of [
 ['EXACT',{exact_minor:'70000'}],['FROM',{min_minor:'70000'}],['RANGE',{min_minor:'10000',max_minor:'70000'}],
 ['FREE',{}],['TEXT',{}],['UNKNOWN',{}]
] as const)test(`HTTP canonical price preserves ${kind} evidence and unknown totals`,()=>{
 const raw_label=kind==='TEXT'?'Вход бесплатный, депозит на еду — 700 рублей':'synthetic test evidence';
 const expected=priceFromQuote({kind,...fields,basis:'PER_PERSON',currency:'RUB',raw_label,source_field:'synthetic.price',fees_known:false,fee_mode:'UNKNOWN'},'synthetic-t102');
 const parsed:Price=priceSchema.parse(expected);
 assert.deepEqual(parsed,expected);
 assert.equal(parsed.source_quote.raw_label,raw_label);
 assert.equal(parsed.total_price.knownness,'UNKNOWN');
 const command:Command=commandSchema.parse({kind:'ADD_OPTION',expectedStateVersion:1,optionId:OID,snapshotId:OID,terms:{...terms,price:expected}});
 assert.equal(command.kind,'ADD_OPTION');
 assert.equal(priceSchema.safeParse({...expected,total_price:{knownness:'KNOWN',basis:'PER_PERSON',currency:'RUB',amount:{kind:'FREE',exact_minor:null,min_minor:null,max_minor:null}}}).success,false);
});
