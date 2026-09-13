import { h as head, e as escape_html, k as store_get, u as unsubscribe_stores, F as FILENAME } from './index.js-Cfqnfdcp.js';
import { p as push_element, a as pop_element } from './dev-C7XYrjSr.js';
import { t } from './index3-DFhiUyyP.js';
import './preferences-Bbo4WnW7.js';

_page[FILENAME] = "src/routes/(app)/patrimonio/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      head("auyyo6", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.title"))} · HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-auyyo6">`);
      push_element($$renderer2, "div", 92, 0);
      $$renderer2.push(`<header class="page-header svelte-auyyo6">`);
      push_element($$renderer2, "header", 93, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 94, 4);
      $$renderer2.push(`<h1 class="svelte-auyyo6">`);
      push_element($$renderer2, "h1", 95, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-auyyo6">`);
      push_element($$renderer2, "p", 96, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="loading svelte-auyyo6">`);
        push_element($$renderer2, "div", 103, 4);
        $$renderer2.push(`<div class="spinner svelte-auyyo6">`);
        push_element($$renderer2, "div", 103, 25);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`<span>`);
        push_element($$renderer2, "span", 103, 52);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.loading"))}</span>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-Cp1WYD-t.js.map
