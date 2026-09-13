import { h as head, e as escape_html, k as store_get, d as attr, u as unsubscribe_stores, F as FILENAME } from './index.js-XWaMFQMt.js';
import { p as push_element, a as pop_element } from './dev-Bz53WfQq.js';
import { t } from './index3-DGyXqAF7.js';
import './preferences-Cesmdl1S.js';

_page[FILENAME] = "src/routes/(app)/reglas/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let rules = [];
      head("9vg81e", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.rules"))} · HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-9vg81e">`);
      push_element($$renderer2, "div", 262, 0);
      $$renderer2.push(`<header class="header svelte-9vg81e">`);
      push_element($$renderer2, "header", 263, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 264, 4);
      $$renderer2.push(`<p class="eyebrow svelte-9vg81e">`);
      push_element($$renderer2, "p", 265, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_eyebrow"))}</p>`);
      pop_element();
      $$renderer2.push(` <h1 class="svelte-9vg81e">`);
      push_element($$renderer2, "h1", 266, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="subtitle svelte-9vg81e">`);
      push_element($$renderer2, "p", 267, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="header-actions svelte-9vg81e">`);
      push_element($$renderer2, "div", 269, 4);
      $$renderer2.push(`<button class="btn-secondary svelte-9vg81e"${attr("disabled", rules.length === 0, true)}>`);
      push_element($$renderer2, "button", 270, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.apply"))}</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn-new svelte-9vg81e">`);
      push_element($$renderer2, "button", 273, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.new"))}</button>`);
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
        $$renderer2.push(`<div class="state-msg svelte-9vg81e">`);
        push_element($$renderer2, "div", 282, 4);
        $$renderer2.push(`…</div>`);
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
//# sourceMappingURL=_page.svelte-D83ylCY3.js.map
