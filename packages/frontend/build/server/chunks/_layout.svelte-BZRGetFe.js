import { F as FILENAME } from './index.js-BdTlLWS6.js';
import { p as push_element, a as pop_element } from './dev-DJl73A3u.js';
import './client-hHqrbqfa.js';
import './Icon-BFV3YSfe.js';
import './index3-CficrprS.js';
import './preferences-CYRQv9pk.js';

_layout[FILENAME] = "src/routes/(app)/+layout.svelte";
function _layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { children } = $$props;
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="auth-check svelte-1v2axqk">`);
        push_element($$renderer2, "div", 152, 2);
        $$renderer2.push(`<div class="auth-spinner svelte-1v2axqk">`);
        push_element($$renderer2, "div", 153, 4);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p>`);
        push_element($$renderer2, "p", 154, 4);
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
//# sourceMappingURL=_layout.svelte-BZRGetFe.js.map
