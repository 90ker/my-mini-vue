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
            count++;
        }
    })
    test('测试 in 操作的代理', async () => {
        expect(count).toBe(1);
        obj.foo++;

        expect(count).toBe(2);
    });
})

describe('reactive 测试11', () => {
    const { reactive, effect } = createReactive();
    const data = { foo: 1, bar: 10 };
    const obj = reactive(data);
    let count = 0;

    effect(() => {
        for (let key in obj) {
            count++;
        }
    })
    test('测试 for...in 操作的代理', async () => {
        expect(count).toBe(2);
        obj.foo = 2;

        expect(count).toBe(2);

        obj.baz = 100;
        expect(count).toBe(5);
    });
})

describe('reactive 测试12', () => {
    const { reactive, effect } = createReactive();
    const data = { foo: 1, bar: 10 };
    const obj = reactive(data);
    let count = 0;

    effect(() => {
        for (let key in obj) {
            count++;
        }
    })
    test('测试 delete 操作的代理', async () => {
        expect(count).toBe(2);

        delete obj.bar;
        expect(count).toBe(3);
    });
})

describe('reactive 测试13', () => {
    const { reactive, effect } = createReactive();
    const data = { foo: 1 };
    const obj = reactive(data);
    let count = 0;

    effect(() => {
        count++;
        obj.foo;
    })
    test('屏蔽新旧值相等情况的trigger', async () => {
        expect(count).toBe(1);

        obj.foo = 1;
        expect(count).toBe(1);
    });
})

describe('reactive 测试14', () => {
    const { reactive, effect } = createReactive();
    const parent = reactive({ foo: 1 });
    const child = reactive({});
    Object.setPrototypeOf(child, parent);
    let count = 0;

    effect(() => {
        count++;
        child.foo;
    })
    test('从proxy父对象继承属性，不触发父对象的set', async () => {
        expect(count).toBe(1);

        child.foo = 2;
        expect(count).toBe(2);
    });
})

describe('reactive 测试15', () => {
    const { reactive, shadowReactive, effect } = createReactive();
    const data = { foo: { bar: 1 } };
    const obj = reactive(data);
    const data2 = { foo: { bar: 3 } };
    const obj2 = shadowReactive(data2);

    let count = 0;
    let count2 = 0;

    effect(() => {
        count++;
        obj.foo.bar;
    })
    effect(() => {
        count2++;
        obj2.foo.bar;
    })
    test('浅响应与深响应', async () => {
        expect(count).toBe(1);
        expect(count2).toBe(1);

        obj.foo.bar = 2;
        expect(count).toBe(2);

        obj2.foo.bar = 4;
        expect(count2).toBe(1);
    });
})

describe('reactive 测试16', () => {
    const { readonly, shadowReadonly, effect } = createReactive();
    const data = { foo: { bar: 1 } };
    const obj = readonly(data);
    const data2 = { foo: { bar: 3 } };
    const obj2 = shadowReadonly(data2);

    let count = 0;
    let count2 = 0;

    effect(() => {
        count++;
        obj.foo.bar;
    })
    effect(() => {
        count2++;
        obj2.foo;
    })
    test('浅只读与深只读', async () => {
        expect(count).toBe(1);
        expect(count2).toBe(1);

        obj.foo.bar = 2;
        expect(count).toBe(1);

        obj2.foo = 2;
        expect(count2).toBe(1);

        // 浅只读不完善，没有了响应式
        // obj2.foo.bar = 4;
        // expect(count2).toBe(2);
    });
})

describe('reactive 测试17', () => {
    const { reactive, effect } = createReactive();
    const data = ['foo'];
    const obj = reactive(data);

    let count = 0;
    let lengthCount = 0;

    effect(() => {
        count++;
        obj[0];
    })

    effect(() => {
        lengthCount++;
        obj.length;
    })
    test('索引影响length', async () => {
        expect(count).toBe(1);
        expect(lengthCount).toBe(1);

        obj[0] = 'bar'; // 修改已有
        expect(count).toBe(2);
        expect(lengthCount).toBe(1);

        obj[1] = 'xxx'; // 新增元素
        expect(count).toBe(2);
        expect(lengthCount).toBe(2);

    });
});

