export function createReactive() {
    const effectStack = [];
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
        // 给当前effectFn对象，存储上对应的property数组
        activeEffect.deps.push(effects);
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
        // effectFn 执行的时候，会删除当前元素，然后重新添加，导致set遍历死循环
        // effects.forEach(effectFn => effectFn());
        
        // 解决方案是克隆一份出来遍历
        // 执行前过滤掉当前的activeEffect i++
        let newEffects = new Set([...effects].filter(effect => effect !== activeEffect));
        newEffects.forEach(effectFn => effectFn());

    }
    function cleanUp(effectFn) {
        // effectFn从dep中把自己删除
        for (let i = 0; i < effectFn.deps.length; i ++) {
            let dep = effectFn.deps[i];
            dep.delete(effectFn);
        }
        effectFn.deps.length = 0;
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
        const effectFn = () => {
            // 执行前，清除
            cleanUp(effectFn);
            // activeEffect注册改为effectFn
            activeEffect = effectFn;
            effectStack.push(effectFn);
            fn();
            effectStack.pop();
            // 每一个effect注册后需要清除，否则会导致互相影响
            activeEffect = effectStack[effectStack.length - 1];
        }
        // 初始化时，增加deps属性
        effectFn.deps = [];
        effectFn();
    }
    return {
        reactive,
        effect
    }
}