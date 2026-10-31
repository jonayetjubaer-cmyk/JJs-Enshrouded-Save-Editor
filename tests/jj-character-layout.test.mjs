import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCharacter, buildCharacter } from '../shared/character.mjs';

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
