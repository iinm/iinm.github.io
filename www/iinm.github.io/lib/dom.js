/** @import { VirtualDomNode, ElementNode, TextNode, RawHTMLNode } from "./dom.type" */

/**
 * @param {string} tag
 * @param {{cls?: string, style?: any} & (Object<string,string> | {})} props - attributes with cls and style
 * @param {VirtualDomNode[]} children
 * @returns {VirtualDomNode}
 */
export const h = (tag, props, ...children) => {
  const { cls, style, ...attr } = props;
  return {
    tag,
    cls,
    style,
    attr,
    children,
  };
};

/**
 *
 * @param {string} text
 * @returns {TextNode}
 */
export const t = (text) => ({ tag: "text*", text });

/**
 * @param {VirtualDomNode[]} nodes
 * @param {HTMLElement} parent
 */
export const writeVirtualDom = (nodes, parent) => {
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
    if (vNode.cls) {
      el.className = vNode.cls;
    }
    if (vNode.attr) {
      for (const [key, value] of Object.entries(vNode.attr)) {
        el.setAttribute(key, value);
      }
    }
    if (vNode.style) {
      for (const [key, value] of Object.entries(vNode.style)) {
        // @ts-ignore
        el.style[key] = value;
      }
    }
    if (vNode.children) {
      writeVirtualDom(vNode.children, el);
    }
    parent.append(el);
  }
};
