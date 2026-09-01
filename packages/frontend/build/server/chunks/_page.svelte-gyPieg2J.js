import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-CtKG6L_g.js';
import { t } from './index3-BZ64yhFt.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("7j7xx8", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))} | HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-7j7xx8"><header class="page-header svelte-7j7xx8"><div><h1 class="svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))}</h1> <p class="page-subtitle svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.subtitle"))}</p></div> <button class="btn-new svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.new"))}</button></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-7j7xx8"><div class="spinner svelte-7j7xx8"></div><span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span></div>`);
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
//# sourceMappingURL=_page.svelte-gyPieg2J.js.map
