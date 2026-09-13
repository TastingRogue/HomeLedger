import { h as head, e as escape_html, k as store_get, u as unsubscribe_stores, F as FILENAME } from './index.js-XWaMFQMt.js';
import { p as push_element, a as pop_element } from './dev-Bz53WfQq.js';
import { t } from './index3-DGyXqAF7.js';
import './preferences-Cesmdl1S.js';

_page[FILENAME] = "src/routes/(app)/reportes/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      head("gw68dq", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-gw68dq">`);
      push_element($$renderer2, "div", 65, 0);
      $$renderer2.push(`<header class="page-header svelte-gw68dq">`);
      push_element($$renderer2, "header", 66, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 67, 4);
      $$renderer2.push(`<h1 class="svelte-gw68dq">`);
      push_element($$renderer2, "h1", 68, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-gw68dq">`);
      push_element($$renderer2, "p", 69, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="loading svelte-gw68dq">`);
        push_element($$renderer2, "div", 74, 4);
        $$renderer2.push(`<div class="spinner svelte-gw68dq">`);
        push_element($$renderer2, "div", 74, 25);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-DN8as47L.js.map
