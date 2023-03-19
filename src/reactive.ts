export function createReactive() {
    const effectStack = [];
    let activeEffect = null; // 将当前执行的effect注册全局effect，方便get里收集
    const bucket = new WeakMap();
    const ITERATOR_KEY = Symbol();

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
    function trigger(target, key, action = '') {
        let keyEffectMap = bucket.get(target);
        if (!keyEffectMap) {
            return;
        }
        let effects = [];
        if (keyEffectMap.has(key)) {
            effects = keyEffectMap.get(key)
        }
        let iteratorEffects = [];
        // 增删会顺便触发ITERATOR
        if ((action === 'ADD' || action === 'DELETE') && keyEffectMap.has(ITERATOR_KEY)) {
            iteratorEffects = keyEffectMap.get(ITERATOR_KEY);
        }

        let lengthEffects = []; // 其实这里是重复了，原本的key已经拿出来了effect
        if (action === 'ADD' && Array.isArray(target)) {
            lengthEffects = keyEffectMap.get('length');
        }
        
        // effectFn 执行的时候，会删除当前元素，然后重新添加，导致set遍历死循环
        // effects.forEach(effectFn => effectFn());
        // 解决方案是克隆一份出来遍历
        // 执行前过滤掉当前的activeEffect i++
        let newEffects = new Set([
            ...effects,
            ...iteratorEffects,
            ...lengthEffects
        ].filter(effect => effect !== activeEffect));
        newEffects.forEach(effectFn => {
            if (effectFn?.options?.scheduler) {
                effectFn?.options?.scheduler(effectFn);
            } else {
                effectFn()
            }
        });

    }
    function cleanUp(effectFn) {
        // effectFn从dep中把自己删除
        for (let i = 0; i < effectFn.deps.length; i++) {
            let dep = effectFn.deps[i];
            dep.delete(effectFn);
        }
        effectFn.deps.length = 0;
    }

    function reactive(data, isShallow = false, isReadonly = false) {
        const obj = new Proxy(data, {
            get(target, key, receiver) {
                if (key === 'saw') {
                    return target;
                }
                if (!isReadonly) { // 只读不需要收集依赖
                    track(target, key);
                }
                let res = Reflect.get(target, key, receiver);
                if (!isShallow && typeof res === 'object' && res !== null) {
                    // 在访问的那一刻，在get里将当前访问的对象变为reactive
                    return isReadonly ? readonly(res) : reactive(res, isShallow, isReadonly);
                } else {
                    return res;
                }
            },
            set(target, key, newVal, receiver) {
                if (isReadonly) {
                    return true;
                }
                let oldVal = target[key];
                let action;
                if (Array.isArray(target)) {
                    action = Number(key) >= target.length ? 'ADD' : 'SET';
                } else {
                    // 识别ADD action
                    action = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD';
                }
                let res = Reflect.set(target, key, newVal, receiver);

                if (receiver.saw === target) { // 不顺着原型链触发trigger
                    // 注意 NaN的情况
                    if (!Number.isNaN(oldVal) && !Number.isNaN(oldVal) && oldVal !== newVal) {
                        trigger(target, key, action);
                    }
                }
                return res;
            },
            has(target, key) {
                track(target, key);
                return Reflect.has(target, key);
            },
            ownKeys(target) {
                track(target, ITERATOR_KEY);
                return Reflect.ownKeys(target);
            },
            deleteProperty(target, key) {
                if (isReadonly) {
                    return true;
                }
                let isOwn = Object.prototype.hasOwnProperty.call(target, key);
                let isDel = Reflect.deleteProperty(target, key);
                if (isOwn && isDel) {
                    // 先触发key自身的trigger，再触发ITERATOR_KEY
                    trigger(target, key, 'DELETE');
                }
                return isDel;
            }
        });
        return obj;
    }
    function effect(fn, options = {}) {
        const effectFn = () => {
            // 执行前，清除
            cleanUp(effectFn);
            // activeEffect注册改为effectFn
            activeEffect = effectFn;
            effectStack.push(effectFn);
            let res = fn();
            effectStack.pop();
            // 每一个effect注册后需要清除，否则会导致互相影响
            activeEffect = effectStack[effectStack.length - 1];
            return res;
        }
        // 初始化时，增加deps属性
        effectFn.deps = [];
        effectFn.options = options;
        if (options?.lazy) {
            return effectFn;
        } else {
            effectFn();
        }
    }

    function computed(getter) {
        let dirty = true; //计算缓存
        let value = null;
        const effectFn = effect(getter, {
            lazy: true,
            scheduler() {
                if (!dirty) {
                    dirty = true;
                    trigger(obj, 'value');
                }
            }
        })
        let obj = {
            get value() {
                if (dirty) {
                    dirty = false;
                    value = effectFn();
                }
                track(obj, 'value')
                return value;
            }
        }
        return obj;
    }
    function watch(source, cb, options = {}) {
        let getter = null;
        let oldVal = null;
        let newVal = null;
        let clear = null;
        if (typeof source === 'function') {
            getter = source;
        } else {
            getter = () => traverse(source);
        }
        // 解决竞态问题
        function onInvalidate(fn) {
            clear = fn;
        }
        const effectFn = effect(getter, {
            lazy: true,
            scheduler() {
                // 控制effect执行
                if (options.flush === 'post') {
                    Promise.resolve().then(() => job());
                } else {
                    job();
                }
            }
        });

        let job = () => {
            if (clear) {
                // clear上一个凭证
                clear();
            }
            newVal = effectFn();
            cb(newVal, oldVal, onInvalidate);
            oldVal = newVal;
        }

        if (options.immediate) { // 创建则立即执行watch
            job();
        } else {
            oldVal = effectFn();
        }
    }
    // 遍历触发get
    function traverse(data, seen = new Set()) {
        if (typeof data !== 'object' || data === null || seen.has(data)) {
            return;
        }
        seen.add(data);
        for (let key in data) {
            traverse(data[key], seen);
        }
    }

    function shadowReactive(data) {
        return reactive(data, true);
    }
    function readonly(data) {
        return reactive(data, false, true);
    }
    function shadowReadonly(data) {
        return reactive(data, true, true);
    }
    return {
        reactive,
        shadowReactive,
        readonly,
        shadowReadonly,
        effect,
        computed,
        watch
    }
}