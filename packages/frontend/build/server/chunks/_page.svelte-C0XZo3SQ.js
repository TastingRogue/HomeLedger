import { h as head, e as escape_html, s as store_get, f as attr_class, b as attr, u as unsubscribe_stores } from './index.js-Dj4Feo29.js';
import { t } from './index3-DmccZdGz.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeView = "lista";
    (/* @__PURE__ */ new Date()).getMonth();
    (/* @__PURE__ */ new Date()).getFullYear();
    head("1di2lni", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1di2lni"><header class="page-header svelte-1di2lni"><div><h1 class="svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.title"))}</h1> <p class="page-subtitle svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.subtitle"))}</p></div> <button class="btn btn-primary svelte-1di2lni">${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.new"))}</button></header> <div class="info-banner svelte-1di2lni"><span class="info-icon svelte-1di2lni">ℹ</span> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.auto_charge_info"))}</span></div> <nav class="view-tabs svelte-1di2lni" role="tablist" aria-label="Vistas de suscripciones"><button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "lista" })} role="tab"${attr("aria-selected", activeView === "lista")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_list"))}</button> <button${attr_class("tab-btn svelte-1di2lni", void 0, { "active": activeView === "calendario" })} role="tab"${attr("aria-selected", activeView === "calendario")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.view_calendar"))}</button></nav> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-1di2lni"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("subscriptions.loading"))}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C0XZo3SQ.js.map
