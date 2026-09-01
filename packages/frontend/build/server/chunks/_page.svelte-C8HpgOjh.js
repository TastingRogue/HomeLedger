import { h as head, b as attr, f as attr_class } from './index.js-VYRhdVs9.js';
import './state.svelte-Ba8H-s0W.js';
import './ui-DBfvg7Qs.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    $$renderer2.push(`<div class="register-container svelte-52fghe"><div class="register-card svelte-52fghe"><div class="brand-mark svelte-52fghe">HL</div> <h1 class="register-title svelte-52fghe">HomeLedger</h1> <p class="register-subtitle svelte-52fghe">Crear Cuenta</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form novalidate=""><div class="form-group svelte-52fghe"><label for="name" class="svelte-52fghe">Nombre</label> <input id="name" type="text"${attr("value", name)} placeholder="Tu nombre completo" autocomplete="name"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": nameError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="email" class="svelte-52fghe">Correo electrónico</label> <input id="email" type="email"${attr("value", email)} placeholder="tu@correo.com" autocomplete="email"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": emailError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="password" class="svelte-52fghe">Contraseña</label> <input id="password" type="password"${attr("value", password)} placeholder="Mínimo 8 caracteres" autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": passwordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="form-group svelte-52fghe"><label for="confirmPassword" class="svelte-52fghe">Confirmar contraseña</label> <input id="confirmPassword" type="password"${attr("value", confirmPassword)} placeholder="Repite tu contraseña" autocomplete="new-password"${attr("disabled", loading, true)}${attr("aria-describedby", void 0)}${attr("aria-invalid", void 0)}${attr_class("svelte-52fghe", void 0, { "input-error": confirmPasswordError })}/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit" class="submit-btn svelte-52fghe"${attr("disabled", loading, true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Registrarse`);
    }
    $$renderer2.push(`<!--]--></button></form> <p class="login-link svelte-52fghe">¿Ya tienes cuenta? <a href="/login" class="svelte-52fghe">Iniciar Sesión</a></p></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C8HpgOjh.js.map
