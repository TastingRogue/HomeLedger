import { h as head, e as escape_html, k as store_get, d as attr, f as attr_class, u as unsubscribe_stores, F as FILENAME } from './index.js-DPDzRp_x.js';
import './client-ZxGhk6br.js';
import './ui-AoFqY3Ag.js';
import { t } from './index3-CPGo2MZJ.js';
import { p as push_element, a as pop_element } from './dev-B4VUE_3Y.js';
import './preferences-CItE1FtI.js';

_page[FILENAME] = "src/routes/register/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let name = "";
      let email = "";
      let password = "";
      let confirmPassword = "";
      let loading = false;
      let nameError = "";
      let emailError = "";
      let passwordError = "";
      let confirmPasswordError = "";
      head("52fghe", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("page_title.register"))} - HomeLedger</title>`);
        });
      });
      $$renderer2.push(`<div class="register-container svelte-52fghe">`);
      push_element($$renderer2, "div", 63, 0);
      $$renderer2.push(`<div class="register-card svelte-52fghe">`);
      push_element($$renderer2, "div", 64, 2);
      $$renderer2.push(`<div class="brand-mark svelte-52fghe">`);
      push_element($$renderer2, "div", 65, 4);
      $$renderer2.push(`HL</div>`);
      pop_element();
      $$renderer2.push(` <h1 class="register-title svelte-52fghe">`);
      push_element($$renderer2, "h1", 66, 4);
      $$renderer2.push(`HomeLedger</h1>`);
      pop_element();
      $$renderer2.push(` <p class="register-subtitle svelte-52fghe">`);
      push_element($$renderer2, "p", 67, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.register_title"))}</p>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <form novalidate="">`);
      push_element($$renderer2, "form", 73, 4);
      $$renderer2.push(`<div class="form-group svelte-52fghe">`);
      push_element($$renderer2, "div", 74, 6);
      $$renderer2.push(`<label for="name" class="svelte-52fghe">`);
      push_element($$renderer2, "label", 75, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.name_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="name" type="text"${attr("value", name)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.name_placeholder"))} autocomplete="name"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": nameError })}/>`);
      push_element($$renderer2, "input", 76, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="form-group svelte-52fghe">`);
      push_element($$renderer2, "div", 80, 6);
      $$renderer2.push(`<label for="email" class="svelte-52fghe">`);
      push_element($$renderer2, "label", 81, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.email_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="email" type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.email_placeholder"))} autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": emailError })}/>`);
      push_element($$renderer2, "input", 82, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="form-group svelte-52fghe">`);
      push_element($$renderer2, "div", 86, 6);
      $$renderer2.push(`<label for="password" class="svelte-52fghe">`);
      push_element($$renderer2, "label", 87, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.password_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="password" type="password"${attr("value", password)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.password_placeholder"))} autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": passwordError })}/>`);
      push_element($$renderer2, "input", 88, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="form-group svelte-52fghe">`);
      push_element($$renderer2, "div", 92, 6);
      $$renderer2.push(`<label for="confirmPassword" class="svelte-52fghe">`);
      push_element($$renderer2, "label", 93, 8);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.confirm_password_label"))}</label>`);
      pop_element();
      $$renderer2.push(` <input id="confirmPassword" type="password"${attr("value", confirmPassword)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.confirm_password_placeholder"))} autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": confirmPasswordError })}/>`);
      push_element($$renderer2, "input", 94, 8);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <button type="submit" class="submit-btn svelte-52fghe"${attr("disabled", loading, true)}>`);
      push_element($$renderer2, "button", 98, 6);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.register_btn"))}`);
      }
      $$renderer2.push(`<!--]--></button>`);
      pop_element();
      $$renderer2.push(`</form>`);
      pop_element();
      $$renderer2.push(` <p class="login-link svelte-52fghe">`);
      push_element($$renderer2, "p", 108, 4);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.have_account"))} <a href="/login" class="svelte-52fghe">`);
      push_element($$renderer2, "a", 110, 6);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.go_login"))}</a>`);
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
//# sourceMappingURL=_page.svelte-Ch5zwXDc.js.map
