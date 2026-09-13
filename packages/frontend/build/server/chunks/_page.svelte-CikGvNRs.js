import { h as head, e as escape_html, k as store_get, d as attr, u as unsubscribe_stores, F as FILENAME } from './index.js-BF_FUX1N.js';
import { p as push_element, a as pop_element } from './dev-Bd-ACfmU.js';
import { t } from './index3-GLowYSS2.js';
import './preferences-BvhJpYwi.js';

_page[FILENAME] = "src/routes/(app)/respaldo/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let exporting = false;
      head("1kf85nq", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.backup"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-1kf85nq">`);
      push_element($$renderer2, "div", 136, 0);
      $$renderer2.push(`<header class="page-header svelte-1kf85nq">`);
      push_element($$renderer2, "header", 137, 2);
      $$renderer2.push(`<h1 class="svelte-1kf85nq">`);
      push_element($$renderer2, "h1", 138, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.title"))}</h1>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="actions-row svelte-1kf85nq">`);
      push_element($$renderer2, "div", 155, 2);
      $$renderer2.push(`<button class="action-btn export-btn svelte-1kf85nq"${attr("disabled", exporting, true)}>`);
      push_element($$renderer2, "button", 156, 4);
      $$renderer2.push(`<span class="action-icon svelte-1kf85nq">`);
      push_element($$renderer2, "span", 157, 6);
      $$renderer2.push(`↓</span>`);
      pop_element();
      $$renderer2.push(` <span class="action-text svelte-1kf85nq">`);
      push_element($$renderer2, "span", 158, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.export_btn"))}</span>`);
      pop_element();
      $$renderer2.push(` <span class="action-desc svelte-1kf85nq">`);
      push_element($$renderer2, "span", 159, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.export_desc"))}</span>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(` <label class="action-btn import-btn svelte-1kf85nq" for="file-input">`);
      push_element($$renderer2, "label", 162, 4);
      $$renderer2.push(`<span class="action-icon svelte-1kf85nq">`);
      push_element($$renderer2, "span", 163, 6);
      $$renderer2.push(`↑</span>`);
      pop_element();
      $$renderer2.push(` <span class="action-text svelte-1kf85nq">`);
      push_element($$renderer2, "span", 164, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.import_btn"))}</span>`);
      pop_element();
      $$renderer2.push(` <span class="action-desc svelte-1kf85nq">`);
      push_element($$renderer2, "span", 165, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.import_desc"))}</span>`);
      pop_element();
      $$renderer2.push(`</label>`);
      pop_element();
      $$renderer2.push(` <input type="file" id="file-input" accept=".json,application/json" class="file-input svelte-1kf85nq"/>`);
      push_element($$renderer2, "input", 167, 4);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <section class="section svelte-1kf85nq">`);
      push_element($$renderer2, "section", 200, 2);
      $$renderer2.push(`<h2 class="section-title svelte-1kf85nq">`);
      push_element($$renderer2, "h2", 201, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.history_title"))}</h2>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="loading-msg svelte-1kf85nq">`);
        push_element($$renderer2, "p", 203, 6);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("backup.loading_history"))}</p>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></section>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-CikGvNRs.js.map
