import { h as head, e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from './index.js-DpxZscsS.js';
import { t } from './index3-CiwRTOnw.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let receipts = [];
    let attachments = [];
    let loading = true;
    let search = "";
    let uploading = false;
    head("4k76zl", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Recibos y facturas · HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-4k76zl"><header class="header svelte-4k76zl"><div><p class="eyebrow svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_eyebrow"))}</p><h1 class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_title"))}</h1><p class="subtitle svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_subtitle"))}</p></div><div class="stats svelte-4k76zl"><span class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_analyzed", { n: receipts.length }))}</span><span class="svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_attachments", { n: attachments.length }))}</span></div></header> <div class="toolbar svelte-4k76zl"><input${attr("value", search)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("receipts.search_placeholder"))} class="svelte-4k76zl"/><button class="secondary svelte-4k76zl"${attr("disabled", loading, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.refresh"))}</button><button class="upload-btn svelte-4k76zl"${attr("disabled", uploading, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.upload"))}</button></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="table-card svelte-4k76zl">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty svelte-4k76zl">${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.loading"))}</div>`);
    }
    $$renderer2.push(`<!--]--></section></div> `);
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
//# sourceMappingURL=_page.svelte-CmFNw7jG.js.map
