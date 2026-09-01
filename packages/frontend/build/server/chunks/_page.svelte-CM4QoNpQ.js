import { h as head, e as escape_html, s as store_get, f as attr_class, u as unsubscribe_stores } from './index.js-DpxZscsS.js';
import { t } from './index3-CiwRTOnw.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let step = 1;
    let activeTab = "import";
    let dragging = false;
    head("1dtdlpe", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.title"))} - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-1dtdlpe"><header class="page-header svelte-1dtdlpe"><div><h1 class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.title"))}</h1> <p class="page-subtitle svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.subtitle"))}</p></div></header> <div class="tabs svelte-1dtdlpe"><button${attr_class("tab svelte-1dtdlpe", void 0, { "active": activeTab === "import" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tab_import"))}</button> <button${attr_class("tab svelte-1dtdlpe", void 0, { "active": activeTab === "export" })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tab_export"))}</button></div> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="steps svelte-1dtdlpe"><div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 1, "done": step > 1 })}><span class="step-num svelte-1dtdlpe">1</span> <span class="step-label svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_file"))}</span></div> <div${attr_class("step-line svelte-1dtdlpe", void 0, { "done": step > 1 })}></div> <div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 2, "done": step > 2 })}><span class="step-num svelte-1dtdlpe">2</span> <span class="step-label svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_review"))}</span></div> <div${attr_class("step-line svelte-1dtdlpe", void 0, { "done": step > 2 })}></div> <div${attr_class("step svelte-1dtdlpe", void 0, { "active": step >= 3 })}><span class="step-num svelte-1dtdlpe">3</span> <span class="step-label svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.step_result"))}</span></div></div> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div${attr_class("drop-zone svelte-1dtdlpe", void 0, { "dragging": dragging })} role="button" tabindex="0"><div class="drop-icon svelte-1dtdlpe">📂</div> <p class="drop-title svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.drop_title"))}</p> <p class="drop-subtitle svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.drop_subtitle"))}</p> <label class="file-btn svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.select_file"))} <input type="file" accept=".csv,.xlsx,.xls,.ofx,.qif,.json" hidden=""/></label> <p class="drop-formats svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.formats"))}</p></div> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="info-card svelte-1dtdlpe"><h4 class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tips_title"))}</h4> <ul class="svelte-1dtdlpe"><li class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_columns"))}</li> <li class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_duplicates"))}</li> <li class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_safe"))}</li> <li class="svelte-1dtdlpe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("import.tip_restore"))}</li></ul></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CM4QoNpQ.js.map
