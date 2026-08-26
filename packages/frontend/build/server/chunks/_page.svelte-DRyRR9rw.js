import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-Dj4Feo29.js';
import { t } from './index3-DmccZdGz.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1fv4xvk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1fv4xvk"><header class="page-header svelte-1fv4xvk"><div><h1 class="svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))}</h1> <p class="page-subtitle svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.subtitle"))}</p></div> <button class="btn btn-primary svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.new"))}</button></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-1fv4xvk"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.loading"))}</p></div>`);
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
//# sourceMappingURL=_page.svelte-DRyRR9rw.js.map
