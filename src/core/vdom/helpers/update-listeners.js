/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {  // 根据事件名是否有 passive，once，capture等修饰符
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () { // 定义了 invoker并返回
    const fns = invoker.fns
    if (Array.isArray(fns)) { // 一个事件可能会对应多个回调函数
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns // 每一次执行 invoker函数都是从 invoker.fns里取执行的回调函数
  return invoker
}

export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {  // 遍历 on添加事件监听
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)  // 获得每一个事件名，通过normalizeEvent做处理
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {  // 对事件回调函数做处理
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)  // 满足条件会创建一个回调函数
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params) // 完成一次事件绑定
    } else if (cur !== old) {  // 第二次执行该函数的时候，判断cur!==old
      // 只需要更改 old.fns = cur把之前绑定的 invoker.fns赋值为新的回调函数
      old.fns = cur
      on[name] = old // 保留引用关系
      // 保证了事件回调只添加一次，以后仅仅去修改他的回调函数的引用
    }
  }
  for (name in oldOn) {  // 遍历 oldOn去移除事件监听
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
// 关于监听和移除监听的方法都是外部传入的，因为它既处理原生DOM的添加删除，也处理自定义事件的添加删除
