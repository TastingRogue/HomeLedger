import { h as head, e as escape_html, k as store_get, d as attr, f as attr_class, u as unsubscribe_stores, F as FILENAME } from './index.js-sLDRIdyD.js';
import './client-BgtQG1sy.js';
import './ui-BpOuD2-N.js';
import { t } from './index3-CvX21c1v.js';
import { p as push_element, a as pop_element } from './dev-D0OGkwgZ.js';
import './preferences-BhVg4Jeq.js';

_page[FILENAME] = "src/routes/login/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let email = "";
      let password = "";
      let loading = false;
      let emailError = "";
      let passwordError = "";
      head("1x05zx6", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.login"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="login-container svelte-1x05zx6">`);
      push_element($$renderer2, "div", 76, 0);
      $$renderer2.push(`<div class="login-card svelte-1x05zx6">`);
      push_element($$renderer2, "div", 77, 2);
      $$renderer2.push(`<div class="brand-mark svelte-1x05zx6">`);
      push_element($$renderer2, "div", 78, 4);
      $$renderer2.push(`HL</div>`);
      pop_element();
      $$renderer2.push(` <h1 class="login-title svelte-1x05zx6">`);
      push_element($$renderer2, "h1", 79, 4);
      $$renderer2.push(`HomeLedger</h1>`);
      pop_element();
      $$renderer2.push(` <p class="login-subtitle svelte-1x05zx6">`);
      push_element($$renderer2, "p", 80, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login_title"))}</p>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <form novalidate="">`);
      push_element($$renderer2, "form", 86, 4);
      $$renderer2.push(`<div class="form-group svelte-1x05zx6">`);
      push_element($$renderer2, "div", 87, 6);
      $$renderer2.push(`<label for="email" class="svelte-1x05zx6">`);
      push_element($$renderer2, "label", 88, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.email_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="email" type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.email_placeholder"))} autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": emailError })}/>`);
      push_element($$renderer2, "input", 89, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="form-group svelte-1x05zx6">`);
      push_element($$renderer2, "div", 105, 6);
      $$renderer2.push(`<label for="password" class="svelte-1x05zx6">`);
      push_element($$renderer2, "label", 106, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.password_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="password" type="password"${attr("value", password)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.password_placeholder"))} autocomplete="current-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": passwordError })}/>`);
      push_element($$renderer2, "input", 107, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <button type="submit" class="submit-btn svelte-1x05zx6"${attr("disabled", loading, true)}>`);
      push_element($$renderer2, "button", 123, 6);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login_btn"))}`);
      }
      $$renderer2.push(`<!--]--></button>`);
      pop_element();
      $$renderer2.push(`</form>`);
      pop_element();
      $$renderer2.push(` <p class="register-link svelte-1x05zx6">`);
      push_element($$renderer2, "p", 133, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.no_account"))} <a href="/register" class="svelte-1x05zx6">`);
      push_element($$renderer2, "a", 135, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.go_register"))}</a>`);
      pop_element();
      $$renderer2.push(`</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
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
//# sourceMappingURL=_page.svelte-CDs-YUob.js.map
