window.TenderSnap.parsers["tektorg.ru"] = async ({ clean }) => {
  const norm = (text) =>
    clean(
      String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/([а-яёa-z0-9\)])([А-ЯЁA-Z])/g, "$1 $2")
        .replace(/(\d{2}\.\d{2}\.\d{4})(\d{2}:\d{2})/g, "$1 $2")
        .replace(/(\d{2}:\d{2})(GMT[+-]\d+)/gi, "$1 $2")
    );

  const mainRoot = document.querySelector("main") || document;

  const isActionButtonsText = (val) =>
    /заявка на уча[сc]тие|запрос на разъяснение|подать заявку/i.test(val);

  const isContactNoise = (val) =>
    /^контактный телефон|^адрес электронной почты|^фио контактного лица/i.test(val);

  const getCleanElementText = (el) => {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll("button, svg, style, script").forEach((n) => n.remove());
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.replace(/\u00a0/g, " ").trim();
        if (t) parts.push(t);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of node.childNodes) {
          walk(child);
        }
      }
    };
    walk(clone);
    return norm(parts.join(" "));
  };

  // Прямой поиск пары подпись/значение в блоках ТЭК-Торг (.sc-8dd25406-1 / .sc-8dd25406-2 и др.)
  const findPairValue = (labelPatterns, root = mainRoot) => {
    const patterns = (Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns]).map((p) =>
      p.toLowerCase().replace(/:$/, "").trim()
    );

    const labelEls = Array.from(root.querySelectorAll(".sc-8dd25406-1, .sc-3f9e2763-9, div, p, span, td, th, dt, label"));

    for (const pat of patterns) {
      for (const el of labelEls) {
        if (el.children.length > 2) continue;
        const rawLabel = norm(el.textContent);
        const txt = rawLabel.toLowerCase().replace(/:$/, "").trim();
        if (!txt || txt.length > 140) continue;
        if (!(txt === pat || txt.startsWith(pat))) continue;

        // 1. Внутри общей родительской карточки ищем парный блок значения
        const cardItem = el.closest(".sc-8dd25406-0 > div, .sc-3f9e2763-8, .sc-3f9e2763-14, .sc-3f9e2763-12, .sc-3f9e2763-19");
        if (cardItem) {
          const valEl = cardItem.querySelector(".sc-8dd25406-2, .sc-3f9e2763-10, .sc-3f9e2763-15, .sc-a6b34174-0, time");
          if (valEl && valEl !== el) {
            const val = getCleanElementText(valEl);
            if (val && !isActionButtonsText(val) && !isContactNoise(val)) {
              return val;
            }
          }
        }

        // 2. Следующий соседний элемент
        if (el.nextElementSibling) {
          const sibVal = getCleanElementText(el.nextElementSibling);
          if (
            sibVal &&
            sibVal.toLowerCase() !== txt &&
            !isActionButtonsText(sibVal) &&
            !isContactNoise(sibVal)
          ) {
            return sibVal;
          }
        }
      }
    }
    return "";
  };

  // 1. Номер процедуры
  const rawNum =
    norm(mainRoot.querySelector(".sc-df75c2e8-4")?.textContent) ||
    norm(
      Array.from(mainRoot.querySelectorAll('nav[aria-label="breadcrumbs"] span[itemprop="name"]'))
        .map((n) => n.textContent)
        .find((t) => /№|процедур/i.test(t))
    )
      .replace(/^Извещение о процедуре\s*/i, "")
      .trim();

  const number = rawNum
    ? (rawNum.startsWith("№") ? rawNum : `№ ${rawNum}`)
    : "Не найдено";

  // 2. Наименование закупки
  const lotSection = mainRoot.querySelector("#lots") || mainRoot;
  const name =
    norm(mainRoot.querySelector("h1.sc-3f9e2763-7")?.textContent) ||
    norm(lotSection.querySelector("h2.sc-3f9e2763-7, h2")?.textContent) ||
    norm(mainRoot.querySelector("h1")?.textContent) ||
    "Не найдено";

  // 3. Организатор
  let organizer =
    findPairValue(["Наименование организатора"]) ||
    norm(mainRoot.querySelector('a[href*="/organizators/"]')?.textContent) ||
    findPairValue(["Организатор"]) ||
    findPairValue(["Заказчик"], lotSection) ||
    "Не найдено";

  if (isContactNoise(organizer)) {
    organizer = norm(mainRoot.querySelector('a[href*="/organizators/"]')?.textContent) || "Не найдено";
  }

  // 4. Место исполнения / поставки
  const place =
    findPairValue([
      "Место поставки товара, выполнения работ, оказания услуг",
      "Место исполнения",
      "Место поставки",
      "Адрес поставки",
      "Регион поставки",
      "Регион"
    ]) || "Не указано";

  // 5. Прием заявок до
  let deadline = "";
  const timeNodes = Array.from(mainRoot.querySelectorAll("time"));
  const endTimeNode = timeNodes.find((t) => {
    const box = t.closest("div") || t.parentElement;
    const ctx = norm(box?.textContent).toLowerCase();
    return ctx.includes("окончан") || ctx.includes("до ");
  });

  if (endTimeNode) {
    deadline = getCleanElementText(endTimeNode);
  }

  if (!deadline) {
    deadline = findPairValue([
      "Дата окончания срока подачи",
      "Дата окончания приема заявок",
      "Дата окончания подачи",
      "Окончание приема заявок",
      "Окончание подачи заявок",
      "Срок окончания подачи"
    ]);
  }

  if (!deadline) deadline = "Не найдено";

  // 6. Финансы: начальная цена, обеспечение заявки, обеспечение договора
  const finParts = [];
  const startPrice =
    norm(mainRoot.querySelector(".sc-3f9e2763-12 .sc-a6b34174-0")?.textContent) ||
    findPairValue(["Начальная цена", "Начальная (максимальная) цена"]);

  if (startPrice) {
    finParts.push(`Начальная цена: ${startPrice}`);
  }

  const bidSec = findPairValue(["Обеспечение заявки"], lotSection);
  if (bidSec) {
    finParts.push(`Обеспечение заявки: ${bidSec}`);
  }

  const contractSec = findPairValue(
    ["Обеспечение договора", "Обеспечение исполнения договора"],
    lotSection
  );
  if (contractSec) {
    finParts.push(`Обеспечение договора: ${contractSec}`);
  }

  return {
    number,
    name,
    organizer,
    place,
    deadline,
    finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
    sources: location.href
  };
};

window.TenderSnap.detectors.push((host) => {
  if (host.includes("tektorg.ru")) {
    return "tektorg.ru";
  }
  return null;
});