import { h as head, d as attr, k as store_get, f as attr_class, e as escape_html, u as unsubscribe_stores, F as FILENAME } from './index.js-d7AbrnM1.js';
import { p as push_element, a as pop_element } from './dev-D3dQJW43.js';
import './client-Uqwb3byP.js';
import { t } from './index3-75NATqbY.js';
import './preferences-DzkHsNm-.js';

_page[FILENAME] = "src/routes/(app)/registro-rapido/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let currentStep = 1;
      head("1dx66kt", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.quick_register"))} | HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="quick-register svelte-1dx66kt">`);
      push_element($$renderer2, "div", 243, 0);
      $$renderer2.push(`<header class="qr-header svelte-1dx66kt">`);
      push_element($$renderer2, "header", 245, 2);
      $$renderer2.push(`<button class="qr-back-btn svelte-1dx66kt"${attr("aria-label", store_get($$store_subs ??= {}, "$t", t)("a11y.back"))}>`);
      push_element($$renderer2, "button", 246, 4);
      $$renderer2.push(`←</button>`);
      pop_element();
      $$renderer2.push(` <h1 class="svelte-1dx66kt">`);
      push_element($$renderer2, "h1", 247, 4);
      $$renderer2.push(`Registro Rápido</h1>`);
      pop_element();
      $$renderer2.push(` <div class="qr-steps svelte-1dx66kt">`);
      push_element($$renderer2, "div", 248, 4);
      $$renderer2.push(`<span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 1 })}>`);
      push_element($$renderer2, "span", 249, 6);
      $$renderer2.push(`1</span>`);
      pop_element();
      $$renderer2.push(` <span class="step-line svelte-1dx66kt">`);
      push_element($$renderer2, "span", 250, 6);
      $$renderer2.push(`</span>`);
      pop_element();
      $$renderer2.push(` <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 2 })}>`);
      push_element($$renderer2, "span", 251, 6);
      $$renderer2.push(`2</span>`);
      pop_element();
      $$renderer2.push(` <span class="step-line svelte-1dx66kt">`);
      push_element($$renderer2, "span", 252, 6);
      $$renderer2.push(`</span>`);
      pop_element();
      $$renderer2.push(` <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 3 })}>`);
      push_element($$renderer2, "span", 253, 6);
      $$renderer2.push(`3</span>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="qr-loading svelte-1dx66kt">`);
        push_element($$renderer2, "div", 258, 4);
        $$renderer2.push(`<span class="spinner svelte-1dx66kt">`);
        push_element($$renderer2, "span", 259, 6);
        $$renderer2.push(`</span>`);
        pop_element();
        $$renderer2.push(` <span>`);
        push_element($$renderer2, "span", 260, 6);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
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
//# sourceMappingURL=_page.svelte-Bl8IFltZ.js.map
