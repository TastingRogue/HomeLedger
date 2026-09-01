import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-B0Oi87VM.js';
import { t } from './index3-BXYM_qJz.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("gw68dq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-gw68dq"><header class="page-header svelte-gw68dq"><div><h1 class="svelte-gw68dq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.title"))}</h1> <p class="page-subtitle svelte-gw68dq">${escape_html(store_get($$store_subs ??= {}, "$t", t)("reports.subtitle"))}</p></div></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading svelte-gw68dq"><div class="spinner svelte-gw68dq"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C2xX5Dtx.js.map
