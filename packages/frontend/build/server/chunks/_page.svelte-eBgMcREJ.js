import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-CfMxod6N.js';
import { t } from './index3-CxI74EDd.js';

/* empty css                                                          */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("7j7xx8", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))} | HomeLedger</title>`);
        });
      });
      $$renderer3.push(`<div class="page svelte-7j7xx8"><header class="page-header svelte-7j7xx8"><div><h1 class="svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.title"))}</h1> <p class="page-subtitle svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.subtitle"))}</p></div> <button class="btn-new svelte-7j7xx8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transfers.new"))}</button></header> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="state-msg svelte-7j7xx8"><div class="spinner svelte-7j7xx8"></div><span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span></div>`);
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
//# sourceMappingURL=_page.svelte-eBgMcREJ.js.map
