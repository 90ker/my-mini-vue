
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
- [ ] 普通对象
  - [x] 由于this指向的问题，统一替换成Reflect
## 渲染器
## 组件化
## 编译器