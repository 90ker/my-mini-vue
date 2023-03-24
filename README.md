
# 按模块分
## 响应式
### 基本原理
- [x] 用proxy构建响应式
- [x] 调整property与effect之间的对应关系为多对多
  - 将reactive改造为工厂模式，方便测试
- [x] 在运行时，由于进入不同逻辑分支，导致部分effect副作用会过期，需要清除
  - 清除逻辑是在每一个effect执行时，删除原本的**property deps**，然后重新设置
  - 这个过程中，需要新建set来执行遍历，才不会死循环
- [x] 当嵌套effect的时候，形如递归，需要将activeEffect修改为栈结构来适配
- [x] 在effect内自增，会触发set和get，导致无限循环，需要过滤当前effect的执行
- [x] 新增调度能力，控制effect执行
- [x] 利用调度能力，完成compute功能
  - 主要利用lazy执行，这里逻辑比较乱，需要看源码
- [x] 利用调度能力，完成watch功能
### 非原始值的响应式
- [x] 普通对象
  - [x] 由于this指向的问题，统一替换成Reflect
  - [x] 拦截 in 操作，属于track操作，按key注册
  - [x] 拦截 for...in 操作，属于track操作，按ITERATOR_KEY symbol注册
    - 新增属性会重新触发执行
    - 修改属性不会触发
  - [x] 拦截 delete 操作，属于trigger操作，触发自身track，顺便触发for...in 
  - [x] 合理触发trigger
    - 新值与原值相等的情况
    - 从父对象继承属性的情况
  - [x] 浅响应和深响应
    - 不是一开始就遍历整个对象，而是在访问的那一刻，在get里将当前访问的对象变为reactive
  - [x] 浅readonly和深readonly
    - 与上同理
- [x] 数组
  - [x] 索引影响length
  - [x] length影响索引,index over length
  - [x] 拦截for...in操作，属于track，length改变会触发响应
  - [x] 拦截for...of操作，和for...in 基本一致，内部调用iterator，会自动遍历每个元素，因此也会和单个索引触发
  - [x] 代理数组的拦截方法 includes｜indexOf｜lastIndexOf，以修复缺陷
    - 通过映射map，复用之前的reactive对象
    - 通过重写以上方法，使得能同时查询origin对象和proxy对象（这里有些不太理解）
  - [x] 代理隐式修改数组length的方法 push｜pop｜shift｜unshift｜splice
    - 设置flag，让这些方法不再追踪length的变更
- [ ] Set、Map
  - [x] 首先让proxy能代理上Set、Map的方法
### 原始值的响应式
## 渲染器
## 组件化
## 编译器