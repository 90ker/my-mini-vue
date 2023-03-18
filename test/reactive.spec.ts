import { createReactive } from "../src/reactive";

describe('reactive 测试', () => {
    const { reactive, effect } = createReactive();
    const data = { text: 'hello world' };
    const obj = reactive(data);
    let res;
    effect(() => {
        res = obj.text;
    })

    test('初始化时，effect会被执行一次', () => {
        expect(res).toBe('hello world');
    });

    test('修改属性，effect触发响应', () => {
        obj.text = 'the vue'
        expect(res).toBe('the vue');
    });
})

describe('reactive 测试2', () => {
    const { reactive, effect } = createReactive();
    const data = { num: 1 };
    const data2 = { num: 1 };
    const obj = reactive(data);
    const obj2 = reactive(data2);
    let count = 0;
    let count2 = 0;

    effect(() => {
        count++;
        obj.num;
    });

    effect(() => {
        count2++;
        obj2.num;
    });

    test(`为避免property之间互相影响
        1.将bucket改为weakMap -> Map -> Set结构
        2.activeEffect完成注册后清除
    `, () => {
        expect(count).toBe(1);
        expect(count2).toBe(1);
        obj.num = 3;
        expect(count).toBe(2);
        expect(count2).toBe(1);

        obj.notExist = 3;
        expect(count).toBe(2);
        expect(count2).toBe(1);

        obj2.num = 3;
        expect(count).toBe(2);
        expect(count2).toBe(2);
    });
})

describe('reactive 测试3', () => {
    const { reactive, effect } = createReactive();
    const data = { text: 'xxx', show: true };
    const obj = reactive(data);
    let res;
    let count = 0;
    effect(() => {
        count++;
        res = obj.show ? obj.text : '';
    });
    test('切换逻辑分支后，清除无用响应', () => {
        expect(res).toBe('xxx');
        expect(count).toBe(1);

        obj.text = 'xx';
        expect(res).toBe('xx');
        expect(count).toBe(2);

        obj.show = false;
        expect(res).toBe('');
        expect(count).toBe(3);

        obj.text = 'again';
        expect(res).toBe('');
        expect(count).toBe(3);
    });
})

describe('reactive 测试4', () => {
    const { reactive, effect } = createReactive();
    const data = { num: 1 };
    const data2 = { num2: 1 };
    const obj = reactive(data);
    const obj2 = reactive(data2);
    let count = 0;
    let count2 = 0;

    effect(() => {
        count++;
        effect(() => {
            count2++;
            obj2.num2;
        })
        obj.num;
    });

    test('effect嵌套时，适配对应activeEffect，但是未修复重复添加effect的问题', () => {
        expect(count).toBe(1);
        expect(count2).toBe(1);

        obj.num = 3;
        expect(count).toBe(2);
        expect(count2).toBe(2);

        // obj2.num2 = 2;
        // expect(count).toBe(2);
        // expect(count2).toBe(3);
    });
})

describe('reactive 测试5', () => {
    const { reactive, effect } = createReactive();
    const data = { num: 1 };
    const obj = reactive(data);
    let count = 0;
    effect(() => {
        count++;
        obj.num++;
    });

    test('在effect内自增，会触发set和get，导致无限循环，需要过滤当前effect的执行', () => {
        expect(count).toBe(1);

        obj.num = 10;
        expect(count).toBe(2);
    });
})

describe('reactive 测试6', () => {
    const { reactive, effect } = createReactive();
    const data = { num: 1 };
    const obj = reactive(data);
    let count = 0;
    effect(() => {
        count++;
        obj.num;
    }, {
        scheduler(fn) {
            // 这里编写一个异步执行
            setTimeout(fn, 300);
        }
    });

    test('新增调度器，控制effect执行', async () => {
        expect(count).toBe(1);

        obj.num = 10;
        expect(count).toBe(1);
        expect(new Promise(res => {
            setTimeout(() => res(count), 400);
        })).resolves.toBe(2);
    });
})

describe('reactive 测试7', () => {
    const { reactive, computed } = createReactive();
    const data = { num1: 1, num2: 2 };
    const obj = reactive(data);
    let sum = computed(() => obj.num1 + obj.num2);

    test('测试compute', async () => {
        expect(sum.value).toBe(3);

        obj.num1 = 2;
        expect(sum.value).toBe(4);

        obj.num2 = 3;
        expect(sum.value).toBe(5);
    });
})

describe('reactive 测试8', () => {
    const { reactive, watch } = createReactive();
    const data = { num1: 1, num2: 2 };
    const obj = reactive(data);
    let count = 0;
    let newV = null;
    let oldV = data.num2;

    watch(() => obj.num2, async (newVal, oldVal, onInvalidate) => {
        let expired = false; // 过期凭证
        onInvalidate(() => {
            expired = true;
        });
        await new Promise(res => {
            setTimeout(() => {
                res(1);
            }, 1000);
        });
        if (!expired) {
            count++;
            newV = newVal;
            oldV = oldVal;
        }
    }, { immediate: true, flush: 'post' });

    test('测试watch', async () => {
        expect(oldV).toBe(2);
        expect(newV).toBe(null);
        expect(count).toBe(0);

        obj.num2 = 3;
        obj.num2 = 4;
        obj.num2 = 5;
        expect(oldV).toBe(2);
        expect(newV).toBe(null);
        expect(count).toBe(0);

        // 这里有缺陷
        // expect(new Promise(res => {
        //     setTimeout(() => res(oldV), 2000);
        // })).resolves.toBe(3);
        expect(new Promise(res => {
            setTimeout(() => res(newV), 2000);
        })).resolves.toBe(5);
        expect(new Promise(res => {
            setTimeout(() => res(count), 2000);
        })).resolves.toBe(1);
    });
})

describe('reactive 测试9', () => {
    const { reactive, effect } = createReactive();
    const data = {
        foo: 1,
        get bar() {
            return this.foo;
        }
    };
    const obj = reactive(data);
    let count = 0;

    effect(() => {
        count++;
        obj.bar;
    })
    test('测试Reflect对this的修改', async () => {
        expect(count).toBe(1);
        obj.foo++;

        expect(count).toBe(2);
    });
})

describe('reactive 测试10', () => {
    const { reactive, effect } = createReactive();
    const data = {
        foo: 1
    };
    const obj = reactive(data);
    let count = 0;

    effect(() => {
        if ('foo' in obj) {
            count ++;
        }
    })
    test('测试 in 操作的代理', async () => {
        expect(count).toBe(1);
        obj.foo++;

        expect(count).toBe(2);
    });
})