import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { actualLocale, localeSourceEvidence } from './official-locale-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'
const TOKEN='12345678-1234-1234-1234-123456789abc'
function visit(node,predicate,found=[]) {
 if(Array.isArray(node)){node.forEach(child=>visit(child,predicate,found));return found}
 if(!node||typeof node!=='object')return found
 if(predicate(node))found.push(node)
 visit(node.children,predicate,found);visit(node.props?.children,predicate,found);visit(node.props?.footer,predicate,found)
 return found
}
const tick=()=>new Promise(resolve=>setImmediate(resolve))
const delay=()=>new Promise(resolve=>setTimeout(resolve,5))
async function harness(language, options={}) {
 const r=elementRenderer(),locale=actualLocale(language),calls=[],registrations=[]
 let spec
 const source=await readFile(new URL('../dist/client.js',import.meta.url),'utf8')
 runInNewContext(source,{setTimeout,clearTimeout,document:{activeElement:null},window:{__ModuleLoader__:{load(value){spec=value}}}})
 const target={scope:'preset:preset-standard',id:'tool-subagent-fork',moduleName:'@dsh-native-collab/derived/tool-subagent/fork',previousModule:'@deepseek-ai/dsh-tool-subagent',operation:'replace'}
 const remote={collabUi:{
  async status(){return {rows:[{id:'dsh-native-collab-agent-team',moduleName:'@dsh-native-collab/derived/agent-team',current:'enabled',sourceLayer:'unknown',runtimePhase:'active'}]}},
  async preview(){calls.push('legacy-preview');throw Error('Obsolete preview must not be invoked from the page')},
  async bootStatus(){return {profileName:'test',configured:'disabled',writeSupport:'available',pendingRestart:'unknown',error:null}},
  async bootPlan(action){calls.push({plan:action});return {action,accepted:false,planId:TOKEN,targets:Array.from({length:40},(_,i)=>({...target,scope:target.scope+'-'+i})),pendingRestart:'required',error:null,warnings:['fixed-state-not-history-restore','native-features-will-be-enabled']}},
  async bootApply(planId){calls.push({apply:planId});return {action:'enable',accepted:!options.reject,pendingRestart:'required',error:options.reject?'configuration-changed-review-again':null,configured:options.reject?'unknown':'enabled'}},
 }}
 const dispose=await spec.factory(clientRequire(r.React)).apply(clientContext({remote,locale,slots:{inject(_name,register){register();return()=>{}},register(contract,Component){registrations.push({contract,Component});return()=>{}}}}))
 const row=registrations.find(row=>row.contract.name==='plugins.bundle.config'),props={view:'page',t:locale.bind('collabUi'),...row.contract.inject()}
 const bundle=()=>r.draw(row.Component,props)
 const boot=()=>{const element=visit(bundle(),node=>node.props?.key==='boot')[0];return r.draw(element.type,element.props)}
 const button=(id,tree=boot())=>{const button=visit(tree,node=>node.props?.['data-testid']===id)[0];assert.ok(button,`Missing ${id}`);return button}
 return {r,locale,t:props.t,calls,bundle,boot,button,dispose:async()=>{r.destroy();await dispose()}}
}
for(const language of ['zh','en']) {
 test(`RC9 ${language}: actual public LocaleRuntime resolves flat boot keys and all rendered operation/warning labels`,async t=>{
  t.diagnostic(JSON.stringify(localeSourceEvidence))
  const f=await harness(language);try{
   f.boot();await tick();f.button('boot-enable').props.onClick();await tick()
   const tree=f.boot(),texts=visit(tree,()=>true).flatMap(node=>node.children.flat(Infinity).filter(value=>typeof value==='string'))
   for(const key of ['boot.title','boot.confirmTitle','boot.warning.fixed-state-not-history-restore','boot.warning.native-features-will-be-enabled','boot.operation.replace'])assert.notEqual(f.t(key),key)
   assert.ok(!texts.some(value=>/^boot\./.test(value)))
   assert.equal(visit(tree,node=>node.type==='tbody')[0].children[0].length,40)
   const modal=visit(tree,node=>node.type==='test-host-modal')[0]
   assert.equal(modal.props.className,'dsh-native-collab-modal')
   assert.equal(modal.props.contentClassName,'dsh-native-collab-modal-content')
   const css=visit(tree,node=>node.type==='style')[0].children.join('')
   assert.match(css,/width: min\(960px, 100%\)/);assert.match(css,/max-height: 100%/);assert.match(css,/overflow: auto/);assert.match(css,/overflow-wrap: anywhere/);assert.match(css,/padding: 8px/)
   assert.equal(f.calls.filter(call=>call.apply).length,0)
  }finally{await f.dispose()}
 })
}
test('RC9 regression demonstrates that the actual LocaleRuntime does NOT resolve RC8 nested boot dictionaries',()=>{
 const locale=actualLocale('zh');locale.register('test',{zh:{boot:{title:'不会被解析'}}})
 assert.equal(locale.bind('test')('boot.title'),'boot.title')
})
test('RC9 cancel, Escape/mask close, and accepted confirmation restore the exact pre-disable trigger',async()=>{
 const f=await harness('zh');try{
  f.boot();await tick()
  for(const close of ['cancel','escape','confirm']){
   const focuses=[],trigger={isConnected:true,disabled:false,focus(){focuses.push(close)}}
   f.button(close==='escape'?'boot-restore':'boot-enable').props.onClick({currentTarget:trigger})
   trigger.disabled=true;f.boot();await tick();const tree=f.boot();trigger.disabled=false
   if(close==='cancel')f.button('boot-cancel',tree).props.onClick()
   else if(close==='escape')visit(tree,node=>node.type==='test-host-modal')[0].props.onClose()
   else{f.button('boot-confirm',tree).props.onClick();await tick()}
   f.boot();await delay();assert.deepEqual(focuses,[close])
   assert.equal(visit(f.boot(),node=>node.type==='test-host-modal').length,0)
  }
  assert.equal(f.calls.filter(call=>call.apply).length,1)
 }finally{await f.dispose()}
})
test('RC9 rejected confirmation restores focus but does not hide preferences or claim enabled',async()=>{
 const f=await harness('en',{reject:true});try{
  f.boot();await tick();let focuses=0
  f.button('boot-enable').props.onClick({currentTarget:{isConnected:true,disabled:false,focus(){focuses++}}});await tick()
  f.button('boot-confirm').props.onClick();await tick();f.boot();await delay()
  assert.equal(focuses,1);assert.equal(visit(f.bundle(),node=>node.props?.key==='settings').length,1)
 }finally{await f.dispose()}
})
test('RC9 status diagnostics has no obsolete preview entry and separates runtime stage from unknown provenance',async()=>{
 const f=await harness('zh');try{
  const entry=visit(f.bundle(),node=>node.props?.key==='status'&&typeof node.type==='function')[0]
  const draw=()=>f.r.draw(entry.type,entry.props)
  draw();await tick();const page=draw()
  assert.equal(visit(page,node=>node.props?.['data-testid']?.startsWith('preview-')).length,0)
  assert.equal(visit(page,node=>node.type==='th'&&node.props.scope==='col').length,4)
  const cells=visit(page,node=>node.type==='td').map(node=>node.children.join(''))
  assert.deepEqual(cells,['已启用','未知','运行中'])
  assert.ok(!f.calls.includes('legacy-preview'))
 }finally{await f.dispose()}
})
