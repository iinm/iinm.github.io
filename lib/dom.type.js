/** @typedef {(VirtualElementNode | VirtualTextNode | RawHTMLNode)} VirtualDomNode */

/**
 * @typedef {Object} VirtualElementNode
 * @property {string} tag
 * @property {string} [className]
 * @property {Object.<string, string>} [attr]
 * @property {Object.<string, string>} [style]
 * @property {VirtualDomNode[]} [children]
 */

/** @typedef {{ tag: "*text", text: string }} VirtualTextNode */
/** @typedef {{ tag: "*html", html: string }} RawHTMLNode */

export {};
