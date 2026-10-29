/** Hook/element simulator only. No React DOM, layout engine or browser is emulated. */
export function elementRenderer() {
 const instances = new Map()
 let active, cursor
 const React = {
  Fragment:'fragment',
  createElement:(type,props,...children)=>({type,props:props??{},children}),
  useState(initial) {
   const instance=instances.get(active), index=cursor++
   if (!(index in instance.hooks)) instance.hooks[index]=typeof initial==='function'?initial():initial
   return [instance.hooks[index],value=>{instance.hooks[index]=typeof value==='function'?value(instance.hooks[index]):value}]
  },
  useRef(initial) {
   const instance=instances.get(active),index=cursor++
   if(!(index in instance.hooks))instance.hooks[index]={current:initial}
   return instance.hooks[index]
  },
  useEffect(callback,deps) {
   const instance=instances.get(active),index=cursor++,previous=instance.hooks[index]
   if (previous && deps && deps.length===previous.deps?.length && deps.every((value,i)=>Object.is(value,previous.deps[i])))return
   instance.effects.push(()=>{previous?.cleanup?.();const cleanup=callback();instance.hooks[index]={deps,cleanup}})
  },
 }
 React.useLayoutEffect = React.useEffect // No layout: run the effect only.
 React.useMemo = callback => callback()
 return { React,
  draw(Component,props) {
   active=Component;cursor=0
   if(!instances.has(active))instances.set(active,{hooks:[],effects:[]})
   const instance=instances.get(active),node=Component(props)
   for(const effect of instance.effects.splice(0))effect()
   return node
  },
  destroy(){for(const instance of instances.values())for(const hook of instance.hooks)hook?.cleanup?.();instances.clear()},
 }
}
