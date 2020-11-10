/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
      // 把当前 watcher的实例赋值给 vm._watcher
    }
    vm._watchers.push(this)
    // 将当前 watcher实例 push到 vm.watchers中， vm._watcher是专门用来监听 vm上数据变化后重新渲染的，所以是一个渲染相关的 watcher
    // options
    if (options) {
      this.deep = !!options.deep // 是否深度监听
      this.user = !!options.user // 是否是 user watcher
      this.lazy = !!options.lazy // 表示是 computed
      this.sync = !!options.sync // 是否同步更新
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true  // 派发更新的标志位
    this.dirty = this.lazy // for lazy watchers 标记为，表示是否对computed计算
    this.deps = [] // 上一次添加的 Dep实例数组
    this.newDeps = [] // 新添加的 Dep实例数组
    // 表示Watcher实例持有的Dep 实例数组
    this.depIds = new Set()
    this.newDepIds = new Set()
    // 分别表示上面两个的 id
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {  // 当实例化一个渲染 watcher的时候，首先进入watcher的构造函数的逻辑，然后执行this.get()方法
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm) // this.getter对应就是 updateComponent函数
      // 实际上就是在执行 vm._update(vm._render(), hydrating)
      // 会先执行 vm._render方法，这个过程会访问数据，这个时候就触发了数据对象的 getter
      // 在触发 getter的时候会调用dep.depend() 方法，
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {  // 依赖清空
    let i = this.deps.length
    while (i--) {  // 首先遍历deps 移除对dep的订阅
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds  // 将depIds和 newDepIds交换
    this.newDepIds = tmp
    this.newDepIds.clear()  // 清空newDepIds
    tmp = this.deps
    this.deps = this.newDeps // 将deps和newDeps交换
    this.newDeps = tmp
    this.newDeps.length = 0 // 清空newDeps
  }
// 为什么要做订阅移除呢，在添加 deps时已经通过 id避免了重复订阅？
  // 模板根据 v-if去渲染 a， b子模板时，渲染a的时候，为a添加了getter和依赖收集
  // 如果 此时渲染了 b，可能操作b的过程中修改了a的数据，此时a是没必要在订阅消息的，所以依赖清除很有必要
  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get() // 得到当前值。会执行 getter方法，所以修改组件相关的响应式数据会触发组件的重新渲染
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try { //满足条件，执行watcher的回调
            this.cb.call(this.vm, value, oldValue)
            // 新值和旧值作为参数传入，所以我们添加自定义watcher时能在回调函数的参数中拿到 新旧值的原因
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()  // 计算属性求值
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
