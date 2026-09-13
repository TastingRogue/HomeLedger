import { h as head, e as escape_html, k as store_get, u as unsubscribe_stores, F as FILENAME } from './index.js-d7AbrnM1.js';
import { p as push_element, a as pop_element } from './dev-D3dQJW43.js';
import { t } from './index3-75NATqbY.js';
import './preferences-DzkHsNm-.js';

_page[FILENAME] = "src/routes/(app)/calendario/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      (/* @__PURE__ */ new Date()).getMonth();
      (/* @__PURE__ */ new Date()).getFullYear();
      head("1tv67oi", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.title"))}</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-1tv67oi">`);
      push_element($$renderer2, "div", 90, 0);
      $$renderer2.push(`<header class="page-header svelte-1tv67oi">`);
      push_element($$renderer2, "header", 91, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 92, 4);
      $$renderer2.push(`<h1 class="svelte-1tv67oi">`);
      push_element($$renderer2, "h1", 93, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-1tv67oi">`);
      push_element($$renderer2, "p", 94, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.subtitle"))}</p>`);
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
        $$renderer2.push(`<div class="loading svelte-1tv67oi">`);
        push_element($$renderer2, "div", 103, 4);
        $$renderer2.push(`<div class="spinner svelte-1tv67oi">`);
        push_element($$renderer2, "div", 103, 25);
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
//# sourceMappingURL=_page.svelte-g7YlBCc6.js.map
