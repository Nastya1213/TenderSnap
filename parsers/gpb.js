(function () {
  const cleanGpbVal = (text, clean) => {
    const cleaned = text.replace(
      /Справка по контрагенту|Рассчитать логистику|Получить банковскую гарантию или кредит|Ускоренное зачисление/gi,
      ""
    );
    return clean(cleaned);
  };

  // 1. ЭТП ГПБ / Стратег (etpgpb.ru, goz-corp.etpgpb.ru)
  window.TenderSnap.parsers["etpgpb.ru"] = async ({ clean }) => {
    const getGpbField = (labelText) => {
      const labels = Array.from(document.querySelectorAll(".kvp-label, td, th"));
      const found = labels.find((el) => clean(el.textContent).toLowerCase().includes(labelText.toLowerCase()));
      if (found) {
        const cell = found.closest("td") || found.parentElement;
        if (cell && cell.nextElementSibling) {
          return cleanGpbVal(cell.nextElementSibling.textContent, clean);
        }
      }
      return "";
    };

    const number = getGpbField("Номер извещения:") || getGpbField("Номер закупки:") || "Не найдено";
    const name = getGpbField("Наименование закупки:") || getGpbField("Предмет договора:") || "Не найдено";
    const organizer = getGpbField("Наименование организатора:") || "Не найдено";

    let place =
      getGpbField("Регион поставки товаров") ||
      getGpbField("Место рассмотрения предложений:") ||
      getGpbField("Место поставки") ||
      "Не указано";
    place = place.replace(/Рассчитать логистику.*/gi, "").trim();

    let deadline = getGpbField("Дата и время окончания срока подачи заявок:") || "Не найдено";
    deadline = deadline.replace(/\[GMT.*?\]/i, "").trim();

    const finParts = [];
    const startPrice = getGpbField("Начальная цена с НДС:") || getGpbField("Начальная цена:");
    if (startPrice) {
      finParts.push(`Начальная цена: ${startPrice} ₽`);
    }
    const fee = getGpbField("Взимание платы оператором");
    if (fee) {
      finParts.push(`Плата оператора: ${fee}`);
    }

    return {
      number,
      name,
      organizer,
      place: place || "Не указано",
      deadline,
      finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
      sources: location.href
    };
  };

  // 2. ЭТП Газпромбанк (etpgaz.gazprombank.ru)
  window.TenderSnap.parsers["gazprombank.ru"] = async ({ clean }) => {
    const getGpbLabelVal = (labelText) => {
      const labels = Array.from(document.querySelectorAll("label, .kvp-label, td, th"));
      const found = labels.find((el) => clean(el.textContent).toLowerCase().includes(labelText.toLowerCase()));
      if (found) {
        const cell = found.closest("td") || found.parentElement;
        if (cell && cell.nextElementSibling) {
          return cleanGpbVal(cell.nextElementSibling.textContent, clean);
        }
      }
      return "";
    };

    const numRaw = getGpbLabelVal("Номер извещения:") || getGpbLabelVal("Номер закупки:");
    const number = numRaw ? `№ ${numRaw.replace(/^№\s*/, "")}` : "Не найдено";
    const name = getGpbLabelVal("Наименование закупки:") || getGpbLabelVal("Предмет договора (лота):") || "Не найдено";

    let organizer = getGpbLabelVal("Наименование организатора:") || "Не найдено";
    organizer = organizer.replace(/Справка по контрагенту.*/gi, "").trim();

    let place =
      getGpbLabelVal("Регион поставки товаров") ||
      getGpbLabelVal("Место поставки") ||
      getGpbLabelVal("Место рассмотрения") ||
      "Согласно закупочной документации";
    place = place.replace(/Рассчитать логистику.*/gi, "").trim();

    let deadline =
      getGpbLabelVal("Дата и время окончания срока подачи заявок") ||
      getGpbLabelVal("Окончание подачи заявок") ||
      "Не найдено";
    deadline = deadline.replace(/\(GMT.*?\)/i, "").trim();

    const finParts = [];
    let startPrice = getGpbLabelVal("Начальная (максимальная) цена:") || getGpbLabelVal("Начальная цена с НДС:");
    if (startPrice) {
      startPrice = startPrice.split(/Получить|Ускоренное/)[0].trim();
      finParts.push(`Начальная цена: ${startPrice} ₽`);
    }

    const ensureContract = getGpbLabelVal("Размер обеспечения исполнения договора:");
    if (ensureContract && ensureContract !== "не установлено") {
      finParts.push(`Обеспечение договора: ${ensureContract}`);
    }

    return {
      number,
      name,
      organizer,
      place: place || "Согласно закупочной документации",
      deadline,
      finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
      sources: location.href
    };
  };

  window.TenderSnap.detectors.push((host) => {
    if (host.includes("gazprombank.ru")) return "gazprombank.ru";
    if (host.includes("etpgpb.ru") || document.querySelector(".keyvalue-panel-table")) return "etpgpb.ru";
    return null;
  });
})();
