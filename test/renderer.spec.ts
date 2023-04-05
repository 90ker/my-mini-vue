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