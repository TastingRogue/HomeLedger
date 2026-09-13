import { f as attr_class, e as escape_html, m as bind_props, l as derived, F as FILENAME } from './index.js-sLDRIdyD.js';
import { p as push_element, a as pop_element } from './dev-D0OGkwgZ.js';

Dropdown[FILENAME] = "src/lib/components/Dropdown.svelte";
function Dropdown($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { value = void 0, options } = $$props;
      let open = false;
      let currentLabel = derived(() => options.find((o) => o.value === value)?.label ?? "");
      $$renderer2.push(`<div${attr_class("dropdown svelte-1fd3ybn", void 0, { "open": open })}>`);
      push_element($$renderer2, "div", 27, 0);
      $$renderer2.push(`<button class="dropdown-trigger svelte-1fd3ybn" type="button">`);
      push_element($$renderer2, "button", 28, 2);
      $$renderer2.push(`<span>`);
      push_element($$renderer2, "span", 29, 4);
      $$renderer2.push(`${escape_html(currentLabel())}</span>`);
      pop_element();
      $$renderer2.push(` <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">`);
      push_element($$renderer2, "svg", 30, 4);
      $$renderer2.push(`<polyline points="6 9 12 15 18 9">`);
      push_element($$renderer2, "polyline", 30, 105);
      $$renderer2.push(`</polyline>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      bind_props($$props, { value });
    },
    Dropdown
  );
}
Dropdown.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { Dropdown as D };
//# sourceMappingURL=Dropdown-BWyaurzr.js.map
