import { F as FILENAME } from './index.js-Ckl2DFin.js';
import { p as push_element, a as pop_element } from './dev-Dg4Nx9-9.js';
import './client-D5NrWgSD.js';
import './Icon-CSsq-ZZX.js';
import './index3-CAcP0rrB.js';
import './preferences-D1AoFYVw.js';

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
//# sourceMappingURL=_layout.svelte-DCp3us3T.js.map
