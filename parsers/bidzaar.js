window.TenderSnap.parsers["bidzaar.com"] = async ({ clean, getText }) => {
  // 1. Номер запроса
  const codeRaw = getText('[data-testid="pl-shared-request-info-number-text"]');
  const codeMatch = codeRaw.match(/Код запроса:\s*(.+)/i);
  const number = codeMatch ? `№ ${clean(codeMatch[1])}` : codeRaw || "Не найдено";

  // 2. Наименование закупки
  const name =
    getText("h1.name-value") ||
    getText('[data-testid="pl-request-title-name"] h1') ||
    getText("h1") ||
    "Не найдено";

  // 3. Организатор
  const organizer =
    getText('[data-testid="pl-request-company-link"] .name') ||
    getText(".row-company .name") ||
    "Не найдено";

  // 4. Место исполнения (ищем "Адрес:" в описании или берем хвост после "по адресу:" из заголовка)
  let place = "";
  const descParagraphs = Array.from(
    document.querySelectorAll('[data-testid="pl-request-description-viewer-text"] p')
  );
  const addressP = descParagraphs.find((p) => /Адрес\s*:/i.test(p.textContent));
  if (addressP) {
    const clone = addressP.cloneNode(true);
    clone.querySelectorAll("a").forEach((a) => a.remove());
    let addrText = clean(clone.textContent).replace(/^Адрес\s*:\s*/i, "");
    addrText = addrText.replace(/\s*Кадастровый номер\s*-\s*[\d:]+/i, "").trim();
    place = addrText;
  }
  if (!place) {
    const h1AddrMatch = name.match(/по адресу:\s*(.+)$/i);
    if (h1AddrMatch) {
      place = clean(h1AddrMatch[1]);
    }
  }
  if (!place) {
    place = "Согласно закупочной документации";
  }

  // 5. Дата окончания приема предложений
  const deadline =
    getText('[data-testid="req-rules-general-main-readonly-acceptance-end-date-text"]') ||
    getText('[data-testid="pl-shared-status"] .date') ||
    "Не найдено";

  // 6. Финансы и ключевые условия
  const finParts = [];
  const tradingType = getText('[data-testid="pl-shared-request-info-types-text"] .types-trading');
  if (tradingType) finParts.push(tradingType);

  const currency = getText('[data-testid="req-currencies-primary-text"]');
  if (currency) finParts.push(`Валюта: ${currency}`);

  const fixPriceP = descParagraphs.find((p) => /Фиксация цены/i.test(p.textContent));
  if (fixPriceP) {
    finParts.push(clean(fixPriceP.textContent));
  }

  const paymentP = descParagraphs.find((p) => /Условия оплаты/i.test(p.textContent));
  if (paymentP) {
    finParts.push(clean(paymentP.textContent));
  }

  const commissionText = getText('[data-testid="pl-shared-participate"] .commission-title');
  if (/Комиссию оплачивает победитель/i.test(commissionText)) {
    finParts.push("Комиссию оплачивает победитель");
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
  if (host.includes("bidzaar.com") || document.querySelector(".pl-request-wrapper")) {
    return "bidzaar.com";
  }
  return null;
});