import { h as head, e as escape_html, k as store_get, F as FILENAME, u as unsubscribe_stores } from './index.js-CL3jGV1D.js';
import { p as push_element, a as pop_element } from './dev-8SgElRuP.js';
import './DatePicker-mpk7SUu_.js';
import { t } from './index3-CDrnPaa6.js';
import './preferences-CuB55gmP.js';

_page[FILENAME] = "src/routes/(app)/transferencias/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("7j7xx8", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))} | HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-7j7xx8">`);
        push_element($$renderer3, "div", 89, 0);
        $$renderer3.push(`<header class="page-header svelte-7j7xx8">`);
        push_element($$renderer3, "header", 90, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 91, 4);
        $$renderer3.push(`<h1 class="svelte-7j7xx8">`);
        push_element($$renderer3, "h1", 92, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="page-subtitle svelte-7j7xx8">`);
        push_element($$renderer3, "p", 93, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <button class="btn-new svelte-7j7xx8">`);
        push_element($$renderer3, "button", 95, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.new"))}</button>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="state-msg svelte-7j7xx8">`);
          push_element($$renderer3, "div", 101, 4);
          $$renderer3.push(`<div class="spinner svelte-7j7xx8">`);
          push_element($$renderer3, "div", 101, 27);
          $$renderer3.push(`</div>`);
          pop_element();
          $$renderer3.push(`<span>`);
          push_element($$renderer3, "span", 101, 54);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span>`);
          pop_element();
          $$renderer3.push(`</div>`);
          pop_element();
        }
        $$renderer3.push(`<!--]--></div>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
      do {
        $$settled = true;
        $$inner_renderer = $$renderer2.copy();
        $$render_inner($$inner_renderer);
      } while (!$$settled);
      $$renderer2.subsume($$inner_renderer);
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-apZgVg2t.js.map
