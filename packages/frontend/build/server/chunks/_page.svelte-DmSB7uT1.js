import { h as head, e as escape_html, k as store_get, d as attr, F as FILENAME, u as unsubscribe_stores } from './index.js-Ckl2DFin.js';
import { p as push_element, a as pop_element } from './dev-Dg4Nx9-9.js';
import './DatePicker-BOD70hGd.js';
import { t } from './index3-CAcP0rrB.js';
import './preferences-D1AoFYVw.js';

_page[FILENAME] = "src/routes/(app)/recibos/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let receipts = [];
      let attachments = [];
      let loading = true;
      let search = "";
      let uploading = false;
      let $$settled = true;
      let $$inner_renderer;
      function $$render_inner($$renderer3) {
        head("4k76zl", $$renderer3, ($$renderer4) => {
          $$renderer4.title(($$renderer5) => {
            $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.receipts"))} · HomeLedger</title>`);
          });
        });
        $$renderer3.push(`<div class="page svelte-4k76zl">`);
        push_element($$renderer3, "div", 96, 0);
        $$renderer3.push(`<header class="header svelte-4k76zl">`);
        push_element($$renderer3, "header", 96, 18);
        $$renderer3.push(`<div>`);
        push_element($$renderer3, "div", 96, 41);
        $$renderer3.push(`<p class="eyebrow svelte-4k76zl">`);
        push_element($$renderer3, "p", 96, 46);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_eyebrow"))}</p>`);
        pop_element();
        $$renderer3.push(`<h1 class="svelte-4k76zl">`);
        push_element($$renderer3, "h1", 96, 98);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_title"))}</h1>`);
        pop_element();
        $$renderer3.push(`<p class="subtitle svelte-4k76zl">`);
        push_element($$renderer3, "p", 96, 134);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.page_subtitle"))}</p>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`<div class="stats svelte-4k76zl">`);
        push_element($$renderer3, "div", 96, 194);
        $$renderer3.push(`<span class="svelte-4k76zl">`);
        push_element($$renderer3, "span", 96, 213);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_analyzed", { n: receipts.length }))}</span>`);
        pop_element();
        $$renderer3.push(`<span class="svelte-4k76zl">`);
        push_element($$renderer3, "span", 96, 276);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.stat_attachments", { n: attachments.length }))}</span>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(`</header>`);
        pop_element();
        $$renderer3.push(` <div class="toolbar svelte-4k76zl">`);
        push_element($$renderer3, "div", 97, 0);
        $$renderer3.push(`<input${attr("value", search)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("receipts.search_placeholder"))} class="svelte-4k76zl"/>`);
        push_element($$renderer3, "input", 97, 21);
        pop_element();
        $$renderer3.push(`<button class="secondary svelte-4k76zl"${attr("disabled", loading, true)}>`);
        push_element($$renderer3, "button", 97, 97);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.refresh"))}</button>`);
        pop_element();
        $$renderer3.push(`<button class="upload-btn svelte-4k76zl"${attr("disabled", uploading, true)}>`);
        push_element($$renderer3, "button", 97, 190);
        $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.upload"))}</button>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <section class="table-card svelte-4k76zl">`);
        push_element($$renderer3, "section", 99, 0);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="empty svelte-4k76zl">`);
          push_element($$renderer3, "div", 99, 41);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("receipts.loading"))}</div>`);
          pop_element();
        }
        $$renderer3.push(`<!--]--></section>`);
        pop_element();
        $$renderer3.push(`</div>`);
        pop_element();
        $$renderer3.push(` `);
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
//# sourceMappingURL=_page.svelte-DmSB7uT1.js.map
