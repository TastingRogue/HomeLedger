import { F as FILENAME } from './index.js-CL3jGV1D.js';
import { p as push_element, a as pop_element } from './dev-8SgElRuP.js';
import './client-Dm5Nj20W.js';
import './Icon-6L_Lq_jQ.js';
import './index3-CDrnPaa6.js';
import './preferences-CuB55gmP.js';

_layout[FILENAME] = "src/routes/(app)/+layout.svelte";
function _layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { children } = $$props;
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="auth-check svelte-1v2axqk">`);
        push_element($$renderer2, "div", 150, 2);
        $$renderer2.push(`<div class="auth-spinner svelte-1v2axqk">`);
        push_element($$renderer2, "div", 151, 4);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p>`);
        push_element($$renderer2, "p", 152, 4);
        $$renderer2.push(`Verificando sesión...</p>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]-->`);
    },
    _layout
  );
}
_layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _layout as default };
//# sourceMappingURL=_layout.svelte-Ciny9LX6.js.map
