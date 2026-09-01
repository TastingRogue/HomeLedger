import { h as head, b as attr, f as attr_class } from './index.js-CtKG6L_g.js';
import './state.svelte-kLqNomcq.js';
import './ui-Clez6puz.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    $$renderer2.push(`<div class="login-container svelte-1x05zx6"><div class="login-card svelte-1x05zx6"><div class="brand-mark svelte-1x05zx6">HL</div> <h1 class="login-title svelte-1x05zx6">HomeLedger</h1> <p class="login-subtitle svelte-1x05zx6">Iniciar Sesión</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form novalidate=""><div class="form-group svelte-1x05zx6"><label for="email" class="svelte-1x05zx6">Correo electrónico</label> <input id="email" type="email"${attr("value", email)} placeholder="tu@correo.com" autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": emailError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-1x05zx6"><label for="password" class="svelte-1x05zx6">Contraseña</label> <input id="password" type="password"${attr("value", password)} placeholder="••••••••" autocomplete="current-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-1x05zx6", void 0, { "input-error": passwordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit" class="submit-btn svelte-1x05zx6"${attr("disabled", loading, true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Iniciar Sesión`);
    }
    $$renderer2.push(`<!--]--></button></form> <p class="register-link svelte-1x05zx6">¿Primera vez aquí? <a href="/register" class="svelte-1x05zx6">Crear cuenta</a></p></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Df_5khDF.js.map