describe('reactive 测试18', () => {
    const { reactive, effect } = createReactive();
    const data = ['foo', 'bar'];
    const obj = reactive(data);

    let count = 0;
    let lengthCount = 0;

    effect(() => {
        count++;
        obj[1];
    })

    effect(() => {
        lengthCount++;
        obj.length;
    })
    test('length影响索引', async () => {
        expect(count).toBe(1);
        expect(lengthCount).toBe(1);

        obj.length = 1; // overLength
        expect(count).toBe(2);
        expect(lengthCount).toBe(2);

    });
});

describe('reactive 测试19', () => {
    const { reactive, effect } = createReactive();
    const data = ['foo', 'bar'];
    const obj = reactive(data);

    let count = 0;

    effect(() => {
        for (let key in obj) {
            count++;
        }
    })

    test('for...in 操作', async () => {
        expect(count).toBe(2);

        obj.length = 1; // 新增元素
        expect(count).toBe(3);

        obj[1] = 'baz'; // 新增元素
        expect(count).toBe(5);
    });
});

describe('reactive 测试20', () => {
    const { reactive, effect } = createReactive();
    const data = ['foo', 'bar'];
    const obj = reactive(data);

    let count = 0;

    effect(() => {
        for (let item of obj) {
            count++;
        }
    })

    test('for...of 操作', async () => {
        expect(count).toBe(2);

        obj.length = 1; // 新增元素
        expect(count).toBe(3);

        obj[1] = 'baz'; // 新增元素
        expect(count).toBe(5);

        obj[0] = 'fooo'; // 修改元素
        expect(count).toBe(7);
    });
});

describe('reactive 测试21', () => {
    const { reactive, effect } = createReactive();
    const arr = reactive(['foo', 'bar']);

    let countIncludes = 0;
    let countIndexOf = 0;
    let countLastIndexOf = 0;

    effect(() => {
        arr.includes('foo');
        countIncludes++;
    })

    effect(() => {
        arr.indexOf('foo');
        countIndexOf++;
    })
    effect(() => {
        arr.lastIndexOf('foo');
        countLastIndexOf++;
    })


    const obj2 = {};
    const arr2 = reactive([obj2]);

    test('代理查找方法： includes、indexOf、lastIndexOf', async () => {
        expect(countIncludes).toBe(1);
        expect(countIndexOf).toBe(1);
        expect(countLastIndexOf).toBe(1);

        arr[0] = {};
        expect(countIncludes).toBe(2);
        expect(countIndexOf).toBe(2);
        expect(countLastIndexOf).toBe(2);

        // 对象每次通过get访问，都会重新生成Reactive对象
        expect(arr.includes(arr[0])).toBe(true);

        // 检测是否查询origin
        expect(arr2.includes(obj2)).toBe(true);
    });


});

describe('reactive 测试22', () => {
    const { reactive, effect } = createReactive();
    const arr = reactive([]);

    effect(() => {
        arr.push(1);
    });

    effect(() => {
        arr.push(2);
    })

    effect(() => {
        arr.pop();
    })

    effect(() => {
        arr.unshift(2);
    })

    effect(() => {
        arr.shift();
    })

    effect(() => {
        arr.splice(0, 0, 10);
    })

    test('代理修改数组length的方法', () => {
        expect(arr.includes(1)).toBe(true);
        expect(arr.includes(10)).toBe(true);
    })
})

describe('reactive 测试23', () => {
    const { reactive, effect } = createReactive();
    const map = reactive(new Map([['key', 1]]));
    let count = 0;

    effect(() => {
        count++;
        map.get('key');
        map.delete('key');
    })
})

describe('reactive 测试24', () => {
    const { reactive, effect } = createReactive();
    const set = reactive(new Set([1]));
    let count = 0;

    effect(() => {
        count++;
        set.size;
    })

    test('代理Set的add、delete方法', () => {
        expect(count).toBe(1);

        set.add(2);
        expect(count).toBe(2);

        set.delete(2);
        expect(count).toBe(3);
    })
})

