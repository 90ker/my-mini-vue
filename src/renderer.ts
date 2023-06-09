function lis(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length
    for (i = 0; i < len; i++) {
        const arrI = arr[i]
        if (arrI !== -1) {
            j = result[result.length - 1]
            if (arr[j] < arrI) {
                p[i] = j
                result.push(i)
                continue
            }
            u = 0
            v = result.length - 1
            while (u < v) {
                c = ((u + v) / 2) | 0
                if (arr[result[c]] < arrI) {
                    u = c + 1
                } else {
                    v = c
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1]
                }
                result[u] = i
            }
        }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

export const domAPI = {
    createElement(tag) {
        return document.createElement(tag);
    },
    setElementText(el, text) {
        el.textContent = text;
    },
    setInnerHTML(el, domString) {
        el.innerHTML = domString;
    },
    insert(el, parent, anchor = null) {
        parent.insertBefore(el, anchor);
    },
    patchProps(el, key, value) {
        if (/^on/.test(key)) {
            const invokers = el._vei || (el._vei = {});
            let invoker = invokers[key];
            const name = key.slice(2).toLowerCase();
            if (value) {
                if (!invoker) {
                    // 真实的方法存到函数的value属性里
                    invoker = el._vei[key] = e => {
                        // 由冒泡触发的事件，timeStamp可能小于 attached
                        if (e.timeStamp < invoker.attached) {
                            return;
                        }
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach(fn => fn(e));
                        } else {
                            invoker.value(e);
                        }
                    }
                    invoker.attached = performance.now();
                    el.addEventListener(name, invoker);
                }
                invoker.value = value;
            } else {
                if (invoker) {
                    el.removeEventListener(name, invoker);
                }
            }
        } else if (key === 'class') {
            el.className = value || ''
        } else if (key in el) {
            const type = typeof el[key];
            if (type === 'boolean' && value === '') {
                el[key] = true;
            } else {
                el[key] = value;
            }
        } else {
            el.setAttribute(key, value);
        }
    },
    unmount(vNode) {
        const parent = vNode.el.parentNode;
        if (parent) {
            parent.removeChild(vNode.el);
        }
    }
}



