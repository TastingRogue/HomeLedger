import { h as head, e as escape_html, b as attr } from './index.js-C2xPlK5c.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let receipts = [];
    let attachments = [];
    let loading = true;
    let search = "";
    head("4k76zl", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Recibos y facturas · HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-4k76zl"><header class="header svelte-4k76zl"><div><p class="eyebrow svelte-4k76zl">DOCUMENTOS</p><h1 class="svelte-4k76zl">Recibos y facturas</h1><p class="subtitle svelte-4k76zl">Analiza comprobantes localmente y relaciona sus datos con tus compras.</p></div><div class="stats svelte-4k76zl"><span class="svelte-4k76zl">${escape_html(receipts.length)} analizados</span><span class="svelte-4k76zl">${escape_html(attachments.length)} adjuntos</span></div></header> <div class="toolbar svelte-4k76zl"><input${attr("value", search)} placeholder="Buscar comercio, RFC, archivo..." class="svelte-4k76zl"/><button class="secondary svelte-4k76zl"${attr("disabled", loading, true)}>Actualizar</button></div> `);
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
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C8CQmElW.js.map
