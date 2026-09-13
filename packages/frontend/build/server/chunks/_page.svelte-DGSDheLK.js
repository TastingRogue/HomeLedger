import { o as get, h as head, e as escape_html, k as store_get, f as attr_class, F as FILENAME, u as unsubscribe_stores } from './index.js-BAl00Aza.js';
import { p as push_element, a as pop_element } from './dev-05ttKyqC.js';
import { I as Icon } from './Icon-D4MdJ2Lg.js';
import './Dropdown-BTkuIWBp.js';
import { c as currencyConfig, p as preferences } from './preferences-BQPl3eQs.js';
import { t as theme } from './theme-BN2ufSiT.js';
import { t } from './index3-D3DDDBm8.js';

_page[FILENAME] = "src/routes/(app)/configuracion/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let activeTab = "perfil";
      get(preferences).currency;
      get(preferences).locale;
      get(theme);
      Object.entries(currencyConfig).map(([k, v]) => ({ value: k, label: `${v.symbol} — ${v.name}` }));
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("6qgtij", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.title"))} - HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-6qgtij">`);
        push_element($$renderer3, "div", 137, 0);
        $$renderer3.push(`<header class="page-header svelte-6qgtij">`);
        push_element($$renderer3, "header", 138, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 139, 4);
        $$renderer3.push(`<h1 class="svelte-6qgtij">`);
        push_element($$renderer3, "h1", 140, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="page-subtitle svelte-6qgtij">`);
        push_element($$renderer3, "p", 141, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` <div class="settings-layout svelte-6qgtij">`);
        push_element($$renderer3, "div", 145, 2);
        $$renderer3.push(`<nav class="settings-tabs svelte-6qgtij">`);
        push_element($$renderer3, "nav", 147, 4);
        $$renderer3.push(`<button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "perfil" })}>`);
        push_element($$renderer3, "button", 148, 6);
        Icon($$renderer3, { name: "building", size: 15 });
        $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.profile"))}</button>`);
        pop_element();
        $$renderer3.push(` <button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "seguridad" })}>`);
        push_element($$renderer3, "button", 151, 6);
        Icon($$renderer3, { name: "settings", size: 15 });
        $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.security"))}</button>`);
        pop_element();
        $$renderer3.push(` <button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "datos" })}>`);
        push_element($$renderer3, "button", 154, 6);
        Icon($$renderer3, { name: "save", size: 15 });
        $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.data"))}</button>`);
        pop_element();
        $$renderer3.push(`</nav>`);
        pop_element();
        $$renderer3.push(` <div class="settings-content svelte-6qgtij">`);
        push_element($$renderer3, "div", 160, 4);
        {
          $$renderer3.push("<!--[0-->");
          {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="loading-state svelte-6qgtij">`);
            push_element($$renderer3, "div", 164, 10);
            $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.loading_profile"))}</div>`);
            pop_element();
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></div>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` `);
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
//# sourceMappingURL=_page.svelte-DGSDheLK.js.map
