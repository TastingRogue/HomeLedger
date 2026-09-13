import { s as ssr_context, F as FILENAME, c as set_ssr_context } from './index.js-CIqeq94u.js';

const autoclosing_children = {
  // based on http://developers.whatwg.org/syntax.html#syntax-tag-omission
  li: { direct: ["li"] },
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt#technical_summary
  dt: { descendant: ["dt", "dd"], reset_by: ["dl"] },
  dd: { descendant: ["dt", "dd"], reset_by: ["dl"] },
  p: {
    descendant: [
      "address",
      "article",
      "aside",
      "blockquote",
      "div",
      "dl",
      "fieldset",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hgroup",
      "hr",
      "main",
      "menu",
      "nav",
      "ol",
      "p",
      "pre",
      "section",
      "table",
      "ul"
    ]
  },
  rt: { descendant: ["rt", "rp"] },
  rp: { descendant: ["rt", "rp"] },
  optgroup: { descendant: ["optgroup"] },
  option: { descendant: ["option", "optgroup"] },
  thead: { direct: ["tbody", "tfoot"] },
  tbody: { direct: ["tbody", "tfoot"] },
  tfoot: { direct: ["tbody"] },
  tr: { direct: ["tr", "tbody"] },
  td: { direct: ["td", "th", "tr"] },
  th: { direct: ["td", "th", "tr"] }
};
const disallowed_children = {
  ...autoclosing_children,
  // Strictly speaking, seeing an <option> doesn't mean we're in a <select>, but we assume it here
  // option or optgroup does not have an `only` restriction because newer browsers support rich HTML content
  // inside option elements. For older browsers, hydration will handle the mismatch.
  form: { descendant: ["form"] },
  a: { descendant: ["a"] },
  button: { descendant: ["button"] },
  h1: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h2: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h3: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h4: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h5: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  h6: { descendant: ["h1", "h2", "h3", "h4", "h5", "h6"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
  // No special behavior since these rules fall back to "in body" mode for
  // all except special table nodes which cause bad parsing behavior anyway.
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
  tr: { only: ["th", "td", "style", "script", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
  tbody: { only: ["tr", "style", "script", "template"] },
  thead: { only: ["tr", "style", "script", "template"] },
  tfoot: { only: ["tr", "style", "script", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
  colgroup: { only: ["col", "template"] },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
  table: {
    only: ["caption", "colgroup", "tbody", "thead", "tfoot", "style", "script", "template"]
  },
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
  head: {
    only: [
      "base",
      "basefont",
      "bgsound",
      "link",
      "meta",
      "title",
      "noscript",
      "noframes",
      "style",
      "script",
      "template"
    ]
  },
  // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
  html: { only: ["head", "body", "frameset"] },
  frameset: { only: ["frame"] },
  "#document": { only: ["html"] }
};
function is_tag_valid_with_ancestor(child_tag, ancestors, child_loc, ancestor_loc) {
  if (child_tag.includes("-")) return null;
  const ancestor_tag = ancestors[ancestors.length - 1];
  const disallowed = disallowed_children[ancestor_tag];
  if (!disallowed) return null;
  if ("reset_by" in disallowed && disallowed.reset_by) {
    for (let i = ancestors.length - 2; i >= 0; i--) {
      const ancestor = ancestors[i];
      if (ancestor.includes("-")) return null;
      if (disallowed.reset_by.includes(ancestors[i])) {
        return null;
      }
    }
  }
  if ("descendant" in disallowed && disallowed.descendant.includes(child_tag)) {
    const child = child_loc ? `\`<${child_tag}>\` (${child_loc})` : `\`<${child_tag}>\``;
    const ancestor = ancestor_loc ? `\`<${ancestor_tag}>\` (${ancestor_loc})` : `\`<${ancestor_tag}>\``;
    return `${child} cannot be a descendant of ${ancestor}`;
  }
  return null;
}
function is_tag_valid_with_parent(child_tag, parent_tag, child_loc, parent_loc) {
  if (child_tag.includes("-") || parent_tag?.includes("-")) return null;
  if (parent_tag === "template") return null;
  const disallowed = disallowed_children[parent_tag];
  const child = child_loc ? `\`<${child_tag}>\` (${child_loc})` : `\`<${child_tag}>\``;
  const parent = parent_loc ? `\`<${parent_tag}>\` (${parent_loc})` : `\`<${parent_tag}>\``;
  if (disallowed) {
    if ("direct" in disallowed && disallowed.direct.includes(child_tag)) {
      return `${child} cannot be a direct child of ${parent}`;
    }
    if ("descendant" in disallowed && disallowed.descendant.includes(child_tag)) {
      return `${child} cannot be a child of ${parent}`;
    }
    if ("only" in disallowed && disallowed.only) {
      if (disallowed.only.includes(child_tag)) {
        return null;
      } else {
        return `${child} cannot be a child of ${parent}. \`<${parent_tag}>\` only allows these children: ${disallowed.only.map((d) => `\`<${d}>\``).join(", ")}`;
      }
    }
  }
  switch (child_tag) {
    case "body":
    case "caption":
    case "col":
    case "colgroup":
    case "frameset":
    case "frame":
    case "head":
    case "html":
      return `${child} cannot be a child of ${parent}`;
    case "thead":
    case "tbody":
    case "tfoot":
      return `${child} must be the child of a \`<table>\`, not a ${parent}`;
    case "td":
    case "th":
      return `${child} must be the child of a \`<tr>\`, not a ${parent}`;
    case "tr":
      return `\`<tr>\` must be the child of a \`<thead>\`, \`<tbody>\`, or \`<tfoot>\`, not a ${parent}`;
  }
  return null;
}
let seen;
function print_error(renderer, message) {
  message = `node_invalid_placement_ssr: ${message}

This can cause content to shift around as the browser repairs the HTML, and will likely result in a \`hydration_mismatch\` warning.`;
  if ((seen ??= /* @__PURE__ */ new Set()).has(message)) return;
  seen.add(message);
  console.error(message);
  renderer.head(
    (r) => r.push(
      // ensure that `<\/script>` can't leak in to the script contents
      `<script>console.error(${JSON.stringify(message).replaceAll("</", "<\\u002f")})<\/script>`
    )
  );
}
function push_element(renderer, tag, line, column) {
  var context = (
    /** @type {SSRContext} */
    ssr_context
  );
  var filename = context.function[FILENAME];
  var parent = context.element;
  var element = { tag, parent, filename, line, column };
  if (parent !== void 0) {
    var ancestor = parent.parent;
    var ancestors = [parent.tag];
    const child_loc = filename ? `${filename}:${line}:${column}` : void 0;
    const parent_loc = parent.filename ? `${parent.filename}:${parent.line}:${parent.column}` : void 0;
    const message = is_tag_valid_with_parent(tag, parent.tag, child_loc, parent_loc);
    if (message) print_error(renderer, message);
    while (ancestor != null) {
      ancestors.push(ancestor.tag);
      const ancestor_loc = ancestor.filename ? `${ancestor.filename}:${ancestor.line}:${ancestor.column}` : void 0;
      const message2 = is_tag_valid_with_ancestor(tag, ancestors, child_loc, ancestor_loc);
      if (message2) print_error(renderer, message2);
      ancestor = ancestor.parent;
    }
  }
  set_ssr_context({ ...context, p: context, element });
}
function pop_element() {
  set_ssr_context(
    /** @type {SSRContext} */
    ssr_context.p
  );
}

export { pop_element as a, push_element as p };
//# sourceMappingURL=dev-carmgcOP.js.map
