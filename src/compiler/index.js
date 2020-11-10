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
  } // 这里return的结果是baseCompile的
})
// createCompiler方法实际上是调用 createCompilerCreator方法返回的
// ast 是树状结构，每一个节点都是 ast element，除了自身的一些属性，还维持了它的父子关系。


// 整个过程大概梳理一下：
// 1. compileToFunctions将 template模板编译成 render 和 staticRenderFns
// 2. compileToFunctions 是 createCompiler函数返回的，createCompiler函数返回两个值 compile 和 compileToFunctions
//      compileToFunctions是 调用createCompileToFunctionFn(compile)后的返回值
// 3. createCompiler是 createCompilerCreator的返回值，createCompilerCreator接收参数 baseCompile
// 4. createCompiler接收参数 baseOptions
// 5. 执行compile(template, options) 是核心编译过程
