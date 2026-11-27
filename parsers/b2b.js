window.TenderSnap.parsers["b2b-center.ru"] = async ({ clean, getText, getTableValueByLabel }) => {
  // Новый интерфейс B2B-Center (market-next)
  const isNewMarket = Boolean(document.querySelector(".trade-header, .delivery-widget, .description-widget"));

  if (isNewMarket) {
    const number = getText('[data-xid="trade-id"]') || "Не найдено";

    const name =
      getText("h1.trade-header-title") ||
      getText("h1") ||
      "Не найдено";

    const organizer =
      getText('[data-xid="organizer-information-firm-link"]') ||
      getText('[data-xid="delivery-widget-organizer-information"] a') ||
      "Не найдено";

    const place =
      getText('[data-xid="delivery-widget-delivery-address"] p') ||
      getText('[data-xid="delivery-widget-delivery-address"]') ||
      "Не указано";

    // Дата окончания приема заявок в блоке "Даты"
    let deadline = "";
    const datesWidget = document.querySelector('[data-xid="dates"]');
    if (datesWidget) {
      const rows = Array.from(datesWidget.querySelectorAll(".cds-flex.cds-flex-col.cds-gap-2 > div"));
      const endRow = rows.find((row) => /окончание при[её]ма заявок/i.test(row.textContent));
      if (endRow) {
        const clone = endRow.cloneNode(true);
        const labelEl = clone.querySelector(".cds-mb-3xs");
        if (labelEl) labelEl.remove();
        deadline = clean(clone.textContent);
      }
    }
    if (!deadline) {
      deadline = getText('[data-xid="trade-consider-from-date"]') || "Не найдено";
    }

    // Финансы и ключевые условия по деньгам/ценам
    const finParts = [];

    const totalPrice = getText('[data-xid="total-positions-price-text"]');
    if (totalPrice) {
      finParts.push(`Сумма закупки: ${totalPrice}`);
    }

    const priceTypeEl = document.querySelector('[data-xid="price-info"] .cds-tag');
    const priceType = priceTypeEl ? clean(priceTypeEl.textContent) : "";
    if (priceType) {
      finParts.push(`Цены: ${priceType}`);
    }

    const reqWidget = document.querySelector(".requirements-widget");
    if (reqWidget) {
      const items = Array.from(reqWidget.querySelectorAll(".widget-item"));
      const currItem = items.find((item) => /валюта заявки/i.test(item.querySelector("h5")?.textContent || ""));
      if (currItem) {
        const val = clean(currItem.querySelector("li, p, span:last-child")?.textContent);
        if (val) finParts.push(`Валюта: ${val}`);
      }
    }

    const payment = getText('[data-xid="delivery-widget-payment"] [data-xid="collapsable-text"]');
    if (payment) {
      finParts.push(`Условия оплаты: ${payment}`);
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
  }

  // Старая верстка карточек .card-item
  const cardRoot = document.querySelector(".card-item") || document;
  const number = getText(".card-item__about a.link", cardRoot) || getText(".card-item__about", cardRoot) || "Не найдено";
  const name =
    getText('h1.main-title[data-annotation="PurchaseName"]') ||
    getText("h1.main-title") ||
    getText("h1") ||
    "Не найдено";

  let organizer = "Не найдено";
  const orgLink = cardRoot.querySelector(".card-item__organization-main a");
  if (orgLink) {
    const clone = orgLink.cloneNode(true);
    clone.querySelectorAll(".show_statistic_organizer").forEach((el) => el.remove());
    organizer = clean(clone.textContent);
    const orgInfo = getText(".card-item__organization-info", cardRoot);
    if (orgInfo) {
      organizer += ` (${orgInfo})`;
    }
  } else {
    organizer =
      getTableValueByLabel("Организатор", cardRoot) ||
      getTableValueByLabel("Заказчик", cardRoot) ||
      "Не найдено";
  }

  const place =
    getText(".card-item__delivery-place", cardRoot) ||
    getTableValueByLabel("Место поставки", cardRoot) ||
    getTableValueByLabel("Адрес поставки", cardRoot) ||
    getTableValueByLabel("Регион", cardRoot) ||
    "Не указано";

  let deadline = getText(".card-item__info-end-date time", cardRoot);
  if (!deadline) {
    deadline = getText(".card-item__info-end-date", cardRoot).replace(/^Подать заявку до:\s*/i, "");
  }

  let finance = "Не найдено";
  const propCells = Array.from(cardRoot.querySelectorAll(".card-item__properties-cell"));
  if (propCells.length > 0) {
    const finParts = propCells
      .map((cell) => {
        const propName = getText(".card-item__properties-name", cell);
        const propDesc = getText(".card-item__properties-desc", cell);
        if (propName && propDesc && propName.toLowerCase() !== "статус") {
          return `${propName}: ${propDesc}`;
        }
        return "";
      })
      .filter(Boolean);
    if (finParts.length > 0) {
      finance = finParts.join(" | ");
    }
  }

  return {
    number,
    name,
    organizer,
    place,
    deadline: deadline || "Не найдено",
    finance,
    sources: location.href
  };
};

window.TenderSnap.detectors.push((host) => {
  if (
    host.includes("b2b-center.ru") ||
    document.querySelector(".trade-header, .delivery-widget, .card-item__about, h1[data-annotation='PurchaseName']")
  ) {
    return "b2b-center.ru";
  }
  return null;
});