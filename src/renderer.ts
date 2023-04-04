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
    }
}



export function createRenderer(domAPI) {
    const {
        createElement,
        setElementText,
        insert,
        setInnerHTML
    } = domAPI;
    function render(vNode, container) {
        if (vNode) {
            // 创建与更新
            patch(container._vNode, vNode, container);
        } else {
            // 卸载
            if (container._vNode) {
                container.innerHTML = '';
            }
        }
        container._vNode = vNode;
    }

    function patch(n1, n2, container) {
        if (!n1) {
            mountElement(n2, container);
        } else {
            // 暂时一样
            mountElement(n2, container);
        }
    }

    function mountElement(vNode, container) {
        if (typeof vNode === 'string') {
            setInnerHTML(container, vNode);
        }
        const el = createElement(vNode.type);
        if (typeof vNode.children === 'string') {
            setElementText(el, vNode.children);
        }
        insert(el, container);
    }

    return {
        render
    }
}