window.TenderSnap.parsers["zakupki.gov.ru"] = async ({ clean, getText }) => {
  let number = "Не найдено";
  const regNum = new URLSearchParams(location.search).get("regNumber");
  if (regNum) {
    number = `№ ${regNum}`;
  } else {
    number =
      getText(".registry-entry__header-mid__number a") ||
      getText(".cardMainInfo__purchaseLink a") ||
      "Не найдено";
  }

  const name =
    getText(".registry-entry__body-value") ||
    getText(".cardMainInfo__section .cardMainInfo__content.text-break") ||
    getText(".cardMainInfo__section .cardMainInfo__content") ||
    "Не найдено";

  const organizer =
    getText('.registry-entry__body-block a[href*="/epz/organization/"]') ||
    getText(".sectionMainInfo__body .cardMainInfo__content a") ||
    "Не найдено";

  const place = "Согласно закупочной документации";

  const deadlineRaw =
    getText(".data-block__value") ||
    getText(".date .cardMainInfo__section:last-child .cardMainInfo__content") ||
    "Не найдено";
  const deadline = deadlineRaw.replace(/Окончание подачи заявок/gi, "").trim();

  const finParts = [];
  const price = getText(".price-block__value") || getText(".cardMainInfo .cost");
  if (price) finParts.push(`Начальная цена: ${price}`);

  const sections = Array.from(document.querySelectorAll(".blockInfo__section, section"));
  sections.forEach((sec) => {
    const titleEl = sec.querySelector(".section__title");
    const infoEl = sec.querySelector(".section__info");
    if (titleEl && infoEl) {
      const tText = clean(titleEl.textContent).toLowerCase();
      const iText = clean(infoEl.textContent);
      if (tText.includes("размер обеспечения заявки")) {
        finParts.push(`Обеспечение заявки: ${iText}`);
      }
      if (tText.includes("размер обеспечения исполнения контракта")) {
        finParts.push(`Обеспечение контракта: ${iText}`);
      }
    }
  });

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
  if (host.includes("zakupki.gov.ru") || document.querySelector(".cardMainInfo")) {
    return "zakupki.gov.ru";
  }
  return null;
});
