/**
 * @jest-environment jsdom
 */
import { effect, ref } from '@vue/reactivity';
import { renderer } from '../src/renderer';
import $ from 'jquery';

// const { effect, ref } = VueReactivity;
describe('renderer 1', () => {
    document.body.innerHTML = `
        <div id='app'></div>
    `
    const count = ref(1);

    effect(() => {
        renderer(`<h1>${count.value}</h1>`, $('#app')[0]);
    });

    test('渲染与响应结合', () => {
        expect($('#app').text()).toBe('1');
        count.value++;
        expect($('#app').text()).toBe('2');
    });
});