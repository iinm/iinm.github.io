/** @typedef {import("./dom.type").VirtualDomNode} VirtualDomNode */
/** @typedef {import("./dom.type").VirtualElementNode} VirtualElementNode */
/** @typedef {import("./dom.type").VirtualTextNode} VirtualTextNode */
/** @typedef {import("./dom.type").RawHTMLNode} RawHTMLNode */

/**
 * @param {VirtualDomNode[]} nodes
 * @param {HTMLElement} parentEl
 */
export const write = (nodes, parentEl) => {
  for (const node of nodes) {
    if (node.tag === "*text") {
      const textNode = /** @type {VirtualTextNode} */ (node);
      parentEl.append(textNode.text);
      continue;
    }
    if (node.tag === "*html") {
      const htmlNode = /** @type {RawHTMLNode} */ (node);
      parentEl.insertAdjacentHTML("beforeend", htmlNode.html);
      continue;
    }

    const vNode = /** @type {VirtualElementNode} */ (node);
    /** @type {HTMLElement} */
    const el = document.createElement(vNode.tag);
    if (vNode.className) {
      el.className = vNode.className;
    }
    if (vNode.attr) {
      for (const [key, value] of Object.entries(vNode.attr)) {
        el.setAttribute(key, value);
      }
    }
    if (vNode.style) {
      for (const [key, value] of Object.entries(vNode.style)) {
        el.style[key] = value;
      }
    }
    if (vNode.children) {
      write(vNode.children, el);
    }
    parentEl.append(el);
  }
};
