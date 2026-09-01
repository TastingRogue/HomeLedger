import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-CtKG6L_g.js';
import { t } from './index3-BZ64yhFt.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("190a2js", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("budgets.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-190a2js"><header class="page-header svelte-190a2js"><div><h1 class="svelte-190a2js">${escape_html(store_get($$store_subs ??= {}, "$t", t)("budgets.title"))}</h1> <p class="page-subtitle svelte-190a2js">${escape_html(store_get($$store_subs ??= {}, "$t", t)("budgets.subtitle"))}</p></div> <button class="btn btn-primary svelte-190a2js">${escape_html(store_get($$store_subs ??= {}, "$t", t)("budgets.new"))}</button></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-190a2js"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("budgets.loading"))}</p></div>`);
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
//# sourceMappingURL=_page.svelte-CPyGS36y.js.map