describe('reactive 测试25', () => {
    const { reactive, effect } = createReactive();
    const m = new Map();
    const p1 = reactive(m);
    const p2 = reactive(new Map());
    let count = 0;

    p1.set('p2', p2);
    effect(() => {
        count++;
        console.log(m.get('p2').size);
    });

    test('使原始数据只存储原始对象，防止数据污染', () => {
        expect(count).toBe(1);

        m.get('p2').set('foo', 1);
        expect(count).toBe(1);
    })
})

describe('reactive 测试26', () => {
    const { reactive, effect } = createReactive();
    const p = reactive(new Map([['k', 'v']]))
    let count = 0;

    effect(() => {
        p.forEach((val, key) => {
            count++;
        })
    });

    test('代理forEach', () => {
        expect(count).toBe(1);

        p.set('k2', 'v2');
        expect(count).toBe(3);
    })

    test('Map结构的action为SET的时候，也需要触发effect', () => {
        expect(count).toBe(3);

        p.set('k', 'v3');
        expect(count).toBe(5);
    })

    const p2 = reactive(new Map([['kkk', new Set([1, 2, 3])]]));
    let count2 = 0;

    effect(() => {
        p2.forEach((val, k) => {
            val.size;
            count2++;   
        })
    })

    test('修复fo rEach内部是原始数据而非proxy数据的缺陷', () => {
        expect(count2).toBe(1);

        p2.get('kkk').delete(1);
        expect(count2).toBe(2);
    });
})
 
describe('reactive 测试27', () => {
    const { reactive, effect } = createReactive();
    const p = reactive(new Map([
        ['key1', 'value1'],
        ['key2', 'value2']
    ]));
    let count = 0;
    let count2 = 0;
    let count3 = 0;

    effect(() => {
        for (const [key, value] of p) {
            count ++;
        }
    });

    effect(() => {
        for (const value of p.values()) {
            count2 ++;
        }
    });

    effect(() => {
        for (const key of p.keys()) {
            count3 ++;
        }
    });

    test('代理for...of', () => {
        expect(count).toBe(2);
        expect(count2).toBe(2);
        expect(count2).toBe(2);
        
        p.set('key3', 'value3');
        expect(count).toBe(5);
        expect(count2).toBe(5);
        expect(count3).toBe(5);

        p.set('key3', 'value6');
        expect(count).toBe(8);
        expect(count2).toBe(8);
        expect(count3).toBe(5);
    });

})

describe('reactive 测试28', () => {
    const { ref, effect } = createReactive();
    const p = ref(1);
    let count = 0;

    effect(() => {
        count ++;
        p.value;
    })

    test('使用ref包裹原始值', () => {
        expect(count).toBe(1);

        p.value += 1;
        expect(count).toBe(2);
        expect(p.__v_isRef).toBe(true);
    });
})

describe('reactive 测试29', () => {
    const { reactive, toRefs, effect } = createReactive();
    const obj = reactive({ foo: 1, bar: 2 });
    const newObj = { ...toRefs(obj) }
    let count = 0;

    effect(() => {
        newObj.foo.value;
        count ++;
    })

    test('处理响应丢失问题', () => {
        expect(count).toBe(1);

        obj.foo = 100;
        expect(count).toBe(2);
        newObj.bar.value = 200;
        expect(newObj.bar.value).toBe(200);
    });
})

describe('reactive 测试30', () => {
    const { reactive, toRefs, proxyRefs, effect } = createReactive();
    const obj = reactive({ foo: 1, bar: 2 });
    const newObj = proxyRefs({ ...toRefs(obj) });
    let count = 0;

    effect(() => {
        newObj.foo;
        count ++;
    })

    test('自动脱ref', () => {
        expect(count).toBe(1);

        obj.foo = 100;
        expect(count).toBe(2);
        newObj.bar = 200;
        expect(newObj.bar).toBe(200);
    });
})
