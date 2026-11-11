const { dictionaries, resolveLocale, isSupportedLocale, localeCodes } = require('./locale-data.cjs');
function text(locale, key) {
  return dictionaries[resolveLocale(locale)][key] ?? dictionaries.en[key] ?? key;
}
module.exports = { resolveLocale, isSupportedLocale, localeCodes, text, dictionaries };
