import { h as head, e as escape_html, k as store_get, d as attr, u as unsubscribe_stores, F as FILENAME } from './index.js-BJSCTNbO.js';
import { p as push_element, a as pop_element } from './dev-RCxA4ck_.js';
import { t } from './index3-BSY7WfT4.js';
import './index-client-5r7auezB.js';
import './preferences-BmankOwv.js';

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
      push_element($$renderer2, "div", 268, 0);
      $$renderer2.push(`<header class="page-header svelte-1dp8t9f">`);
      push_element($$renderer2, "header", 269, 2);
      $$renderer2.push(`<div class="page-header-left svelte-1dp8t9f">`);
      push_element($$renderer2, "div", 270, 4);
      $$renderer2.push(`<h1 class="svelte-1dp8t9f">`);
      push_element($$renderer2, "h1", 271, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-1dp8t9f">`);
      push_element($$renderer2, "p", 272, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <button class="btn-new svelte-1dp8t9f"${attr("title", store_get($$store_subs ??= {}, "$t", t)("accounts.create_tooltip"))}>`);
      push_element($$renderer2, "button", 274, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.add"))}</button>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="state-msg svelte-1dp8t9f">`);
        push_element($$renderer2, "div", 278, 4);
        $$renderer2.push(`<div class="spinner svelte-1dp8t9f">`);
        push_element($$renderer2, "div", 278, 27);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`<p>`);
        push_element($$renderer2, "p", 278, 54);
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
//# sourceMappingURL=_page.svelte-BJvnCy0Y.js.map
