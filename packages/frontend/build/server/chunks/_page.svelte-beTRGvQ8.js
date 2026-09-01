import { h as head, e as escape_html, b as attr, s as store_get, u as unsubscribe_stores } from './index.js-CtKG6L_g.js';
import { t } from './index3-BZ64yhFt.js';

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
    $$renderer2.push(`<div class="page svelte-4k76zl"><header class="header svelte-4k76zl"><div><p class="eyebrow svelte-4k76zl">DOCUMENTOS</p><h1 class="svelte-4k76zl">Recibos y facturas</h1><p class="subtitle svelte-4k76zl">Analiza comprobantes localmente y relaciona sus datos con tus compras.</p></div><div class="stats svelte-4k76zl"><span class="svelte-4k76zl">${escape_html(receipts.length)} analizados</span><span class="svelte-4k76zl">${escape_html(attachments.length)} adjuntos</span></div></header> <div class="toolbar svelte-4k76zl"><input${attr("value", search)} placeholder="Buscar comercio, RFC, archivo..." class="svelte-4k76zl"/><button class="secondary svelte-4k76zl"${attr("disabled", loading, true)}>Actualizar</button><button class="upload-btn svelte-4k76zl"${attr("disabled", uploading, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.upload"))}</button><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.xml" style="display:none" class="svelte-4k76zl"/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="table-card svelte-4k76zl">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty svelte-4k76zl">Cargando documentos...</div>`);
    }
    $$renderer2.push(`<!--]--></section></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-beTRGvQ8.js.map
