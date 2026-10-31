import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const skills=JSON.parse(fs.readFileSync(new URL('../data/skills.json',import.meta.url),'utf8'));
// Load the actual checker with the static catalog and a stable message renderer, without a WebView.
const source=fs.readFileSync(new URL('../src/treecheck.js',import.meta.url),'utf8')
  .replace("import { skills, skillName } from './gamedata.js';",`const skills=${JSON.stringify(skills)}; const skillName=id=>skills.nodes[id]?.en||String(id);`)
  .replace("import { t } from './i18n.js';",'const t=(text,values={})=>text.replace(/\\{([^}]+)\\}/g,(_,key)=>String(values[key]??key));');
const {knownTotal,totalKey,checkTree}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null};
const model={path:'fixture:skills',level:1,skills:[]};

test('invalid stored budgets do not bypass the unknown-budget save guard',()=>{
  for(const value of ['',' ','NaN','Infinity','-1','2.5','9007199254740992','not a number']){
    values.set(totalKey(model),value);assert.equal(knownTotal(model),null,value);
  }
  for(const value of ['0','12',' 8 ']){values.set(totalKey(model),value);assert.equal(knownTotal(model),Number(value));}
  values.clear();assert.equal(knownTotal(model),null);
});

test('a budget is isolated by character and level and never mutates saved skill ranks',()=>{
  const before=structuredClone(model);values.set(totalKey(model),'12');
  assert.equal(knownTotal(model),12);
  assert.equal(knownTotal({...model,path:'fixture:other'}),null);
  assert.equal(knownTotal({...model,level:2}),null);
  assert.equal(checkTree(model).total,12);
  assert.deepEqual(model,before);
  values.clear();
});

test('real skill spending still cannot exceed the supplied validation budget',()=>{
  const roots=new Set(Object.entries(skills.nodes).filter(([,n])=>n.type==='Root').map(([id])=>Number(id)));
  const edge=skills.links.find(([a,b])=>roots.has(a)&&!roots.has(b)&&skills.nodes[b].cost>0);
  assert.ok(edge);
  const learned={...model,skills:[{id:edge[1],level:1}]};
  values.set(totalKey(learned),'0');
  const result=checkTree(learned);
  assert.ok(result.used>0);assert.ok(result.problems.length>0);
  values.clear();
});
