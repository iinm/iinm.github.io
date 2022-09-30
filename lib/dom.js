/** @typedef {import("./dom.type").VirtualDomNode} VirtualDomNode */
/** @typedef {import("./dom.type").ElementNode} ElementNode */
/** @typedef {import("./dom.type").TextNode} TextNode */
/** @typedef {import("./dom.type").RawHTMLNode} RawHTMLNode */

/**
 * @param {VirtualDomNode[]} nodes
 * @param {HTMLElement} parent
 */
export const write = (nodes, parent) => {
  for (const node of nodes) {
    if (node.tag === "text*") {
      const textNode = /** @type {TextNode} */ (node);
      parent.append(textNode.text);
      continue;
    }
    if (node.tag === "html*") {
      const htmlNode = /** @type {RawHTMLNode} */ (node);
      parent.insertAdjacentHTML("beforeend", htmlNode.html);
      continue;
    }

    const vNode = /** @type {ElementNode} */ (node);
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
    parent.append(el);
  }
};
