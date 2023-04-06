/**
 * @jest-environment jsdom
 */
import { effect, ref, reactive } from '@vue/reactivity';
import { createRenderer, domAPI, normalizeClass } from '../src/renderer';
import $ from 'jquery';

test('1. 渲染与响应结合', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const count = ref(1);
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(`<h1>${count.value}</h1>`, $('#app')[0]);
    });
    expect($('#app').text()).toBe('1');
    count.value++;
    expect($('#app').text()).toBe('2');
});


test('2. 自定义渲染器', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'h1',
            children: 'hello'
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app').text()).toBe('hello');
    data.vNode = null;
    expect($('#app').text()).toBe('');
});


test('3. 挂载子节点和属性', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            props: {
                id: 'foo'
            },
            children: [
                {
                    type: 'p',
                    children: 'hello'
                }
            ]
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div id="foo"><p>hello</p></div>');
});


test('4. HTML Attributes vs DOM Properties', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            props: {
                id: 'foo'
            },
            children: [
                {
                    type: 'button',
                    props: {
                        disabled: ''
                    },
                    children: 'click'
                }
            ]
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div id="foo"><button disabled="">click</button></div>');
});

test('5. 处理Class(Style)', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            props: {
                class: normalizeClass([
                    'foo bar',
                    { baz: true }
                ])
            }
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div class=" foo bar baz"></div>');
});

test('6. 卸载vNode', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            children: 'xx'
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div>xx</div>');
    data.vNode = null;
    expect($('#app')[0].innerHTML).toBe('');
});

test('7. 区分vNode的类型', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            children: 'xx'
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div>xx</div>');
    data.vNode = null;
    expect($('#app')[0].innerHTML).toBe('');
});

test('8. 处理事件', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'button',
            props: {
                onClick: [
                    () => {
                        data.vNode.children = 'clicked';
                    },
                    () => {
                        data.vNode.type = 'radio';
                    }
                ]
            },
            children: 'click Me'
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<button>click Me</button>');
    $('button')[0].click();
    expect($('#app')[0].innerHTML).toBe('<radio>clicked</radio>');
});

test('9. 解决事件冒泡与响应式更新冲突问题', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const bol = ref(false);
    const data = reactive({
        vNode: {
            type: 'div',
            props: bol.value ? {
                onClick: () => {
                    data.vNode.children[1].children = 'qqq';
                },
                id: 'aa'
            } : {},
            children: [
                {
                    type: 'button',
                    props: {
                        onClick: () => {
                            bol.value = true;
                        }
                    },
                    children: 'click'
                },
                {
                    type: 'p',
                    children: 'xxx'
                }
            ]
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<div><button>click</button><p>xxx</p></div>');
    $('button')[0].click();
    expect($('#app')[0].innerHTML).toBe('<div><button>click</button><p>xxx</p></div>');
    // TODO 响应式更新仍有问题
    // $('#aa').click();
    // expect($('#app')[0].innerHTML).toBe('<div><button>click</button><p>qqq</p></div>');
});

test('10. 更新子节点', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'button',
            props: {
                onClick: [
                    () => {
                        data.vNode.type = 'div';
                    },
                    () => {
                        data.vNode.children = [{
                            type: 'p',
                            children: 'ppp'
                        }];
                    }
                ]
            },
            children: 'click Me'
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    expect($('#app')[0].innerHTML).toBe('<button>click Me</button>');
    $('button')[0].click();
    expect($('#app')[0].innerHTML).toBe('<div><p>ppp</p></div>');
// });

test('11. 减少DOM操作(前)', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const data = reactive({
        vNode: {
            type: 'div',
            children: [
                { type: 'p', children: '1' },
                { type: 'p', children: '2' },
                { type: 'p', children: '3' }
            ]
        }
    });
    const renderer = createRenderer(domAPI);

    effect(() => {
        renderer.render(data.vNode, $('#app')[0]);
    });

    data.vNode = {
        type: 'div',
        children: [
            { type: 'p', children: '4' },
            { type: 'p', children: '5' },
            { type: 'p', children: '6' }
        ]
    }
    expect(renderer.getCount()).toBe(6);
});