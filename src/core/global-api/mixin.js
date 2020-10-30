/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 利用vue.mixin把 beforeCreate 和 destroyed钩子函数注入到每一个组件中
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
