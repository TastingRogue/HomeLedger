function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="auth-layout svelte-tgdr9">`);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-C3NwkDHw.js.map
