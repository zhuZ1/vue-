/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
export function resolveSlots (
  // 接收两个参数，
  children: ?Array<VNode>, // 对应父 vnode的children
  context: ?Component // 父 vnode的上下文。也就是父组件的 vm实例
): { [key: string]: Array<VNode> } {
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {  // 遍历 children
    const child = children[i]
    const data = child.data  // 拿到每一个 child的data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      const name = data.slot  // 拿到插槽名称
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        // 以插槽名称为key值，将child添加到 slots中
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {  // 默认插槽
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
