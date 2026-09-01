import { h as head, e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from './index.js-B0Oi87VM.js';
import { t } from './index3-BXYM_qJz.js';

/* empty css                                                          */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let receipts = [];
    let attachments = [];
    let loading = true;
    let search = "";
    let uploading = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("4k76zl", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Recibos y facturas · HomeLedger</title>`);
        });
      });
      $$renderer3.push(`<div class="page svelte-4k76zl"><header class="header svelte-4k76zl"><div><p class="eyebrow svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_eyebrow"))}</p><h1 class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_title"))}</h1><p class="subtitle svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_subtitle"))}</p></div><div class="stats svelte-4k76zl"><span class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_analyzed", { n: receipts.length }))}</span><span class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_attachments", { n: attachments.length }))}</span></div></header> <div class="toolbar svelte-4k76zl"><input${attr("value", search)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("receipts.search_placeholder"))} class="svelte-4k76zl"/><button class="secondary svelte-4k76zl"${attr("disabled", loading, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.refresh"))}</button><button class="upload-btn svelte-4k76zl"${attr("disabled", uploading, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.upload"))}</button></div> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> <section class="table-card svelte-4k76zl">`);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="empty svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.loading"))}</div>`);
      }
      $$renderer3.push(`<!--]--></section></div> `);
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
//# sourceMappingURL=_page.svelte-BzonXDZE.js.map
