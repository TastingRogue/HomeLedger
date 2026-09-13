import { h as head, e as escape_html, k as store_get, F as FILENAME, u as unsubscribe_stores } from './index.js-XWaMFQMt.js';
import { p as push_element, a as pop_element } from './dev-Bz53WfQq.js';
import './DatePicker-DmRTRViP.js';
import { t } from './index3-DGyXqAF7.js';
import './preferences-Cesmdl1S.js';

_page[FILENAME] = "src/routes/(app)/metas/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("1fv4xvk", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))} - HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-1fv4xvk">`);
        push_element($$renderer3, "div", 244, 0);
        $$renderer3.push(`<header class="page-header svelte-1fv4xvk">`);
        push_element($$renderer3, "header", 245, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 246, 4);
        $$renderer3.push(`<h1 class="svelte-1fv4xvk">`);
        push_element($$renderer3, "h1", 247, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="page-subtitle svelte-1fv4xvk">`);
        push_element($$renderer3, "p", 248, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <button class="btn btn-primary svelte-1fv4xvk">`);
        push_element($$renderer3, "button", 250, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.new"))}</button>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="state-msg svelte-1fv4xvk">`);
          push_element($$renderer3, "div", 254, 4);
          $$renderer3.push(`<p>`);
          push_element($$renderer3, "p", 254, 27);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.loading"))}</p>`);
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
//# sourceMappingURL=_page.svelte-BKC25vlf.js.map
