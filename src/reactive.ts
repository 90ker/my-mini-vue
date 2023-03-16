let activeEffect; // 将当前执行的effect注册全局effect，方便get里收集
const bucket = new Set();
export function reactive(data) {
    const obj = new Proxy(data, {
        get(target, key) {
            activeEffect && bucket.add(activeEffect);
            return target[key];
        },
        set(target, key, newVal) {
            target[key] = newVal;
            bucket.forEach(effect => effect());
            return true;
        }
    });
    return obj;
}
export function effect(fn) {
    activeEffect = fn;
    fn();
}