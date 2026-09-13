import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-C4wgdopQ.js';
import { t } from './index3-D3GCa1Y1.js';
import './preferences-BQIl6Kf4.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1b2azqk", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.loans"))} · HomeLedger</title>`);
        });
      });
      $$renderer3.push(`<div class="page svelte-1b2azqk"><header class="header svelte-1b2azqk"><div><p class="eyebrow svelte-1b2azqk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_eyebrow"))}</p> <h1 class="svelte-1b2azqk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_title"))}</h1> <p class="subtitle svelte-1b2azqk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.page_subtitle"))}</p></div> <button class="btn-new svelte-1b2azqk">${escape_html(store_get($$store_subs ??= {}, "$t", t)("loans.new"))}</button></header> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="state-msg svelte-1b2azqk">…</div>`);
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
//# sourceMappingURL=_page.svelte-D5SAGPa8.js.map
