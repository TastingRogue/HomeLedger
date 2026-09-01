import { h as head, i as attr_class, e as escape_html, s as store_get, u as unsubscribe_stores } from './index.js-BauISpZi.js';
import './state.svelte-U7rhg8Ax.js';
import { t } from './index3-BlqbYrwr.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentStep = 1;
    head("1dx66kt", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Registro Rápido | HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="quick-register svelte-1dx66kt"><header class="qr-header svelte-1dx66kt"><button class="qr-back-btn svelte-1dx66kt" aria-label="Volver">←</button> <h1 class="svelte-1dx66kt">Registro Rápido</h1> <div class="qr-steps svelte-1dx66kt"><span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 1 })}>1</span> <span class="step-line svelte-1dx66kt"></span> <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 2 })}>2</span> <span class="step-line svelte-1dx66kt"></span> <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 3 })}>3</span></div></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="qr-loading svelte-1dx66kt"><span class="spinner svelte-1dx66kt"></span> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C1RjrxMd.js.map
