import { h as head } from './index.js-BBgse55Y.js';
import './theme-C3tP2YcU.js';
import './preferences-CrmBro7u.js';

function html(value) {
  var html2 = String(value);
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.push(`<meta name="theme-color" content="#191919"/>  ${html(`<script>try{var t=localStorage.getItem('sf_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}<\/script>`)}`);
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-DG29_fRi.js.map
