import { f as attr_class, e as escape_html, m as bind_props, l as derived, k as store_get, F as FILENAME, u as unsubscribe_stores } from './index.js-d7AbrnM1.js';
import { t } from './index3-75NATqbY.js';
import './preferences-DzkHsNm-.js';
import { p as push_element, a as pop_element } from './dev-D3dQJW43.js';

DatePicker[FILENAME] = "src/lib/components/DatePicker.svelte";
function DatePicker($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let { value = void 0, showTime = false } = $$props;
      let open = false;
      (/* @__PURE__ */ new Date()).getFullYear();
      (/* @__PURE__ */ new Date()).getMonth();
      let selectedDate = derived(() => {
        if (!value) return null;
        return new Date(value);
      });
      let displayText = derived(() => {
        if (!selectedDate()) return store_get($$store_subs ??= {}, "$t", t)("datepicker.select_date");
        const d = selectedDate();
        const date = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
        if (showTime) {
          const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return `${date} ${time}`;
        }
        return date;
      });
      $$renderer2.push(`<div${attr_class("datepicker svelte-zmry26", void 0, { "open": open })}>`);
      push_element($$renderer2, "div", 145, 0);
      $$renderer2.push(`<button class="dp-trigger svelte-zmry26" type="button">`);
      push_element($$renderer2, "button", 146, 2);
      $$renderer2.push(`<span class="dp-text svelte-zmry26">`);
      push_element($$renderer2, "span", 147, 4);
      $$renderer2.push(`${escape_html(displayText())}</span>`);
      pop_element();
      $$renderer2.push(` <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`);
      push_element($$renderer2, "svg", 148, 4);
      $$renderer2.push(`<rect x="3" y="4" width="18" height="18" rx="2">`);
      push_element($$renderer2, "rect", 148, 103);
      $$renderer2.push(`</rect>`);
      pop_element();
      $$renderer2.push(`<line x1="16" y1="2" x2="16" y2="6">`);
      push_element($$renderer2, "line", 148, 152);
      $$renderer2.push(`</line>`);
      pop_element();
      $$renderer2.push(`<line x1="8" y1="2" x2="8" y2="6">`);
      push_element($$renderer2, "line", 148, 189);
      $$renderer2.push(`</line>`);
      pop_element();
      $$renderer2.push(`<line x1="3" y1="10" x2="21" y2="10">`);
      push_element($$renderer2, "line", 148, 224);
      $$renderer2.push(`</line>`);
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
      if ($$store_subs) unsubscribe_stores($$store_subs);
      bind_props($$props, { value });
    },
    DatePicker
  );
}
DatePicker.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { DatePicker as D };
//# sourceMappingURL=DatePicker-DFkdeRuq.js.map
