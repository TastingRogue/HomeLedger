import { h as head, e as escape_html, s as store_get, i as attr_class, b as attr, u as unsubscribe_stores } from './index.js-BauISpZi.js';
import { t } from './index3-BlqbYrwr.js';

/* empty css                                                          */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
      $$renderer3.push(`<div class="page svelte-1di2lni"><header class="page-header svelte-1di2lni"><div><h1 class="svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.title"))}</h1> <p class="page-subtitle svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.subtitle"))}</p></div> <button class="btn btn-primary svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.new"))}</button></header> <div class="info-banner svelte-1di2lni"><span class="info-icon svelte-1di2lni">ℹ</span> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.auto_charge_info"))}</span></div>  <nav class="view-tabs svelte-1di2lni" role="tablist" aria-label="Vistas de suscripciones"><button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "lista" })} role="tab"${attr("aria-selected", activeView === "lista")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_list"))}</button> <button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "calendario" })} role="tab"${attr("aria-selected", activeView === "calendario")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_calendar"))}</button></nav> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="state-msg svelte-1di2lni"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.loading"))}</p></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
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
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BzEuMgEB.js.map
