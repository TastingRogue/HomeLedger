import { h as head, e as escape_html, k as store_get, F as FILENAME, u as unsubscribe_stores } from './index.js-BJSCTNbO.js';
import { p as push_element, a as pop_element } from './dev-RCxA4ck_.js';
import './DatePicker-MOXmvhDO.js';
import { t } from './index3-BSY7WfT4.js';
import './index-client-5r7auezB.js';
import './preferences-BmankOwv.js';

_page[FILENAME] = "src/routes/(app)/prestamos/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("1b2azqk", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.loans"))} · HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-1b2azqk">`);
        push_element($$renderer3, "div", 208, 0);
        $$renderer3.push(`<header class="header svelte-1b2azqk">`);
        push_element($$renderer3, "header", 209, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 210, 4);
        $$renderer3.push(`<p class="eyebrow svelte-1b2azqk">`);
        push_element($$renderer3, "p", 211, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_eyebrow"))}</p>`);
        pop_element();
        $$renderer3.push(` <h1 class="svelte-1b2azqk">`);
        push_element($$renderer3, "h1", 212, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="subtitle svelte-1b2azqk">`);
        push_element($$renderer3, "p", 213, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <button class="btn-new svelte-1b2azqk">`);
        push_element($$renderer3, "button", 215, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.new"))}</button>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="state-msg svelte-1b2azqk">`);
          push_element($$renderer3, "div", 219, 4);
          $$renderer3.push(`…</div>`);
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
        $$renderer3.push(`<!--]--> `);
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
//# sourceMappingURL=_page.svelte-CsdHPnth.js.map
