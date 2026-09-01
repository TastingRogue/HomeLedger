import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-BauISpZi.js';
import { t } from './index3-BlqbYrwr.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    (/* @__PURE__ */ new Date()).getMonth();
    (/* @__PURE__ */ new Date()).getFullYear();
    head("1tv67oi", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1tv67oi"><header class="page-header svelte-1tv67oi"><div><h1 class="svelte-1tv67oi">${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.title"))}</h1> <p class="page-subtitle svelte-1tv67oi">${escape_html(store_get($$store_subs ??= {}, "$t", t)("calendar.subtitle"))}</p></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading svelte-1tv67oi"><div class="spinner svelte-1tv67oi"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DaMYZkGp.js.map
