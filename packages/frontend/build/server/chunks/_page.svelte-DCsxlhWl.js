import { s as store_get, h as head, e as escape_html, b as attr, u as unsubscribe_stores, c as derived } from './index.js-DA23evTO.js';
import { t } from './index3-B0LpGBzh.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    $$renderer2.push(`<div class="page svelte-6j7d7g"><header class="page-header svelte-6j7d7g"><div class="header-left svelte-6j7d7g"><div><h1 class="svelte-6j7d7g">${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.title"))}</h1> <p class="page-subtitle svelte-6j7d7g">${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.subtitle"))}</p></div> `);
    if (unreadCount() > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="unread-badge svelte-6j7d7g">${escape_html(unreadCount())}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="header-actions svelte-6j7d7g"><button class="btn btn-secondary svelte-6j7d7g"${attr("disabled", evaluating, true)}>${escape_html(`🔄 ${store_get($$store_subs ??= {}, "$t", t)("alerts.evaluate_now")}`)}</button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (unreadCount() > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="btn btn-primary svelte-6j7d7g"${attr("disabled", markingAll, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.mark_all_read"))}</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></header> <div class="filters svelte-6j7d7g">`);
    $$renderer2.select(
      {
        value: filterType,
        "aria-label": store_get($$store_subs ??= {}, "$t", t)("common.filter"),
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_type_all"))}`);
        });
        $$renderer3.option({ value: "balance_low" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_balance_low"))}`);
        });
        $$renderer3.option({ value: "credit_high" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_credit_high"))}`);
        });
        $$renderer3.option({ value: "payment_due" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_payment_due"))}`);
        });
        $$renderer3.option({ value: "payment_overdue" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_payment_overdue"))}`);
        });
        $$renderer3.option({ value: "goal_completed" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_goal_completed"))}`);
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
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_status_all"))}`);
        });
        $$renderer3.option({ value: "unread" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_unread"))}`);
        });
        $$renderer3.option({ value: "read" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.filter_read"))}`);
        });
      },
      "svelte-6j7d7g"
    );
    $$renderer2.push(`</div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-6j7d7g"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("alerts.loading"))}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DCsxlhWl.js.map
