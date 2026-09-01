import { h as head, e as escape_html, s as store_get, f as attr_class, b as attr, i as clsx, u as unsubscribe_stores } from './index.js-DpxZscsS.js';
import { c as currencyConfig, t } from './index3-CiwRTOnw.js';

function Icon($$renderer, $$props) {
  let { name, size = 16, class: className = "" } = $$props;
  $$renderer.push(`<svg${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${attr_class(clsx(className))}>`);
  if (name === "gem") {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path>`);
  } else if (name === "wallet") {
    $$renderer.push("<!--[1-->");
    $$renderer.push(`<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a1 1 0 0 0 0 4h4v-4z"></path>`);
  } else if (name === "trending-up") {
    $$renderer.push("<!--[2-->");
    $$renderer.push(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>`);
  } else if (name === "trending-down") {
    $$renderer.push("<!--[3-->");
    $$renderer.push(`<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline>`);
  } else if (name === "pie-chart") {
    $$renderer.push("<!--[4-->");
    $$renderer.push(`<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>`);
  } else if (name === "zap") {
    $$renderer.push("<!--[5-->");
    $$renderer.push(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>`);
  } else if (name === "minus-circle") {
    $$renderer.push("<!--[6-->");
    $$renderer.push(`<circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line>`);
  } else if (name === "plus-circle") {
    $$renderer.push("<!--[7-->");
    $$renderer.push(`<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>`);
  } else if (name === "arrow-left-right") {
    $$renderer.push("<!--[8-->");
    $$renderer.push(`<polyline points="17 11 21 7 17 3"></polyline><line x1="21" y1="7" x2="9" y2="7"></line><polyline points="7 21 3 17 7 13"></polyline><line x1="3" y1="17" x2="15" y2="17"></line>`);
  } else if (name === "target") {
    $$renderer.push("<!--[9-->");
    $$renderer.push(`<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>`);
  } else if (name === "paperclip") {
    $$renderer.push("<!--[10-->");
    $$renderer.push(`<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>`);
  } else if (name === "calendar") {
    $$renderer.push("<!--[11-->");
    $$renderer.push(`<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>`);
  } else if (name === "alert-triangle") {
    $$renderer.push("<!--[12-->");
    $$renderer.push(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`);
  } else if (name === "bar-chart") {
    $$renderer.push("<!--[13-->");
    $$renderer.push(`<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>`);
  } else if (name === "building") {
    $$renderer.push("<!--[14-->");
    $$renderer.push(`<rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path>`);
  } else if (name === "credit-card") {
    $$renderer.push("<!--[15-->");
    $$renderer.push(`<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>`);
  } else if (name === "clipboard") {
    $$renderer.push("<!--[16-->");
    $$renderer.push(`<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>`);
  } else if (name === "settings") {
    $$renderer.push("<!--[17-->");
    $$renderer.push(`<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>`);
  } else if (name === "layout-dashboard") {
    $$renderer.push("<!--[18-->");
    $$renderer.push(`<rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect>`);
  } else if (name === "coins") {
    $$renderer.push("<!--[19-->");
    $$renderer.push(`<circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path><path d="m16.71 13.88.7.71-2.82 2.82"></path>`);
  } else if (name === "repeat") {
    $$renderer.push("<!--[20-->");
    $$renderer.push(`<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>`);
  } else if (name === "tag") {
    $$renderer.push("<!--[21-->");
    $$renderer.push(`<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>`);
  } else if (name === "bell") {
    $$renderer.push("<!--[22-->");
    $$renderer.push(`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>`);
  } else if (name === "save") {
    $$renderer.push("<!--[23-->");
    $$renderer.push(`<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>`);
  } else if (name === "dollar-sign") {
    $$renderer.push("<!--[24-->");
    $$renderer.push(`<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>`);
  } else if (name === "receipt") {
    $$renderer.push("<!--[25-->");
    $$renderer.push(`<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></svg>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeTab = "perfil";
    Object.entries(currencyConfig).map(([k, v]) => ({ value: k, label: `${v.symbol} — ${v.name}` }));
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("6qgtij", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.title"))} - HomeLedger</title>`);
        });
      });
      $$renderer3.push(`<div class="page svelte-6qgtij"><header class="page-header svelte-6qgtij"><div><h1 class="svelte-6qgtij">${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.title"))}</h1> <p class="page-subtitle svelte-6qgtij">${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.subtitle"))}</p></div></header> <div class="settings-layout svelte-6qgtij"><nav class="settings-tabs svelte-6qgtij"><button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "perfil" })}>`);
      Icon($$renderer3, { name: "building", size: 15 });
      $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.profile"))}</button> <button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "seguridad" })}>`);
      Icon($$renderer3, { name: "settings", size: 15 });
      $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.security"))}</button> <button${attr_class("tab-item svelte-6qgtij", void 0, { "active": activeTab === "datos" })}>`);
      Icon($$renderer3, { name: "save", size: 15 });
      $$renderer3.push(`<!----> ${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.data"))}</button></nav> <div class="settings-content svelte-6qgtij">`);
      {
        $$renderer3.push("<!--[0-->");
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="loading-state svelte-6qgtij">${escape_html(store_get($$store_subs ??= {}, "$t", t)("settings.loading_profile"))}</div>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--></div></div></div> `);
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
//# sourceMappingURL=_page.svelte-sY4ls_xd.js.map
