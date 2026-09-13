import { F as FILENAME } from './index.js-sLDRIdyD.js';
import { p as push_element, a as pop_element } from './dev-D0OGkwgZ.js';
import './client-BgtQG1sy.js';

_page[FILENAME] = "src/routes/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      $$renderer2.push(`<div class="loading-screen svelte-1uha8ag">`);
      push_element($$renderer2, "div", 15, 0);
      $$renderer2.push(`<p>`);
      push_element($$renderer2, "p", 16, 2);
      $$renderer2.push(`Cargando...</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-C9Mcq3US.js.map
