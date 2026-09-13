import { F as FILENAME } from './index.js-RVubsg0d.js';
import { p as push_element, a as pop_element } from './dev-sawXHLeR.js';

_layout[FILENAME] = "src/routes/login/+layout.svelte";
function _layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { children } = $$props;
      $$renderer2.push(`<div class="auth-layout svelte-b7w73z">`);
      push_element($$renderer2, "div", 7, 0);
      children($$renderer2);
      $$renderer2.push(`<!----></div>`);
      pop_element();
    },
    _layout
  );
}
_layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _layout as default };
//# sourceMappingURL=_layout.svelte-LaR-_vKv.js.map
