import { writeVirtualDom } from "../lib/dom.js";
import {
  firstHeadingAsString,
  firstParagraphAsString,
  parseMarkdown,
} from "../lib/markdown.js";
import { MetaContents, Post } from "./components/post.js";

async function render() {
  const basePath = location.pathname.split("/").slice(0, -1).join("/"); // "/posts"
  const pagePath = location.search
    .slice(1) // remove '?'
    .split("&")
    .map((pair) => pair.split("="))
    .find(([key]) => key === "path")?.[1]; // yyyy-MM-dd--<title>.html
  const pageName = pagePath?.split("/").slice(-1)[0].replace(".html", "");
  const contentPath = `${basePath}/source/${pageName}.md`;

  // fetch content
  const contentResponse = await fetch(contentPath);
  if (!contentResponse.ok) {
    throw new Error("Failed to fetch content");
  }
  const markdownContent = await contentResponse.text();

  // parse content
  const markdownBlocks = parseMarkdown(markdownContent);

  // metadata
  const date = pagePath?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
  const pageTitle = firstHeadingAsString(markdownBlocks) || "";
  const description = firstParagraphAsString(markdownBlocks) || "";
  const metadata = {
    title: pageTitle,
    date,
    description: description,
    ogp: {
      "og:url": `https://iinm.github.io/posts/${pagePath}`,
      "og:type": "article",
      "og:title": pageTitle,
      "og:description": description,
      "og:image": "https://avatars.githubusercontent.com/u/8685693",
      "og:site_name": "iinm.github.io",
    },
  };

  // render
  writeVirtualDom(MetaContents({ metadata }), document.head);
  writeVirtualDom(
    Post({ markdownBlocks, metadata }),
    /** @type {HTMLElement} */ (document.querySelector(".post")),
  );

  /** @type {HTMLElement} */ (
    document.querySelector("#renderer-script")
  ).remove();
}

render().catch((err) => {
  console.error(err);
});
