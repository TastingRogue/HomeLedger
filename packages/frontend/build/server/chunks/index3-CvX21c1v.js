import { j as derived } from './index.js-sLDRIdyD.js';
import { p as preferences, d as dictionaries, D as DEFAULT_LOCALE } from './preferences-BhVg4Jeq.js';

const t = derived(preferences, ($prefs) => {
  const dict = dictionaries[$prefs.locale] ?? dictionaries[DEFAULT_LOCALE];
  const fallback = dictionaries[DEFAULT_LOCALE];
  return (key, params) => {
    let text = dict[key] ?? fallback[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
});

export { t };
//# sourceMappingURL=index3-CvX21c1v.js.map
