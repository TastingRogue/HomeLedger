import { s as store_get, u as unsubscribe_stores, h as head, e as escape_html } from './index.js-BauISpZi.js';
import { t } from './index3-BlqbYrwr.js';
import './theme-B6M7uWfX.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    [
      {
        value: "today",
        label: store_get($$store_subs ??= {}, "$t", t)("dashboard.period_today")
      },
      {
        value: "week",
        label: store_get($$store_subs ??= {}, "$t", t)("dashboard.period_week")
      },
      {
        value: "month",
        label: store_get($$store_subs ??= {}, "$t", t)("dashboard.period_month")
      }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1tyszyy", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("nav.dashboard"))} - HomeLedger</title>`);
        });
      });
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="loading svelte-1tyszyy"><div class="spinner svelte-1tyszyy"></div><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</p></div>`);
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
//# sourceMappingURL=_page.svelte-CsHpeF2S.js.map
