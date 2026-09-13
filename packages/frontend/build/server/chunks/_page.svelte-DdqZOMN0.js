import { h as head, e as escape_html, s as store_get, b as attr, u as unsubscribe_stores } from './index.js-BUlOpdAs.js';
import { t } from './index3-CVOpDVGn.js';
import './preferences-Coh8sdFN.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let rules = [];
    head("9vg81e", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.rules"))} · HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="page svelte-9vg81e"><header class="header svelte-9vg81e"><div><p class="eyebrow svelte-9vg81e">${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_eyebrow"))}</p> <h1 class="svelte-9vg81e">${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_title"))}</h1> <p class="subtitle svelte-9vg81e">${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.page_subtitle"))}</p></div> <div class="header-actions svelte-9vg81e"><button class="btn-secondary svelte-9vg81e"${attr("disabled", rules.length === 0, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.apply"))}</button> <button class="btn-new svelte-9vg81e">${escape_html(store_get($$store_subs ??= {}, "$t", t)("rules.new"))}</button></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-9vg81e">…</div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DdqZOMN0.js.map
