import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-BfLmu_lo.js';
import { t } from './index3-DyOSNu1Q.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("auyyo6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.title"))} · HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-auyyo6"><header class="page-header svelte-auyyo6"><div><h1 class="svelte-auyyo6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.title"))}</h1> <p class="page-subtitle svelte-auyyo6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.subtitle"))}</p></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading svelte-auyyo6"><div class="spinner svelte-auyyo6"></div><span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("networth.loading"))}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BRW7mCFd.js.map
