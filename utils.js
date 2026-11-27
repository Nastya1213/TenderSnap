window.TenderSnap = window.TenderSnap || {};
window.TenderSnap.parsers = window.TenderSnap.parsers || {};
window.TenderSnap.detectors = window.TenderSnap.detectors || [];

window.TenderSnap.utils = {
  clean: (text) => (text ? text.replace(/\s+/g, " ").trim() : ""),

  getText: (selector, root = document) => {
    const el = root.querySelector(selector);
    return el ? window.TenderSnap.utils.clean(el.innerText) : "";
  },

  getTableValueByLabel: (labelText, root = document) => {
    const { clean } = window.TenderSnap.utils;
    const cells = Array.from(
      root.querySelectorAll(
        'td, th, dt, .tender-named-values_name, .card-item__properties-name, .tender-body__label, .label, [class*="title"], [class*="label"]'
      )
    );
    const target = cells.find((el) => {
      if (el.closest('footer, header, nav, .modal, .popup, [class*="filter"], [class*="region-select"]')) {
        return false;
      }
      const txt = clean(el.textContent).toLowerCase().replace(/:$/, "");
      const search = labelText.toLowerCase();
      return txt === search || txt.startsWith(search);
    });
    if (target && target.nextElementSibling) {
      return clean(target.nextElementSibling.textContent);
    }
    return "";
  },

  resolveRedirectUrl: async (url) => {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (response.url && !response.url.includes("/away?")) {
        return response.url;
      }
    } catch (e) {}
    try {
      const response = await fetch(url);
      if (response.url && !response.url.includes("/away?")) {
        return response.url;
      }
      const html = await response.text();
      const match =
        html.match(/url=([^"'>\s]+)/i) ||
        html.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
      if (match && match[1]) return match[1];
    } catch (e) {}
    return url;
  }
};
