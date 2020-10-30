/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'
// 引入 createCompilerCreator， 接收参数baseCompile
// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile (
  // baseCompile在執行createCompilerCreator方法时作为参数传入
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  // 解析模板字符串生成AST
  if (options.optimize !== false) {
    optimize(ast, options)
    // 优化语法树
  }
  const code = generate(ast, options)
  // 生成代码
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
// ast 是树状结构，每一个节点都是 ast element，除了自身的一些属性，还维持了它的父子关系。
