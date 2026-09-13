import { h as head, e as escape_html, k as store_get, d as attr, u as unsubscribe_stores, F as FILENAME } from './index.js-Ckl2DFin.js';
import { p as push_element, a as pop_element } from './dev-Dg4Nx9-9.js';
import { t } from './index3-CAcP0rrB.js';
import './preferences-D1AoFYVw.js';

_page[FILENAME] = "src/routes/(app)/cuentas/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      head("1dp8t9f", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-1dp8t9f">`);
      push_element($$renderer2, "div", 267, 0);
      $$renderer2.push(`<header class="page-header svelte-1dp8t9f">`);
      push_element($$renderer2, "header", 268, 2);
      $$renderer2.push(`<div class="page-header-left svelte-1dp8t9f">`);
      push_element($$renderer2, "div", 269, 4);
      $$renderer2.push(`<h1 class="svelte-1dp8t9f">`);
      push_element($$renderer2, "h1", 270, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-1dp8t9f">`);
      push_element($$renderer2, "p", 271, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <button class="btn-new svelte-1dp8t9f"${attr("title", store_get($$store_subs ??= {}, "$t", t)("accounts.create_tooltip"))}>`);
      push_element($$renderer2, "button", 273, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.add"))}</button>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="state-msg svelte-1dp8t9f">`);
        push_element($$renderer2, "div", 277, 4);
        $$renderer2.push(`<div class="spinner svelte-1dp8t9f">`);
        push_element($$renderer2, "div", 277, 27);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`<p>`);
        push_element($$renderer2, "p", 277, 54);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.loading"))}</p>`);
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
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
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
//# sourceMappingURL=_page.svelte-DK8BZR3i.js.map
