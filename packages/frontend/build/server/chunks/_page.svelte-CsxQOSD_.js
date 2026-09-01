import { h as head, e as escape_html, s as store_get, b as attr, i as attr_class, u as unsubscribe_stores } from './index.js-BfLmu_lo.js';
import './state.svelte-CJ7U5EM5.js';
import './ui-BTYIJRkK.js';
import { t } from './index3-DyOSNu1Q.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let email = "";
    let password = "";
    let loading = false;
    let emailError = "";
    let passwordError = "";
    head("1x05zx6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Iniciar Sesión - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="login-container svelte-1x05zx6"><div class="login-card svelte-1x05zx6"><div class="brand-mark svelte-1x05zx6">HL</div> <h1 class="login-title svelte-1x05zx6">HomeLedger</h1> <p class="login-subtitle svelte-1x05zx6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login_title"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form novalidate=""><div class="form-group svelte-1x05zx6"><label for="email" class="svelte-1x05zx6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.email_label"))}</label> <input id="email" type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.email_placeholder"))} autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": emailError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-1x05zx6"><label for="password" class="svelte-1x05zx6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.password_label"))}</label> <input id="password" type="password"${attr("value", password)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.password_placeholder"))} autocomplete="current-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": passwordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit" class="submit-btn svelte-1x05zx6"${attr("disabled", loading, true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login_btn"))}`);
    }
    $$renderer2.push(`<!--]--></button></form> <p class="register-link svelte-1x05zx6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.no_account"))} <a href="/register" class="svelte-1x05zx6">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.go_register"))}</a></p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CsxQOSD_.js.map
