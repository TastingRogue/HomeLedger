import { h as head, f as attr_class } from './index.js-VYRhdVs9.js';
import './state.svelte-Ba8H-s0W.js';
import './index3-Vie9xSZt.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let currentStep = 1;
    head("1dx66kt", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Registro Rápido | HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="quick-register svelte-1dx66kt"><header class="qr-header svelte-1dx66kt"><button class="qr-back-btn svelte-1dx66kt" aria-label="Volver">←</button> <h1 class="svelte-1dx66kt">Registro Rápido</h1> <div class="qr-steps svelte-1dx66kt"><span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 1 })}>1</span> <span class="step-line svelte-1dx66kt"></span> <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 2 })}>2</span> <span class="step-line svelte-1dx66kt"></span> <span${attr_class("step-dot svelte-1dx66kt", void 0, { "active": currentStep >= 3 })}>3</span></div></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="qr-loading svelte-1dx66kt"><span class="spinner svelte-1dx66kt"></span> <span>Cargando...</span></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Bb7-QtAT.js.map
