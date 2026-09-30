import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogSourceLabel} from '../../packages/persistence/ui.ts';

test('KudaGo cards disclose KudaGo even when catalog import uses the shared curated provider',()=>{
 assert.equal(catalogSourceLabel('LIVE','ManualProvider','https://kudago.com/msk/event/test/',false),'KudaGo');
 assert.equal(catalogSourceLabel('LIVE','ManualProvider','https://www.darwinmuseum.ru/project',false),'Дарвиновский музей');
 assert.equal(catalogSourceLabel('LIVE','ManualProvider','https://www.tretyakovgallery.ru/project',false),'Третьяковская галерея');
 assert.equal(catalogSourceLabel('SYNTHETIC','ManualProvider',null,false),'Подготовленный пример');
});
