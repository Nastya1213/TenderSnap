window.TenderSnap.parsers["zakazrf.ru"] = async ({ clean }) => {
  const getDetailRowValue = (labelText) => {
    const search = labelText.toLowerCase();
    const rows = Array.from(document.querySelectorAll(".orm-details-view-row"));

    for (const row of rows) {
      const cols = row.querySelectorAll(".orm-details-view-col");
      if (cols.length < 2) continue;
      const label = clean(cols[0].textContent).toLowerCase();
      if (label === search) {
        const val = clean(cols[1].textContent);
        if (val) return val;
      }
    }

    for (const row of rows) {
      const cols = row.querySelectorAll(".orm-details-view-col");
      if (cols.length < 2) continue;
      const label = clean(cols[0].textContent).toLowerCase();
      if (label.includes(search)) {
        const val = clean(cols[1].textContent);
        if (val) return val;
      }
    }

    return "";
  };

  // 1. Номер извещения
  const numRaw = getDetailRowValue("Номер извещения");
  const number = numRaw
    ? (numRaw.startsWith("№") ? numRaw : `№ ${numRaw}`)
    : "Не найдено";

  // 2. Наименование закупки
  const name =
    getDetailRowValue("Наименование объекта закупки") ||
    getDetailRowValue("Наименование закупки") ||
    clean(document.querySelector("h1.form-header")?.textContent) ||
    "Не найдено";

  // 3. Организатор / Заказчик
  const organizer =
    getDetailRowValue("Заказчик") ||
    getDetailRowValue("Организация, осуществляющая размещение") ||
    clean(document.querySelector('a[href*="/Customer/id/"]')?.textContent) ||
    "Не найдено";

  // 4. Место исполнения
  const placeRaw =
    getDetailRowValue("Место доставки товара, выполнения работы или оказания услуг") ||
    getDetailRowValue("Место поставки") ||
    getDetailRowValue("Место нахождения");
  const place = placeRaw ? placeRaw.replace(/;\s*$/, "").trim() : "Не указано";

  // 5. Прием заявок до
  const deadline =
    getDetailRowValue("Дата и время окончания срока подачи заявок") ||
    getDetailRowValue("Окончание срока подачи заявок") ||
    "Не найдено";

  // 6. Финансы
  const finParts = [];
  const nmck =
    getDetailRowValue("Начальная (максимальная) цена контракта") ||
    getDetailRowValue("Начальная цена");
  const currency = getDetailRowValue("Валюта");
  if (nmck) {
    const unit = currency && currency.toLowerCase().includes("рубль") ? "₽" : currency || "₽";
    finParts.push(`Начальная цена: ${nmck} ${unit}`.trim());
  }

  const bidAppReq = getDetailRowValue("Требуется обеспечение заявки");
  const bidAppSize =
    getDetailRowValue("Размер обеспечения исполнения заявки (общий)") ||
    getDetailRowValue("Размер обеспечения заявки");
  if (bidAppSize && bidAppSize !== "0") {
    finParts.push(`Обеспечение заявки: ${bidAppSize}`);
  } else if (bidAppReq) {
    finParts.push(`Обеспечение заявки: ${bidAppReq}`);
  }

  const contractSecPct = getDetailRowValue("Размер обеспечения исполнения контракта, %");
  const contractSecReq = getDetailRowValue("Требуется обеспечение исполнения контракта");
  if (contractSecPct) {
    finParts.push(`Обеспечение контракта: ${contractSecPct}%`);
  } else if (contractSecReq) {
    finParts.push(`Обеспечение контракта: ${contractSecReq}`);
  }

  // 7. Источники
  const eisLink = document.querySelector('a[href*="zakupki.gov.ru"]')?.href;
  const sources = eisLink
    ? `ЭТП: ${location.href} ; ЕИС: ${eisLink}`
    : location.href;

  return {
    number,
    name,
    organizer,
    place,
    deadline,
    finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
    sources
  };
};

window.TenderSnap.detectors.push((host) => {
  if (host.includes("zakazrf.ru") || document.querySelector(".orm-details-view-row")) {
    return "zakazrf.ru";
  }
  return null;
});