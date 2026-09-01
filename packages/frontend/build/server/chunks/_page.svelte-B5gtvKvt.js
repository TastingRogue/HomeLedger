import { h as head, e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from './index.js-DmBNl0ox.js';
import { t } from './index3-CnLT-osH.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1dp8t9f", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1dp8t9f"><header class="page-header svelte-1dp8t9f"><div class="page-header-left svelte-1dp8t9f"><h1 class="svelte-1dp8t9f">${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.title"))}</h1> <p class="page-subtitle svelte-1dp8t9f">${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.subtitle"))}</p></div> <button class="btn-new svelte-1dp8t9f"${attr("title", store_get($$store_subs ??= {}, "$t", t)("accounts.create_tooltip"))}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.add"))}</button></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-1dp8t9f"><div class="spinner svelte-1dp8t9f"></div><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("accounts.loading"))}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
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
//# sourceMappingURL=_page.svelte-B5gtvKvt.js.map
