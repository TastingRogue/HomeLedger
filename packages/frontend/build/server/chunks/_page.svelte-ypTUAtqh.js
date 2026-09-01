import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-B0Oi87VM.js';
import { t } from './index3-BXYM_qJz.js';

/* empty css                                                          */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1fv4xvk", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer3.push(`<div class="page svelte-1fv4xvk"><header class="page-header svelte-1fv4xvk"><div><h1 class="svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.title"))}</h1> <p class="page-subtitle svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.subtitle"))}</p></div> <button class="btn btn-primary svelte-1fv4xvk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.new"))}</button></header> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="state-msg svelte-1fv4xvk"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("goals.loading"))}</p></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
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
//# sourceMappingURL=_page.svelte-ypTUAtqh.js.map