export function createRenderer(domAPI) {
    let {
        createElement,
        setElementText,
        insert,
        setInnerHTML,
        patchProps,
        unmount
    } = domAPI;

    let count = 0;

    const insertCount = (...args) => {
        insert.apply(null, args);
        count++;
    }

    const unmountCount = (...args) => {
        unmount.apply(null, args);
        count++;
    }

    function render(vNode, container) {
        if (vNode) {
            // 创建与更新
            patch(container._vNode, vNode, container);
        } else {
            // 卸载
            if (container._vNode) {
                unmountCount(container._vNode)
            }
        }
        container._vNode = { ...vNode };
    }

    function patch(n1, n2, container, anchor = null) {
        if (typeof n2 === 'string') {
            setInnerHTML(container, n2);
            return;
        }

        // n1,n2类型不同，直接卸载n1
        if (n1 && n1.type !== n2.type) {
            unmountCount(n1);
            n1 = null;
        }

        // 取出n2
        const { type } = n2;
        if (typeof type === 'string') {
            if (!n1) {
                mountElement(n2, container, anchor);
            } else {
                patchElement(n1, n2);
            }
        } else if (typeof type === 'object') {
            //组件
        }
    }

    function mountElement(vNode, container, anchor) {
        const el = vNode.el = createElement(vNode.type);
        if (typeof vNode.children === 'string') {
            setElementText(el, vNode.children);
        } else if (Array.isArray(vNode.children)) {
            vNode.children.forEach(child => {
                patch(null, child, el);
            })
        }
        if (vNode.props) {
            for (const key in vNode.props) {
                patchProps(el, key, vNode.props[key]);
            }
        }
        insertCount(el, container, anchor);
    }

    function patchElement(n1, n2) {
        const el = n2.el = n1.el;
        // 更新props
        const oldProps = n1.props;
        const newProps = n2.props;
        for (const key in newProps) {
            if (oldProps[key] !== newProps[key]) {
                patchProps(el, key, newProps[key]);
            }
        }
        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, null);
            }
        }

        // 更新children
        patchChildren(n1, n2, el);
    }

    function patchChildren(n1, n2, container) {
        if (typeof n2.children === 'string') {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmountCount(c));
            }
            setElementText(container, n2.children);
        } else if (Array.isArray(n2.children)) {
            if (Array.isArray(n1.children)) {
                const oldChildren = n1.children;
                const newChildren = n2.children;
                if (oldChildren.some(child => child.key)) {
                    // 简单DIff
                    if (false) {
                        let lastIndex = 0;
                        for (let i = 0; i < newChildren.length; i++) {
                            const newVnode = newChildren[i];
                            let find = false;
                            for (let j = 0; j < oldChildren.length; j++) {
                                const oldVnode = oldChildren[j];
                                if (!newVnode.key) {
                                    patch(oldVnode, newVnode, container);
                                } else if (newVnode.key === oldVnode.key) {
                                    find = true;
                                    patch(oldVnode, newVnode, container);
                                    if (j < lastIndex) {
                                        // 移动DOM
                                        const prevNode = newChildren[i - 1];
                                        if (prevNode) {
                                            const anchor = prevNode.el.nextSibling;
                                            // insert可以用于把A点的DOM节点移动到B点
                                            insertCount(newVnode.el, container, anchor);
                                        }
                                    } else {
                                        lastIndex = j;
                                    }
                                    break;
                                }
                            }
                            if (!find) {
                                const prevNode = newChildren[i - 1];
                                let anchor = null;
                                if (prevNode) {
                                    anchor = prevNode.el.nextSibling;
                                } else {
                                    anchor = container.firstChild;
                                }
                                patch(null, newVnode, container, anchor);
                            }
                        }
                        for (let i = 0; i < oldChildren.length; i++) {
                            const oldNode = oldChildren[i];
                            const has = newChildren.find(vNode => vNode.key === oldNode.key);
                            if (!has) {
                                unmountCount(oldNode);
                            }
                        }
                    } else {
                        // 双端DIff
                        patchKeyedChildren(n1, n2, container);
                    }
                } else {
                    const oldLen = oldChildren.length;
                    const newLen = newChildren.length;
                    const commonLength = Math.min(oldLen, newLen);
                    for (let i = 0; i < commonLength; i++) {
                        patch(oldChildren[i], newChildren[i], container);
                    }
                    if (newLen > oldLen) {
                        for (let i = commonLength; i < newLen; i++) {
                            patch(null, newChildren[i], container);
                        }
                    } else if (newLen < oldLen) {
                        for (let i = commonLength; i < oldLen; i++) {
                            unmountCount(oldChildren[i]);
                        }
                    }
                }
            } else {
                setElementText(container, '');
                n2.children.forEach(vNode => patch(null, vNode, container));
            }
        } else {
            if (typeof n1.children === 'string') {
                setElementText(container, '');
            } else if (Array.isArray(n1.children)) {
                n1.children.forEach(vNode => unmountCount(vNode));
            }
        }
    }

    function patchKeyedChildren(n1, n2, container) {
        // 双端Diff
        if (false) {
            const oldChildren = n1.children;
            const newChildren = n2.children;

            let oldStartIdx = 0;
            let oldEndIdx = oldChildren.length - 1;
            let newStartIdx = 0;
            let newEndIdx = newChildren.length - 1;

            let oldStartVnode = oldChildren[oldStartIdx];
            let oldEndVnode = oldChildren[oldEndIdx];
            let newStartVnode = newChildren[newStartIdx];
            let newEndVnode = newChildren[newEndIdx];
            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (!oldStartVnode) {
                    oldStartVnode = oldChildren[++oldStartIdx];
                } else if (!oldEndVnode) {
                    oldEndVnode = oldChildren[--oldEndIdx];
                } else if (oldStartVnode.key === newStartVnode.key) {
                    patch(oldStartVnode, newStartVnode, container);
                    oldStartVnode = oldChildren[++oldStartIdx];
                    newStartVnode = newChildren[++newStartIdx];
                } else if (oldEndVnode.key === newEndVnode.key) {
                    patch(oldEndVnode, newEndVnode, container);
                    oldEndVnode = oldChildren[--oldEndIdx];
                    newEndVnode = newChildren[--newEndIdx];
                } else if (oldStartVnode.key === newEndVnode.key) {
                    patch(oldStartVnode, newEndVnode, container);
                    insertCount(oldStartVnode.el, container, oldEndVnode.el.nextSibling);
                    oldStartVnode = oldChildren[++oldStartIdx];
                    newEndVnode = newChildren[--newEndIdx];
                } else if (oldEndVnode.key === newStartVnode.key) {
                    patch(oldEndVnode, newStartVnode, container);
                    insertCount(oldEndVnode.el, container, oldStartVnode.el);
                    oldEndVnode = oldChildren[--oldEndIdx];
                    newStartVnode = newChildren[++newStartIdx];
                } else {
                    const idxInOld = oldChildren.findIndex(node => node.key === newStartVnode.key);
                    if (idxInOld > 0) {
                        const vnodeToMove = oldChildren[idxInOld];
                        patch(vnodeToMove, newStartVnode, container);
                        insertCount(vnodeToMove.el, container, oldStartVnode.el);
                        oldChildren[idxInOld] = undefined;
                    } else {
                        patch(null, newStartVnode, container, oldStartVnode.el);
                    }
                    newStartVnode = newChildren[++newStartIdx];
                }
            }
            if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
                for (let i = newStartIdx; i <= newEndIdx; i++) {
                    patch(null, newChildren[i], container, oldStartVnode.el);
                }
            } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
                for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                    unmountCount(oldChildren[i]);
                }
            }
        } else {
            // 快速Diff
            const newChildren = n2.children;
            const oldChildren = n1.children;
            let j = 0;
            let oldNode = oldChildren[j];
            let newNode = newChildren[j];
            // 前缀遍历
            while (oldNode.key === newNode.key) {
                patch(oldNode, newNode, container);
                j++;
                oldNode = oldChildren[j];
                newNode = newChildren[j];
            }
            let oldEnd = oldChildren.length - 1;
            let newEnd = newChildren.length - 1;
            oldNode = oldChildren[oldEnd];
            newNode = newChildren[newEnd];
            // 后缀遍历
            while (oldEnd >= 0 && newEnd >= 0 && oldNode.key === newNode.key) {
                patch(oldNode, newNode, container);
                oldEnd--;
                newEnd--;
                oldNode = oldChildren[oldEnd];
                newNode = newChildren[newEnd];
            }
            // 新增元素
            if (j > oldEnd && j <= newEnd) {
                const anchorIndex = newEnd + 1;
                const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
                while (j <= newEnd) {
                    patch(null, newChildren[j++], container, anchor);
                }
            } else if (j > newEnd && j <= oldEnd) {
                while (j <= oldEnd) {
                    unmountCount(oldChildren[j++]);
                }
            } else {
                const count = newEnd - j + 1;
                const source = new Array(count).fill(-1);
                const oldStart = j;
                const newStart = j;
                let moved = false;
                let pos = 0;
                const keyIndex = {};
                for (let i = newStart; i <= newEnd; i++) {
                    keyIndex[newChildren[i].key] = i;
                }
                let patched = 0;
                for (let i = oldStart; i <= oldEnd; i++) {
                    oldNode = oldChildren[i];
                    if (patched <= count) {
                        const k = keyIndex[oldNode.key];
                        if (typeof k !== 'undefined') {
                            newNode = newChildren[k];
                            patch(oldNode, newNode, container);
                            patched++;
                            source[k - newStart] = i;
                            if (k < pos) {
                                moved = true;
                            } else {
                                pos = k;
                            }
                        } else {
                            unmountCount(oldNode);
                        }
                    } else {
                        unmountCount(oldNode);
                    }
                }
                if (moved) {
                    const seq = lis(source);
                    let s = seq.length - 1;
                    let i = count - 1;
                    for (i; i >= 0; i--) {
                        const pos = i + newStart;
                        const newNode = newChildren[pos];
                        const nextPos = pos + 1;
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        // 旧节点上没有，则为新增
                        if (source[i] === -1) {
                            patch(null, newNode, container, anchor);
                        } else if (i !== seq[s]) {
                            // index 不在最长子序列中， 则需要移动
                            insertCount(newNode.el, container, anchor);
                        } else {
                            /**
                             * 节约时间的关键，就是找出尽可能多的不需要移动的DOM
                             */
                            s--;
                        }
                    }
                }
            }
        }
    }

    function getCount() {
        return count;
    }

    return {
        render,
        getCount
    }
}

export function normalizeClass(arr) {
    if (Array.isArray(arr)) {
        let str = '';
        for (let item of arr) {
            if (typeof item === 'string') {
                str += ' ' + item;
            } else if (typeof item === 'object') {
                for (const key in item) {
                    if (item[key] === true) {
                        str += ' ' + key;
                    }
                }
            }
        }
        return str;
    }
}