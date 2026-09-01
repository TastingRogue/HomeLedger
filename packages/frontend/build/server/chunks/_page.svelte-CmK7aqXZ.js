import { h as head, e as escape_html, s as store_get, b as attr, i as attr_class, u as unsubscribe_stores } from './index.js-CfMxod6N.js';
import './state.svelte-W_t3TgRo.js';
import './ui-CQQMpx73.js';
import { t } from './index3-CxI74EDd.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
        $$renderer4.push(`<title>Crear Cuenta - HomeLedger</title>`);
      });
    });
    $$renderer2.push(`<div class="register-container svelte-52fghe"><div class="register-card svelte-52fghe"><div class="brand-mark svelte-52fghe">HL</div> <h1 class="register-title svelte-52fghe">HomeLedger</h1> <p class="register-subtitle svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.register_title"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form novalidate=""><div class="form-group svelte-52fghe"><label for="name" class="svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.name_label"))}</label> <input id="name" type="text"${attr("value", name)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.name_placeholder"))} autocomplete="name"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": nameError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="email" class="svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.email_label"))}</label> <input id="email" type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.email_placeholder"))} autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": emailError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="password" class="svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.password_label"))}</label> <input id="password" type="password"${attr("value", password)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.password_placeholder"))} autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": passwordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="confirmPassword" class="svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.confirm_password_label"))}</label> <input id="confirmPassword" type="password"${attr("value", confirmPassword)} placeholder="Repite tu contraseña" autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": confirmPasswordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit" class="submit-btn svelte-52fghe"${attr("disabled", loading, true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.register_btn"))}`);
    }
    $$renderer2.push(`<!--]--></button></form> <p class="login-link svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.have_account"))} <a href="/login" class="svelte-52fghe">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.go_login"))}</a></p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CmK7aqXZ.js.map
