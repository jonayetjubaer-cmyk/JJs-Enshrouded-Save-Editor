import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCharacter, buildCharacter, unknownItemsUnchanged } from '../shared/character.mjs';

const items=JSON.parse(fs.readFileSync(new URL('../data/items.json',import.meta.url),'utf8'));
const skills=JSON.parse(fs.readFileSync(new URL('../data/skills.json',import.meta.url),'utf8'));
const wearable=new Set(['Armour_Head','Armour_UpperBody','Armour_Arms','Armour_LowerBody','Armour_Feet','Armour_Ring','Shield','HookShot','Glider','Backpack']);
const read=bytes=>parseCharacter(bytes,id=>!!items[id],id=>!!skills.nodes[id],id=>wearable.has(items[id]?.slot));
const outfits=[['Armour_LowerBody',8],['Armour_UpperBody',6],['Armour_Head',5]].map(([kind,bit])=>({bit,id:Number(Object.keys(items).find(id=>items[id].slot===kind))}));
const skillIds=Object.keys(skills.nodes).slice(0,3).map(Number);
function compact(count){
  const chosen=outfits.slice(0,count).sort((a,b)=>a.bit-b.bit);
  const mask=chosen.reduce((m,e)=>m|(1<<e.bit),0),mid=Buffer.alloc(12,0xa7);mid.writeUInt32LE(mask,mid.length-4);
  return {level:1,xp:5,skills:[],equipment:chosen.map((e,slot)=>({slot,itemId:e.id,count:1})),
    main:[{slot:0,itemId:1457307757,count:1,level:1},{slot:16,itemId:2818493303,count:3}],extra:[],
    _equipCount:count,_equipMask:mask,_equipFree:0,
    _raw:{head:Buffer.alloc(0x3a,0xa7),mid,between:Buffer.from([5,2,0,0]),tail:Buffer.alloc(22,0)} };
}

for(let count=0;count<=3;count++)test(`compact save with ${count} equipped pieces opens and round-trips exactly`,()=>{
  const original=buildCharacter(compact(count)),character=read(original);
  assert.equal(character.equipment.length,count);
  assert.equal(character.main.length,2);
  assert.equal(character._raw.between.length,4);
  assert.deepEqual(buildCharacter(character),original);
});

test('removing the last compact equipment piece preserves the inventory header and contents',()=>{
  const original=buildCharacter(compact(1)),character=read(original);
  const result=read(buildCharacter({...character,equipment:[]}));
  assert.equal(result.equipment.length,0);
  assert.equal(result._equipMask,0);
  assert.deepEqual(result.main,character.main);
  assert.deepEqual(result._raw.between,character._raw.between);
  assert.deepEqual(buildCharacter(character),original);
});

test('adding and refunding skill records moves compact equipment and inventory without losing bytes',()=>{
  const character=read(buildCharacter(compact(1)));
  const learned=read(buildCharacter({...character,skills:skillIds.map(id=>({id,level:1}))}));
  const refunded=read(buildCharacter({...learned,skills:learned.skills.map(s=>({...s,level:0}))}));
  assert.deepEqual(learned.skills,skillIds.map(id=>({id,level:1})));
  assert.deepEqual(refunded.skills,skillIds.map(id=>({id,level:0})));
  for(const c of [learned,refunded]){
    assert.deepEqual(c.equipment,character.equipment);
    assert.deepEqual(c.main,character.main);
    assert.deepEqual(c._raw,character._raw);
  }
});

test('short equipment layouts with mismatched mask counts are refused',()=>{
  const fixture=compact(2);fixture._raw.mid.writeUInt32LE(1<<8,fixture._raw.mid.length-4);
  assert.throws(()=>read(buildCharacter(fixture)),/não encontrado/);
});

test('ambiguous empty equipment layouts are refused rather than guessed',()=>{
  const fixture=compact(0);
  fixture._raw.tail=Buffer.from([0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0]);
  assert.throws(()=>read(buildCharacter(fixture)),/ambíguo/);
});

