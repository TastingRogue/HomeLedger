import { h as head, e as escape_html, k as store_get, f as attr_class, u as unsubscribe_stores, F as FILENAME } from './index.js-Cfqnfdcp.js';
import { t } from './index3-DFhiUyyP.js';
import { p as push_element, a as pop_element } from './dev-C7XYrjSr.js';
import './preferences-Bbo4WnW7.js';

_page[FILENAME] = "src/routes/(app)/importar/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let step = 1;
      let activeTab = "import";
      let dragging = false;
      head("1dtdlpe", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-1dtdlpe">`);
      push_element($$renderer2, "div", 166, 0);
      $$renderer2.push(`<header class="page-header svelte-1dtdlpe">`);
      push_element($$renderer2, "header", 167, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 168, 4);
      $$renderer2.push(`<h1 class="svelte-1dtdlpe">`);
      push_element($$renderer2, "h1", 169, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-1dtdlpe">`);
      push_element($$renderer2, "p", 170, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` <div class="tabs svelte-1dtdlpe">`);
      push_element($$renderer2, "div", 175, 2);
      $$renderer2.push(`<button${attr_class("tab svelte-1dtdlpe", void 0, { "active": activeTab === "import" })}>`);
      push_element($$renderer2, "button", 176, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tab_import"))}</button>`);
      pop_element();
      $$renderer2.push(` <button${attr_class("tab svelte-1dtdlpe", void 0, { "active": activeTab === "export" })}>`);
      push_element($$renderer2, "button", 177, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tab_export"))}</button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="steps svelte-1dtdlpe">`);
        push_element($$renderer2, "div", 201, 2);
        $$renderer2.push(`<div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 1, "done": step > 1 })}>`);
        push_element($$renderer2, "div", 202, 4);
        $$renderer2.push(`<span class="step-num svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 203, 6);
        $$renderer2.push(`1</span>`);
        pop_element();
        $$renderer2.push(` <span class="step-label svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 204, 6);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_file"))}</span>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <div${attr_class("step-line svelte-1dtdlpe", void 0, { "done": step > 1 })}>`);
        push_element($$renderer2, "div", 206, 4);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 2, "done": step > 2 })}>`);
        push_element($$renderer2, "div", 207, 4);
        $$renderer2.push(`<span class="step-num svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 208, 6);
        $$renderer2.push(`2</span>`);
        pop_element();
        $$renderer2.push(` <span class="step-label svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 209, 6);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_review"))}</span>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <div${attr_class("step-line svelte-1dtdlpe", void 0, { "done": step > 2 })}>`);
        push_element($$renderer2, "div", 211, 4);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 3 })}>`);
        push_element($$renderer2, "div", 212, 4);
        $$renderer2.push(`<span class="step-num svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 213, 6);
        $$renderer2.push(`3</span>`);
        pop_element();
        $$renderer2.push(` <span class="step-label svelte-1dtdlpe">`);
        push_element($$renderer2, "span", 214, 6);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_result"))}</span>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` `);
        {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div${attr_class("drop-zone svelte-1dtdlpe", void 0, { "dragging": dragging })} role="button" tabindex="0">`);
          push_element($$renderer2, "div", 220, 4);
          $$renderer2.push(`<div class="drop-icon svelte-1dtdlpe">`);
          push_element($$renderer2, "div", 229, 6);
          $$renderer2.push(`📂</div>`);
          pop_element();
          $$renderer2.push(` <p class="drop-title svelte-1dtdlpe">`);
          push_element($$renderer2, "p", 230, 6);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.drop_title"))}</p>`);
          pop_element();
          $$renderer2.push(` <p class="drop-subtitle svelte-1dtdlpe">`);
          push_element($$renderer2, "p", 231, 6);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.drop_subtitle"))}</p>`);
          pop_element();
          $$renderer2.push(` <label class="file-btn svelte-1dtdlpe">`);
          push_element($$renderer2, "label", 232, 6);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.select_file"))} <input type="file" accept=".csv,.xlsx,.xls,.ofx,.qif,.json" hidden=""/>`);
          push_element($$renderer2, "input", 234, 8);
          pop_element();
          $$renderer2.push(`</label>`);
          pop_element();
          $$renderer2.push(` <p class="drop-formats svelte-1dtdlpe">`);
          push_element($$renderer2, "p", 236, 6);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.formats"))}</p>`);
          pop_element();
          $$renderer2.push(`</div>`);
          pop_element();
          $$renderer2.push(` `);
          {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--> <div class="info-card svelte-1dtdlpe">`);
          push_element($$renderer2, "div", 243, 4);
          $$renderer2.push(`<h4 class="svelte-1dtdlpe">`);
          push_element($$renderer2, "h4", 244, 6);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tips_title"))}</h4>`);
          pop_element();
          $$renderer2.push(` <ul class="svelte-1dtdlpe">`);
          push_element($$renderer2, "ul", 245, 6);
          $$renderer2.push(`<li class="svelte-1dtdlpe">`);
          push_element($$renderer2, "li", 246, 8);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_columns"))}</li>`);
          pop_element();
          $$renderer2.push(` <li class="svelte-1dtdlpe">`);
          push_element($$renderer2, "li", 247, 8);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_duplicates"))}</li>`);
          pop_element();
          $$renderer2.push(` <li class="svelte-1dtdlpe">`);
          push_element($$renderer2, "li", 248, 8);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_safe"))}</li>`);
          pop_element();
          $$renderer2.push(` <li class="svelte-1dtdlpe">`);
          push_element($$renderer2, "li", 249, 8);
          $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_restore"))}</li>`);
          pop_element();
          $$renderer2.push(`</ul>`);
          pop_element();
          $$renderer2.push(`</div>`);
          pop_element();
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
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
//# sourceMappingURL=_page.svelte-BP1LWpEN.js.map
