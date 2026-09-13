import { h as head, e as escape_html, k as store_get, f as attr_class, d as attr, l as derived, F as FILENAME, u as unsubscribe_stores } from './index.js-XWaMFQMt.js';
import { p as push_element, a as pop_element } from './dev-Bz53WfQq.js';
import './client-D8Hp2LBH.js';
import { D as Dropdown } from './Dropdown-pAPhlfJo.js';
import { D as DatePicker } from './DatePicker-DmRTRViP.js';
import { t } from './index3-DGyXqAF7.js';
import './preferences-Cesmdl1S.js';

_page[FILENAME] = "src/routes/(app)/transacciones/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let accounts = [];
      let categories = [];
      let filterAccountId = "";
      let filterCategoryId = "";
      let filterStartDate = "";
      let filterEndDate = "";
      let accountOptions = derived(() => [
        { value: "", label: "Todas" },
        ...accounts.map((a) => ({ value: String(a.id), label: a.name }))
      ]);
      let categoryOptions = derived(() => [
        { value: "", label: "Todas" },
        ...categories.map((c) => ({ value: String(c.id), label: c.name }))
      ]);
      let viewMode = "gallery";
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("mzpq19", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.title"))} | HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-mzpq19">`);
        push_element($$renderer3, "div", 408, 0);
        $$renderer3.push(`<header class="page-header svelte-mzpq19">`);
        push_element($$renderer3, "header", 409, 2);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 410, 4);
        $$renderer3.push(`<h1 class="svelte-mzpq19">`);
        push_element($$renderer3, "h1", 411, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.title"))}</h1>`);
        pop_element();
        $$renderer3.push(` <p class="page-subtitle svelte-mzpq19">`);
        push_element($$renderer3, "p", 412, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <div class="header-actions svelte-mzpq19">`);
        push_element($$renderer3, "div", 414, 4);
        $$renderer3.push(`<div class="view-toggle svelte-mzpq19">`);
        push_element($$renderer3, "div", 415, 6);
        $$renderer3.push(`<button${attr_class("toggle-btn svelte-mzpq19", void 0, { "active": viewMode === "table" })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("transactions.view_table"))}>`);
        push_element($$renderer3, "button", 416, 8);
        $$renderer3.push(`📋</button>`);
        pop_element();
        $$renderer3.push(` <button${attr_class("toggle-btn svelte-mzpq19", void 0, { "active": viewMode === "gallery" })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("transactions.view_gallery"))}>`);
        push_element($$renderer3, "button", 417, 8);
        $$renderer3.push(`🃏</button>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` <button class="btn-new svelte-mzpq19">`);
        push_element($$renderer3, "button", 419, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.new"))}</button>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` <div class="filters-bar svelte-mzpq19">`);
        push_element($$renderer3, "div", 424, 2);
        $$renderer3.push(`<div class="filter-item svelte-mzpq19">`);
        push_element($$renderer3, "div", 425, 4);
        $$renderer3.push(`<span class="filter-label svelte-mzpq19">`);
        push_element($$renderer3, "span", 426, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_account"))}</span>`);
        pop_element();
        $$renderer3.push(` `);
        Dropdown($$renderer3, {
          options: accountOptions(),
          get value() {
            return filterAccountId;
          },
          set value($$value) {
            filterAccountId = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div>`);
        pop_element();
        $$renderer3.push(` <div class="filter-item svelte-mzpq19">`);
        push_element($$renderer3, "div", 429, 4);
        $$renderer3.push(`<span class="filter-label svelte-mzpq19">`);
        push_element($$renderer3, "span", 430, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_category"))}</span>`);
        pop_element();
        $$renderer3.push(` `);
        Dropdown($$renderer3, {
          options: categoryOptions(),
          get value() {
            return filterCategoryId;
          },
          set value($$value) {
            filterCategoryId = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div>`);
        pop_element();
        $$renderer3.push(` <div class="filter-item svelte-mzpq19">`);
        push_element($$renderer3, "div", 433, 4);
        $$renderer3.push(`<span class="filter-label svelte-mzpq19">`);
        push_element($$renderer3, "span", 434, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_from"))}</span>`);
        pop_element();
        $$renderer3.push(` `);
        DatePicker($$renderer3, {
          get value() {
            return filterStartDate;
          },
          set value($$value) {
            filterStartDate = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div>`);
        pop_element();
        $$renderer3.push(` <div class="filter-item svelte-mzpq19">`);
        push_element($$renderer3, "div", 437, 4);
        $$renderer3.push(`<span class="filter-label svelte-mzpq19">`);
        push_element($$renderer3, "span", 438, 6);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_to"))}</span>`);
        pop_element();
        $$renderer3.push(` `);
        DatePicker($$renderer3, {
          get value() {
            return filterEndDate;
          },
          set value($$value) {
            filterEndDate = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----></div>`);
        pop_element();
        $$renderer3.push(` <button class="btn-filter svelte-mzpq19">`);
        push_element($$renderer3, "button", 441, 4);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.filter"))}</button>`);
        pop_element();
        $$renderer3.push(` `);
        if (filterAccountId || filterCategoryId || filterStartDate || filterEndDate) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<button class="btn-clear svelte-mzpq19">`);
          push_element($$renderer3, "button", 443, 6);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.clear_filters"))}</button>`);
          pop_element();
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="state-msg svelte-mzpq19">`);
          push_element($$renderer3, "div", 452, 4);
          $$renderer3.push(`<div class="spinner svelte-mzpq19">`);
          push_element($$renderer3, "div", 452, 27);
          $$renderer3.push(`</div>`);
          pop_element();
          $$renderer3.push(`<span>`);
          push_element($$renderer3, "span", 452, 54);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span>`);
          pop_element();
          $$renderer3.push(`</div>`);
          pop_element();
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
      do {
        $$settled = true;
        $$inner_renderer = $$renderer2.copy();
        $$render_inner($$inner_renderer);
      } while (!$$settled);
      $$renderer2.subsume($$inner_renderer);
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-BOUJfEl0.js.map
