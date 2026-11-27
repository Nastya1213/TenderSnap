window.TenderSnap.parsers["rt.roseltorg.ru"] = async ({ clean }) => {
  const norm = (text) =>
    clean(
      String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+\[GMT\s*([+-]\d+)\]/gi, " (GMT$1)")
    );

  const isVisibleEl = (el) => {
    if (!el) return false;
    if (el.classList && el.classList.contains("x-hide-display")) return false;
    let cur = el;
    while (cur && cur !== document.body) {
      if (cur.classList && cur.classList.contains("x-hide-display")) return false;
      if (cur.style && cur.style.display === "none") return false;
      cur = cur.parentElement;
    }
    return true;
  };

  // Поиск значения в таблицах ExtJS (x-table-layout: td.th > label -> соседний td > label)
  const getExtField = (labelPatterns, { includeHidden = false } = {}) => {
    const patterns = (Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns]).map((p) =>
      p.toLowerCase().replace(/:$/, "").trim()
    );

    const rows = Array.from(document.querySelectorAll(".x-table-layout tr"));
    for (const pat of patterns) {
      for (const tr of rows) {
        if (!includeHidden && !isVisibleEl(tr)) continue;
        const cells = tr.querySelectorAll("td");
        if (cells.length < 2) continue;

        const labelCell = cells[0];
        const valCell = cells[1];
        if (!includeHidden && (!isVisibleEl(labelCell) || !isVisibleEl(valCell))) continue;

        const labelTxt = norm(labelCell.textContent).toLowerCase().replace(/:$/, "").trim();
        if (!labelTxt) continue;

        if (labelTxt === pat || labelTxt.startsWith(pat)) {
          const val = norm(valCell.textContent);
          if (val) return val;
        }
      }
    }

    // Запасной поиск по всем label внутри .keyvalue-panel-table
    const labels = Array.from(document.querySelectorAll(".keyvalue-panel-table label"));
    for (const pat of patterns) {
      for (const lbl of labels) {
        if (!includeHidden && !isVisibleEl(lbl)) continue;
        const txt = norm(lbl.textContent).toLowerCase().replace(/:$/, "").trim();
        if (txt === pat || txt.startsWith(pat)) {
          const td = lbl.closest("td");
          if (td && td.nextElementSibling && (includeHidden || isVisibleEl(td.nextElementSibling))) {
            const val = norm(td.nextElementSibling.textContent);
            if (val) return val;
          }
        }
      }
    }

    return "";
  };

  // 1. Номер извещения
  const numRaw = getExtField(["Номер извещения", "Номер процедуры", "Номер закупки"]);
  const number = numRaw
    ? (numRaw.startsWith("№") ? numRaw : `№ ${numRaw}`)
    : "Не найдено";

  // 2. Наименование процедуры
  const name =
    getExtField(["Наименование процедуры", "Наименование закупки", "Предмет договора"]) ||
    "Не найдено";

  // 3. Организатор
  const organizer =
    getExtField(["Организатор", "Наименование организатора", "Заказчик"]) ||
    "Не найдено";

  // 4. Место исполнения / поставки
  const place =
    getExtField([
      "Место поставки",
      "Место исполнения",
      "Адрес поставки",
      "Регион поставки",
      "Регион"
    ]) || "Не указано";

  // 5. Прием заявок до (строго окончание подачи заявок, не путать с датой публикации)
  const deadline =
    getExtField([
      "Дата и время окончания срока подачи заявок",
      "Дата окончания срока подачи заявок",
      "Окончание срока подачи заявок",
      "Дата окончания приема заявок",
      "Окончание приема заявок",
      "Прием заявок до"
    ]) || "Не найдено";

  // 6. Финансы
  const finParts = [];
  const startPrice = getExtField([
    "Начальная (максимальная) цена договора",
    "Начальная (максимальная) цена",
    "Начальная цена с НДС",
    "Начальная цена"
  ]);
  if (startPrice) {
    finParts.push(`Начальная цена: ${startPrice}`);
  }

  const bidSec = getExtField(["Размер обеспечения заявки", "Обеспечение заявки"]);
  if (bidSec && bidSec.toLowerCase() !== "нет" && bidSec !== "0") {
    finParts.push(`Обеспечение заявки: ${bidSec}`);
  }

  const contractSec = getExtField([
    "Размер обеспечения исполнения договора",
    "Обеспечение исполнения договора",
    "Обеспечение договора"
  ]);
  if (contractSec && contractSec.toLowerCase() !== "нет" && contractSec !== "0") {
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
  if (host.includes("rt.roseltorg.ru")) {
    return "rt.roseltorg.ru";
  }
  return null;
});