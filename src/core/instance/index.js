import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
// VUE 的庐山真面目，构造函数实现的类
// 为什么不用 es6的Class 来实现？因为后续许多 mixin的操作都是将 Vue作为参数传递，给Vue 的prototype 上扩展一些方法
// Vue 按功能把这些模块分散到不同的模块中实现， 而不是在一个模块中， 这种方式是 Class难以实现的。 方便代码的维护和管理
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
