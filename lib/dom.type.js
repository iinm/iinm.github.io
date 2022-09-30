/** @typedef {(ElementNode | TextNode | RawHTMLNode)} VirtualDomNode */

/**
 * @typedef {object} ElementNode
 * @property {string} tag
 * @property {string} [className]
 * @property {Object<string, string>} [attr]
 * @property {Object<string, string>} [style]
 * @property {VirtualDomNode[]} [children]
 */

/** @typedef {{ tag: "text*", text: string }} TextNode */
/** @typedef {{ tag: "html*", html: string }} RawHTMLNode */

export { };
