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
        count ++;
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