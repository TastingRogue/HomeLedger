import { k as store_get, u as unsubscribe_stores, h as head, e as escape_html, F as FILENAME } from './index.js-sLDRIdyD.js';
import { p as push_element, a as pop_element } from './dev-D0OGkwgZ.js';
import './Dropdown-BWyaurzr.js';
import './DatePicker-CCLClktZ.js';
import './Icon-uqqnnUNS.js';
import { t } from './index3-CvX21c1v.js';
import './index-client-Dyi5mbLx.js';
import './preferences-BhVg4Jeq.js';
import './theme-MGSyDij9.js';

_page[FILENAME] = "src/routes/(app)/dashboard/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
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
          $$renderer3.push(`<div class="loading svelte-1tyszyy">`);
          push_element($$renderer3, "div", 661, 2);
          $$renderer3.push(`<div class="spinner svelte-1tyszyy">`);
          push_element($$renderer3, "div", 661, 23);
          $$renderer3.push(`</div>`);
          pop_element();
          $$renderer3.push(`<p>`);
          push_element($$renderer3, "p", 661, 50);
          $$renderer3.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.loading"))}</p>`);
          pop_element();
          $$renderer3.push(`</div>`);
          pop_element();
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
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-DMkNzLoI.js.map
