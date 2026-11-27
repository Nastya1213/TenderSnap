const PARSER_FILES = [
  "utils.js",
  "parsers/saby.js",
  "parsers/zakupki.js",
  "parsers/kontur.js",
  "parsers/b2b.js",
  "parsers/rts.js",
  "parsers/komtender.js",
  "parsers/etprf.js",
  "parsers/gpb.js",
  "parsers/sber.js",
  "parsers/bidzaar.js",
  "parsers/roseltorg.js",
  "parsers/zakazrf.js",
  "parsers/tektorg.js",
  "parsers/rt_roseltorg.js",
  "core.js"
];

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.url.startsWith("http")) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: PARSER_FILES
  });
});
