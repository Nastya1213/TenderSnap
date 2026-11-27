
window.TenderSnap.parsers["roseltorg.ru"] = async ({ clean, getText }) => {
  const card = document.querySelector(".lot-page__big-card") || document;
  const sidebar =
    document.querySelector(".lot-page__small-card--desktop") ||
    document.querySelector(".lot-page__small-card--sidebar") ||
    document;

  const formatMoneyEl = (el) => {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll("meta, link").forEach((n) => n.remove());
    return clean(clone.textContent).replace(/\s+([,.])/g, "$1");
  };

  // 1. Номер процедуры
  const numRaw =
    getText(".lot-header-title__number", card) ||
    document
      .querySelector("[data-feature-favorite-lots-procedure-number]")
      ?.getAttribute("data-feature-favorite-lots-procedure-number") ||
    "";
  const number = numRaw ? (numRaw.startsWith("№") ? numRaw : `№ ${numRaw}`) : "Не найдено";

  // 2. Наименование закупки
  const name =
    getText(".lot-title h1.lot-expand-text__text", card) ||
    getText(".lot-title h1", card) ||
    getText("h1") ||
    "Не найдено";

  // 3. Организатор / Заказчик + ИНН
  let organizer =
    getText(".lot-customers .customer-name a", card) ||
    getText(".lot-customers .customer-name", card) ||
    getText(".lot-organizer .lot-common-info__value a") ||
    "Не найдено";

  const innRaw = getText(".lot-customers .customer-inn", card);
  if (innRaw && organizer !== "Не найдено" && !organizer.includes(innRaw)) {
    organizer += ` (${innRaw})`;
  }

  // 4. Место поставки / исполнения
  const place =
    getText(".lot-delivery__text .lot-expand-text__text", card) ||
    getText(".lot-delivery__text", card) ||
    "Согласно закупочной документации";

  // 5. Дата окончания приема заявок
  let deadline = "";
  const activeStep = card.querySelector(".lot-steps__heading.steps__item--active");
  if (activeStep) {
    const title = clean(activeStep.querySelector(".lot-steps__title")?.textContent).toLowerCase();
    if (title.includes("прием заявок")) {
      deadline = clean(activeStep.querySelector(".lot-steps__description")?.textContent);
    }
  }
  if (!deadline) {
    deadline = getText(".lot-start-registration .lot-card-info__value", sidebar) || "Не найдено";
  }

  // 6. Финансы: сначала берем итоговую цену лота/контракта из сайдбара, при отсутствии — цену позиции
  const finParts = [];

  const lotPrice = formatMoneyEl(sidebar.querySelector(".lot-item__sum.lot-price"));
  const unitPrice = formatMoneyEl(card.querySelector(".lot-units .lot-unit__price"));
  const finalPrice = lotPrice || unitPrice;
  if (finalPrice) {
    finParts.push(`Начальная цена: ${finalPrice}`);
  }

  const bidSecurity =
    getText(".lot-item__request .lot-item__summ", sidebar) ||
    getText(".lot-item__request .lot-card-info__value", sidebar);
  if (bidSecurity) {
    finParts.push(`Обеспечение заявки: ${bidSecurity}`);
  }

  const contractSecurity = getText(".lot-item__contact .lot-card-info__value", sidebar);
  if (contractSecurity) {
    finParts.push(`Обеспечение контракта: ${contractSecurity}`);
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
  if (host.includes("rt.roseltorg.ru")) {
    return null;
  }
  if (host.includes("roseltorg.ru") || document.querySelector(".lot-page__big-card")) {
    return "roseltorg.ru";
  }
  return null;
});