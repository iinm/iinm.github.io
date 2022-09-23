/** @typedef {import("../lib/markdown.type").HeadingBlock} HeadingBlock */

import * as markdown from "../lib/markdown.js";
import * as dom from "../lib/dom.js";
import { MetaContents, Post } from "./components/index.js";

const basePath = location.pathname.split("/").slice(0, -1).join("/");
const pagePath = location.search
  .slice(1) // remove '?'
  .split("&")
  .map((pair) => pair.split("="))
  .find(([key]) => key === "path")?.[1];
const pageName = pagePath?.split("/").slice(-1)[0].replace(".html", "");

// const metadataPath = `${basePath}/data/${pageName}.metadata.json`
const contentPath = `${basePath}/data/${pageName}.md`;

const [contentResponse] = await Promise.all([
  // fetch(metadataPath),
  fetch(contentPath),
]);

if (!contentResponse.ok) {
  throw new Error("Failed to fetch content");
}

const [markdownContent] = await Promise.all([
  // metadataResponse.text(),
  contentResponse.text(),
]);

const markdownBlocks = markdown.parse(markdownContent);

const date = pagePath?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
if (!date) {
  throw new Error(`Cannot get date from filename, ${pagePath}`);
}

const titleBlock = markdownBlocks.find((block) => block.type === "heading");
if (!titleBlock) {
  throw new Error(`Cannot find title block in ${pagePath}`);
}
const pageTitle = /** @type {HeadingBlock} */ (titleBlock).props.heading;

const metadata = {
  title: pageTitle,
  date,
  ogp: {
    "og:url": `https://iinm.github.io/posts/${pagePath}`,
    "og:type": "article",
    "og:title": pageTitle,
    "og:image": "https://avatars.githubusercontent.com/u/8685693",
    "og:site_name": "/proc/iinm/fd/2",
  },
};

dom.write(MetaContents({ metadata }), document.head);
dom.write(
  Post({ markdownBlocks, metadata }),
  /** @type {HTMLElement} */(document.querySelector(".post"))
);

/** @type {HTMLElement} */ (document.querySelector("#render-script")).remove();
