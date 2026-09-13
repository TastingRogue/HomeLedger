import { n as noop } from './index.js-C4wgdopQ.js';

const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
const placeholder_url = "a:";
if (is_legacy) {
  ({
    url: new URL(placeholder_url)
  });
}
//# sourceMappingURL=state.svelte-Dk9VuXuv.js.map
