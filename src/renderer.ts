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
        if (key === 'class') {
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
        container._vNode = vNode;
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
                // 暂时一样
                patchElement(n1, n2, container);
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

    function patchElement(n1, n2, container) {
        mountElement(n2, container);
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