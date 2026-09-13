import { h as head, F as FILENAME, b as hash } from './index.js-XWaMFQMt.js';
import { p as push_element, a as pop_element } from './dev-Bz53WfQq.js';
import './theme-BhudnYUy.js';
import './preferences-Cesmdl1S.js';

function html(value) {
  var html2 = String(value);
  var open = `<!--${hash(html2)}-->`;
  return open + html2 + "<!---->";
}
_layout[FILENAME] = "src/routes/+layout.svelte";
function _layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { children } = $$props;
      head("12qhfyh", $$renderer2, ($$renderer3) => {
        $$renderer3.push(`<meta name="theme-color" content="#191919"/>`);
        push_element($$renderer3, "meta", 22, 1);
        pop_element();
        $$renderer3.push(`  ${html(`<script>try{var t=localStorage.getItem('sf_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}<\/script>`)}`);
      });
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    },
    _layout
  );
}
_layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _layout as default };
//# sourceMappingURL=_layout.svelte-HCTR7SI8.js.map
