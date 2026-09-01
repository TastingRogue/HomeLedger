import { h as head, e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from './index.js-BfLmu_lo.js';
import { t } from './index3-DyOSNu1Q.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let exporting = false;
    head("1kf85nq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Respaldo - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1kf85nq"><header class="page-header svelte-1kf85nq"><h1 class="svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.title"))}</h1></header> `);
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
    $$renderer2.push(`<!--]--> <div class="actions-row svelte-1kf85nq"><button class="action-btn export-btn svelte-1kf85nq"${attr("disabled", exporting, true)}><span class="action-icon svelte-1kf85nq">↓</span> <span class="action-text svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.export_btn"))}</span> <span class="action-desc svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.export_desc"))}</span></button> <label class="action-btn import-btn svelte-1kf85nq" for="file-input"><span class="action-icon svelte-1kf85nq">↑</span> <span class="action-text svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.import_btn"))}</span> <span class="action-desc svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.import_desc"))}</span></label> <input type="file" id="file-input" accept=".json,application/json" class="file-input svelte-1kf85nq"/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="section svelte-1kf85nq"><h2 class="section-title svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.history_title"))}</h2> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="loading-msg svelte-1kf85nq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.loading_history"))}</p>`);
    }
    $$renderer2.push(`<!--]--></section></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BxxA3WvT.js.map
