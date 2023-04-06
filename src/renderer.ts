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
                            return ;
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
    const {
        createElement,
        setElementText,
        insert,
        setInnerHTML,
        patchProps,
        unmount
    } = domAPI;
    function render(vNode, container) {
        if (vNode) {
            // 创建与更新
            patch(container._vNode, vNode, container);
        } else {
            // 卸载
            if (container._vNode) {
                unmount(container._vNode)
            }
        }
        container._vNode = { ...vNode };
    }

    function patch(n1, n2, container) {
        if (typeof n2 === 'string') {
            setInnerHTML(container, n2);
            return;
        }

        // n1,n2类型不同，直接卸载n1
        if (n1 && n1.type !== n2.type) {
            unmount(n1);
            n1 = null;
        }

        // 取出n2
        const { type } = n2;
        if (typeof type === 'string') {
            if (!n1) {
                mountElement(n2, container);
            } else {
                patchElement(n1, n2);
            }
        } else if (typeof type === 'object') {
            //组件
        }
    }

    function mountElement(vNode, container) {
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
        insert(el, container);
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
        for(const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, null);
            }
        }

        // 更新props
        patchChildren(n1, n2, el);
    }

    function patchChildren(n1, n2, container) {
        if (typeof n2.children === 'string') {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            }
            setElementText(container, n2.children);
        } else if (Array.isArray(n2.children)) {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(vNode => unmount(vNode));
                n2.children.forEach(vNode => patch(null, vNode, container));
            } else {
                setElementText(container, '');
                n2.children.forEach(vNode => patch(null, vNode, container));
            }
        } else {
            if (typeof n1.children === 'string') {
                setElementText(container, '');
            } else if (Array.isArray(n1.children)) {
                n1.children.forEach(vNode => unmount(vNode));
            }
        }
    }

    return {
        render
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