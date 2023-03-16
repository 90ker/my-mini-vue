export function createReactive() {
    let activeEffect = null; // 将当前执行的effect注册全局effect，方便get里收集
    const bucket = new WeakMap();

    function track(target, key) {
        if (!activeEffect) {
            return;
        }
        let keyEffectMap = bucket.get(target);
        if (!keyEffectMap) {
            bucket.set(target, keyEffectMap = new Map());
        };
        let effects = keyEffectMap.get(key);
        if (!effects) {
            keyEffectMap.set(key, effects = new Set());
        };
        effects.add(activeEffect);
    }
    function trigger(target, key) {
        let keyEffectMap = bucket.get(target);
        if (!keyEffectMap) {
            return;
        }
        let effects = keyEffectMap.get(key);
        if (!effects) {
            return;
        }
        effects.forEach(effectFn => effectFn());
    }
    function reactive(data) {
        const obj = new Proxy(data, {
            get(target, key) {
                track(target, key);
                return target[key];
            },
            set(target, key, newVal) {
                target[key] = newVal;
                trigger(target, key);
                return true;
            }
        });
        return obj;
    }
    function effect(fn) {
        activeEffect = fn;
        fn();
        // 每一个effect注册后需要清除，否则会导致互相影响
        activeEffect = null;
    }
    return {
        reactive,
        effect
    }
}