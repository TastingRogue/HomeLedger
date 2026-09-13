import { k as store_get, h as head, e as escape_html, d as attr, u as unsubscribe_stores, l as derived, F as FILENAME } from './index.js-Ckl2DFin.js';
import { p as push_element, a as pop_element } from './dev-Dg4Nx9-9.js';
import { t } from './index3-CAcP0rrB.js';
import './preferences-D1AoFYVw.js';

_page[FILENAME] = "src/routes/(app)/alertas/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let alerts = [];
      let markingAll = false;
      let filterType = "all";
      let filterRead = "all";
      ({
        balance_low: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.type_balance_low")
        },
        credit_high: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.type_credit_high")
        },
        payment_due: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.type_payment_due")
        },
        payment_overdue: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.type_payment_overdue")
        },
        goal_completed: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.type_goal_completed")
        }
      });
      ({
        warning: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.severity_warning")
        },
        critical: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.severity_critical")
        },
        info: {
          label: store_get($$store_subs ??= {}, "$t", t)("alerts.severity_info")
        }
      });
      let unreadCount = derived(() => alerts.filter((a) => !a.isRead).length);
      let evaluating = false;
      head("6j7d7g", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="page svelte-6j7d7g">`);
      push_element($$renderer2, "div", 230, 0);
      $$renderer2.push(`<header class="page-header svelte-6j7d7g">`);
      push_element($$renderer2, "header", 231, 2);
      $$renderer2.push(`<div class="header-left svelte-6j7d7g">`);
      push_element($$renderer2, "div", 232, 4);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 233, 6);
      $$renderer2.push(`<h1 class="svelte-6j7d7g">`);
      push_element($$renderer2, "h1", 234, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.title"))}</h1>`);
      pop_element();
      $$renderer2.push(` <p class="page-subtitle svelte-6j7d7g">`);
      push_element($$renderer2, "p", 235, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.subtitle"))}</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      if (unreadCount() > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="unread-badge svelte-6j7d7g">`);
        push_element($$renderer2, "span", 238, 8);
        $$renderer2.push(`${escape_html(unreadCount())}</span>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="header-actions svelte-6j7d7g">`);
      push_element($$renderer2, "div", 241, 4);
      $$renderer2.push(`<button class="btn btn-secondary svelte-6j7d7g"${attr("disabled", evaluating, true)}>`);
      push_element($$renderer2, "button", 242, 6);
      $$renderer2.push(`${escape_html(`🔄 ${store_get($$store_subs ??= {}, "$t", t)("alerts.evaluate_now")}`)}</button>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (unreadCount() > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="btn btn-primary svelte-6j7d7g"${attr("disabled", markingAll, true)}>`);
        push_element($$renderer2, "button", 247, 8);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.mark_all_read"))}</button>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` <div class="filters svelte-6j7d7g">`);
      push_element($$renderer2, "div", 255, 2);
      $$renderer2.select(
        {
          value: filterType,
          "aria-label": store_get($$store_subs ??= {}, "$t", t)("common.filter"),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "all" }, ($$renderer4) => {
            push_element($$renderer4, "option", 257, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_type_all"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "balance_low" }, ($$renderer4) => {
            push_element($$renderer4, "option", 258, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_balance_low"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "credit_high" }, ($$renderer4) => {
            push_element($$renderer4, "option", 259, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_credit_high"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "payment_due" }, ($$renderer4) => {
            push_element($$renderer4, "option", 260, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_payment_due"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "payment_overdue" }, ($$renderer4) => {
            push_element($$renderer4, "option", 261, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_payment_overdue"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "goal_completed" }, ($$renderer4) => {
            push_element($$renderer4, "option", 262, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_goal_completed"))}`);
            pop_element();
          });
        },
        "svelte-6j7d7g"
      );
      $$renderer2.push(` `);
      $$renderer2.select(
        {
          value: filterRead,
          "aria-label": store_get($$store_subs ??= {}, "$t", t)("common.filter"),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "all" }, ($$renderer4) => {
            push_element($$renderer4, "option", 265, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_status_all"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "unread" }, ($$renderer4) => {
            push_element($$renderer4, "option", 266, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_unread"))}`);
            pop_element();
          });
          $$renderer3.option({ value: "read" }, ($$renderer4) => {
            push_element($$renderer4, "option", 267, 6);
            $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_read"))}`);
            pop_element();
          });
        },
        "svelte-6j7d7g"
      );
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="state-msg svelte-6j7d7g">`);
        push_element($$renderer2, "div", 272, 4);
        $$renderer2.push(`<p>`);
        push_element($$renderer2, "p", 272, 27);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.loading"))}</p>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
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
//# sourceMappingURL=_page.svelte-d0d_xYT7.js.map
