window.TenderSnap.parsers["saby.ru"] = async ({ clean, getText, getTableValueByLabel }) => {
  // 1. Номер закупки — ищем в кнопках/заголовках, но не в гигантских контейнерах
  let number = "Не найдено";
  const numCandidates = Array.from(
    document.querySelectorAll('.controls-BaseButton__text, [data-name="tender__tenderNumber"] a, h1, h2, .tender-card-tabs_firstTab__information')
  );
  const numEl = numCandidates.find((el) => /№\s*[\d\w\-\/]+/i.test(el.innerText) && el.innerText.length < 120);
  if (numEl) {
    const match = numEl.innerText.match(/№\s*([\d\w\-\/]+)/i);
    if (match) number = `№ ${match[1]}`;
  }

  // 2. Наименование тендера
  const name =
    getText('.tender-card__tender-name .tender-TextTrim__content[name="content"]') ||
    getText('.tender-TextTrim__content[name="content"]') ||
    getText(".tender-TextTrim__content") ||
    getText("h1") ||
    "Не найдено";

  // 3. Организатор
  const organizer =
    getText('[data-name="tender-Content__placername"]') ||
    getText(".tender-Card__placerName") ||
    getTableValueByLabel("Организатор") ||
    "Не найдено";

  // 4. Место исполнения / поставки
  let deliveryPlace = "";
  const placeContainer = document.querySelector('[data-name="tender-Content__dvPlace"]');
  if (placeContainer) {
    const detailText = getText(".tender__textContent_lineBreak", placeContainer);
    const regionText = getText(".tender-Regions", placeContainer);
    deliveryPlace = [regionText, detailText].filter(Boolean).join(" — ");
  }
  if (!deliveryPlace) {
    deliveryPlace = getText(".tender-Regions__brief") || getTableValueByLabel("Место исполнения") || getTableValueByLabel("Место поставки") || "Не указано";
  }

  // 5. Дата окончания приема заявок — строго из блока этапа .tender-TimeStages__stage
  let deadline = "";
  const stages = Array.from(document.querySelectorAll(".tender-TimeStages__stage"));
  const targetStage = stages.find((stage) => {
    const labelEl = stage.querySelector(".tender-TimeStages__nameStage");
    if (!labelEl) return false;
    const labelText = clean(labelEl.textContent).toLowerCase();
    return labelText.includes("прием заявок") || labelText.includes("подача заявок");
  });

  if (targetStage) {
    const dateEl = targetStage.querySelector(".tender-TimeStages__dateStage");
    if (dateEl) {
      const datePart = clean(dateEl.childNodes[0]?.textContent || "");
      const timePart = clean(dateEl.querySelector("span")?.textContent || "");
      deadline = [datePart, timePart].filter(Boolean).join(" ") || clean(dateEl.textContent);
    }
  }

  if (!deadline) {
    deadline = "Не найдено";
  }

  // 6. Финансы (НМЦК, аванс, обеспечение заявки)
  let priceDetails = "";
  const priceBox = document.querySelector(".tenderCards-Price");
  if (priceBox) {
    priceDetails = Array.from(priceBox.children)
      .map((r) => clean(r.innerText))
      .filter(Boolean)
      .join(" | ");
  } else {
    priceDetails = getTableValueByLabel("Начальная цена") || "Не найдено";
  }

  // 7. Источники
  let sources = "";
  const linksContainer = document.querySelector('[data-name="tender-Card__platformLinks"]');
  if (linksContainer) {
    sources = Array.from(linksContainer.querySelectorAll("a"))
      .map((a) => `${clean(a.innerText)}: ${a.href}`)
      .join(" ; ");
  }

  return {
    number,
    name,
    organizer,
    place: deliveryPlace,
    deadline,
    finance: priceDetails,
    sources: sources || location.href
  };
};

window.TenderSnap.detectors.push((host) => (host.includes("saby.ru") ? "saby.ru" : null));