const UNKNOWN=0xfefefefe;
const knownItem=id=>!!items[id];
function withUnknown(prefix=0,container='main'){
  const c=compact(3);
  c.main=[0,1,2].map(slot=>({slot,itemId:1457307757,count:slot+1,level:1}));
  c[container].push({slot:3,itemId:UNKNOWN,count:32769,level:1});
  if(container==='extra')c._raw.between[2]=1;
  if(prefix){
    c.equipment.push({slot:3,itemId:Number(Object.keys(items).find(id=>items[id].slot==='Armour_Feet')),count:1});
    c._equipCount=4;c._equipMask|=1<<9;c._raw.mid.writeUInt32LE(c._equipMask,c._raw.mid.length-4);
    c._raw.between=Buffer.concat([Buffer.from([9,0]),c._raw.between]);
  }
  return c;
}

for(const prefix of [0,2])for(const container of ['main','extra'])test(`catalogue misses in ${container}, prefix ${prefix}: exact preservation and supported edits`,()=>{
  const bytes=buildCharacter(withUnknown(prefix,container)),c=read(bytes);
  assert.deepEqual(buildCharacter(c),bytes);
  assert.equal(c[container].find(e=>e.itemId===UNKNOWN).count,32769);
  const next={...c,xp:c.xp+1,main:c.main.map(e=>e.itemId===1457307757?{...e,count:e.count+2}:e)};
  assert.equal(unknownItemsUnchanged(c,next,knownItem),true);
  const back=read(buildCharacter(next));
  assert.equal(back.xp,next.xp);
  assert.deepEqual(back[container].find(e=>e.itemId===UNKNOWN),c[container].find(e=>e.itemId===UNKNOWN));
});

test('unknown entries cannot be modified, replaced, moved, deleted, duplicated or created',()=>{
  const c=read(buildCharacter(withUnknown())),entry=c.main.find(e=>e.itemId===UNKNOWN);
  const changes=[
    {...c,main:c.main.map(e=>e===entry?{...e,count:1}:e)},
    {...c,main:c.main.map(e=>e===entry?{...e,level:2}:e)},
    {...c,main:c.main.map(e=>e===entry?{...e,slot:4}:e)},
    {...c,main:c.main.filter(e=>e!==entry)},
    {...c,main:[...c.main,{...entry,slot:4}]},
    {...c,main:c.main.filter(e=>e!==entry),extra:[entry]},
    {...c,main:c.main.map(e=>e===entry?{...e,itemId:1457307757}:e)},
    {...c,main:[...c.main,{...entry,itemId:UNKNOWN-1,slot:4}]},
    {...c,main:[...c.main,{slot:entry.slot,itemId:1457307757,count:1}]},
  ];
  for(const next of changes)assert.equal(unknownItemsUnchanged(c,next,knownItem),false);
  assert.equal(unknownItemsUnchanged(c,structuredClone(c),knownItem),true);
});

test('catalogue miss fallback refuses unknown flags, duplicate slots, unsorted slots and unanchored headers',()=>{
  for(const change of [
    c=>{c.main[3].slot=1;},
    c=>{c._raw.between=Buffer.concat([Buffer.alloc(8,0xa7),c._raw.between]);},
  ]){
    const c=withUnknown();change(c);
    const bytes=buildCharacter(c);
    assert.throws(()=>read(bytes));
  }
  const fixture=withUnknown(),unsorted=buildCharacter(fixture),start=unsorted.length-fixture._raw.tail.length-36;
  const first=Buffer.from(unsorted.subarray(start,start+9));
  unsorted.copy(unsorted,start,start+9,start+18);first.copy(unsorted,start+9);
  assert.throws(()=>read(unsorted));
  const bytes=buildCharacter(withUnknown()),offset=bytes.indexOf(Buffer.from([0xfe,0xfe,0xfe,0xfe]));
  bytes[offset+6]=0x80;
  assert.throws(()=>read(bytes));
});

test('a catalogue miss does not permit an inventory of arbitrary unrecognised IDs',()=>{
  const c=withUnknown();c.main=c.main.map(e=>({...e,itemId:UNKNOWN}));
  assert.throws(()=>read(buildCharacter(c)));
});
