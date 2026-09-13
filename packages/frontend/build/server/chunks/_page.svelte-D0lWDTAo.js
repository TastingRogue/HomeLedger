import { h as head, e as escape_html, k as store_get, f as attr_class, d as attr, F as FILENAME, u as unsubscribe_stores } from './index.js-BF_FUX1N.js';
import { p as push_element, a as pop_element } from './dev-Bd-ACfmU.js';
import './DatePicker-Cs3NtZkO.js';
import { t } from './index3-GLowYSS2.js';
import './preferences-BvhJpYwi.js';

_page[FILENAME] = "src/routes/(app)/suscripciones/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let activeView = "lista";
      (/* @__PURE__ */ new Date()).getMonth();
      (/* @__PURE__ */ new Date()).getFullYear();
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("1di2lni", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.title"))} - HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-1di2lni">`);
        push_element($$renderer3, "div", 285, 0);
        $$renderer3.push(`<header class="page-header svelte-1di2lni">`);
        push_element($$renderer3, "header", 286, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 287, 4);
        $$renderer3.push(`<h1 class="svelte-1di2lni">`);
        push_element($$renderer3, "h1", 288, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="page-subtitle svelte-1di2lni">`);
        push_element($$renderer3, "p", 289, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <button class="btn btn-primary svelte-1di2lni">`);
        push_element($$renderer3, "button", 291, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.new"))}</button>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` <div class="info-banner svelte-1di2lni">`);
        push_element($$renderer3, "div", 294, 2);
        $$renderer3.push(`<span class="info-icon svelte-1di2lni">`);
        push_element($$renderer3, "span", 295, 4);
        $$renderer3.push(`ℹ</span>`);
        pop_element();
        $$renderer3.push(` <span>`);
        push_element($$renderer3, "span", 296, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.auto_charge_info"))}</span>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`  <nav class="view-tabs svelte-1di2lni" role="tablist" aria-label="Vistas de suscripciones">`);
        push_element($$renderer3, "nav", 301, 2);
        $$renderer3.push(`<button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "lista" })} role="tab"${attr("aria-selected", activeView === "lista")}>`);
        push_element($$renderer3, "button", 302, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_list"))}</button>`);
        pop_element();
        $$renderer3.push(` <button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "calendario" })} role="tab"${attr("aria-selected", activeView === "calendario")}>`);
        push_element($$renderer3, "button", 311, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_calendar"))}</button>`);
        pop_element();
        $$renderer3.push(`</nav>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="state-msg svelte-1di2lni">`);
          push_element($$renderer3, "div", 323, 4);
          $$renderer3.push(`<p>`);
          push_element($$renderer3, "p", 323, 27);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.loading"))}</p>`);
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
//# sourceMappingURL=_page.svelte-D0lWDTAo.js.map
