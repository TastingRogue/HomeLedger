import { h as head, e as escape_html, s as store_get, i as attr_class, b as attr, k as bind_props, c as derived, u as unsubscribe_stores } from './index.js-BfLmu_lo.js';
import './state.svelte-CJ7U5EM5.js';
import { t } from './index3-DyOSNu1Q.js';

/* empty css                                                          */
function DatePicker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    $$renderer2.push(`<div${attr_class("datepicker svelte-zmry26", void 0, { "open": open })}><button class="dp-trigger svelte-zmry26" type="button"><span class="dp-text svelte-zmry26">${escape_html(displayText())}</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { value });
  });
}
function Dropdown($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, options } = $$props;
    let open = false;
    let currentLabel = derived(() => options.find((o) => o.value === value)?.label ?? "");
    $$renderer2.push(`<div${attr_class("dropdown svelte-1fd3ybn", void 0, { "open": open })}><button class="dropdown-trigger svelte-1fd3ybn" type="button"><span>${escape_html(currentLabel())}</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg></button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
      $$renderer3.push(`<div class="page svelte-mzpq19"><header class="page-header svelte-mzpq19"><div><h1 class="svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.title"))}</h1> <p class="page-subtitle svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.subtitle"))}</p></div> <div class="header-actions svelte-mzpq19"><div class="view-toggle svelte-mzpq19"><button${attr_class("toggle-btn svelte-mzpq19", void 0, { "active": viewMode === "table" })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("transactions.view_table"))}>📋</button> <button${attr_class("toggle-btn svelte-mzpq19", void 0, { "active": viewMode === "gallery" })}${attr("title", store_get($$store_subs ??= {}, "$t", t)("transactions.view_gallery"))}>🃏</button></div> <button class="btn-new svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.new"))}</button></div></header> <div class="filters-bar svelte-mzpq19"><div class="filter-item svelte-mzpq19"><span class="filter-label svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_account"))}</span> `);
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
      $$renderer3.push(`<!----></div> <div class="filter-item svelte-mzpq19"><span class="filter-label svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_category"))}</span> `);
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
      $$renderer3.push(`<!----></div> <div class="filter-item svelte-mzpq19"><span class="filter-label svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_from"))}</span> `);
      DatePicker($$renderer3, {
        get value() {
          return filterStartDate;
        },
        set value($$value) {
          filterStartDate = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <div class="filter-item svelte-mzpq19"><span class="filter-label svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.filter_to"))}</span> `);
      DatePicker($$renderer3, {
        get value() {
          return filterEndDate;
        },
        set value($$value) {
          filterEndDate = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <button class="btn-filter svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.filter"))}</button> `);
      if (filterAccountId || filterCategoryId || filterStartDate || filterEndDate) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<button class="btn-clear svelte-mzpq19">${escape_html(store_get($$store_subs ??= {}, "$t", t)("transactions.clear_filters"))}</button>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="state-msg svelte-mzpq19"><div class="spinner svelte-mzpq19"></div><span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</span></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div> `);
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
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B2sNtJUW.js.map
