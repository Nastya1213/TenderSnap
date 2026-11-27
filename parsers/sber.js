window.TenderSnap.parsers["sberbank-ast.ru"] = async ({ clean }) => {
  // --- Вариант 1: Классический табличный NBT без нового Vue-контейнера #app.theme2023 ---
  const hasVueApp = Boolean(document.querySelector("#app.theme2023 .a-text"));
  const isLegacyNbt =
    !hasVueApp &&
    Boolean(document.querySelector('#XMLContainer, table.block td.block-lable, [content^="leaf:"]'));

  if (isLegacyNbt) {
    const getLeaf = (leafName) => {
      const el = document.querySelector(`[content="leaf:${leafName}"]`);
      if (!el) return "";
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return clean(el.value);
      if (el.tagName === "SELECT") return clean(el.options[el.selectedIndex]?.text);
      return clean(el.textContent);
    };

    const getBlockCell = (labelText) => {
      const labels = Array.from(document.querySelectorAll("td.block-lable"));
      const found = labels.find((td) => {
        const clone = td.cloneNode(true);
        clone.querySelectorAll(".formElement-HelpContainer, i, label").forEach((n) => n.remove());
        const txt = clean(clone.textContent).toLowerCase();
        return txt === labelText.toLowerCase() || txt.startsWith(labelText.toLowerCase());
      });
      if (found && found.nextElementSibling) {
        const valCell = found.nextElementSibling;
        const visibleSpan = valCell.querySelector("span:not([style*='display:none'])");
        return clean((visibleSpan || valCell).textContent);
      }
      return "";
    };

    const numberRaw =
      getLeaf("PurchaseCode") ||
      getBlockCell("Номер процедуры") ||
      getLeaf("PurchaseId") ||
      "";

    const name =
      getLeaf("PurchaseName") ||
      getLeaf("BidName") ||
      getBlockCell("Наименование процедуры") ||
      "Не найдено";

    let organizer =
      getLeaf("OrgName") ||
      getBlockCell("Наименование Организатора") ||
      getBlockCell("Наименование заказчика") ||
      "Не найдено";

    const inn = getLeaf("OrgINN") || getBlockCell("ИНН Организатора");
    if (inn && organizer !== "Не найдено" && !organizer.includes(inn)) {
      organizer += ` (ИНН ${inn})`;
    }

    const region = getLeaf("PurchaseRegionIdName") || getBlockCell("Регион");
    const deliveryPlace = getLeaf("BidDeliveryPlace") || getBlockCell("Место поставки");
    const placeParts = [region, deliveryPlace].filter(Boolean);
    const place = placeParts.length > 0 ? placeParts.join(" — ") : "Не указано";

    const deadline =
      getLeaf("ApplSubmissionStopDate") ||
      getBlockCell("Дата и время окончания срока подачи заявок на участие") ||
      "Не найдено";

    const finParts = [];
    const priceRaw = getLeaf("BidPrice") || getBlockCell("Начальная (максимальная) цена договора");
    const priceType = getLeaf("BidPriceCulcTypeName");
    if (priceRaw && priceRaw !== "0.00" && priceRaw !== "0") {
      finParts.push(`Начальная цена: ${priceRaw} ₽`);
    } else if (priceType) {
      finParts.push(priceType);
    }

    const supplyType = getLeaf("BidApplicationSupplyTypeName");
    const supplySumm = getLeaf("BidApplicationSupplySumm");
    if (supplySumm && supplySumm !== "0.00" && supplySumm !== "0") {
      finParts.push(`Обеспечение заявки: ${supplySumm} ₽`);
    } else if (supplyType) {
      finParts.push(`Обеспечение заявки: ${supplyType}`);
    }

    const eisNum = getLeaf("PurchaseIntegratorCode");
    const eisHref = getLeaf("PurchaseEISHref");
    let sources = location.href;
    if (eisHref) {
      sources = `ЕИС${eisNum ? ` № ${eisNum}` : ""}: ${eisHref} ; ЭТП: ${location.href}`;
    }

    return {
      number: numberRaw ? (numberRaw.startsWith("№") ? numberRaw : `№ ${numberRaw}`) : "Не найдено",
      name,
      organizer,
      place,
      deadline,
      finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
      sources
    };
  }

  // --- Вариант 2: Новый интерфейс Сбер-АСТ (SB, Транснефть, коммерческие секции на .a-text) ---
  const isHiddenElement = (el) => {
    let cur = el;
    while (cur && cur !== document.body) {
      if (cur.style && cur.style.display === "none") return true;
      cur = cur.parentElement;
    }
    return false;
  };

  const extractValueFromTextBlock = (el) => {
    // 1. Активный пункт в выпадающем списке (.a-static-select__input)
    const activeOption = el.querySelector(".a-list-item_active .a-list-item__label");
    if (activeOption && clean(activeOption.textContent)) {
      return clean(activeOption.textContent);
    }

    // 2. Заполненный input (не пустой и не только placeholder)
    const inputEl = el.querySelector("input.el-input__inner");
    if (inputEl && clean(inputEl.value)) {
      return clean(inputEl.value);
    }

    // 3. Обычный текстовый блок .a-text__block без контролов ввода
    const valEl = el.querySelector(".a-text__block");
    if (valEl && !valEl.querySelector(".a-input-base, .files-wrapper, .el-switch, .el-checkbox")) {
      const txt = clean(valEl.textContent);
      if (txt) return txt;
    }

    // 4. Вариант верстки вида <div class="a-text" style="display:flex"><div class="a-text__label">...</div><div><div class="a-text__row">0.00</div></div></div>
    const labelEl = el.querySelector(".a-text__label");
    if (labelEl) {
      for (const child of Array.from(el.children)) {
        if (child === labelEl) continue;
        if (child.querySelector(".a-input-base, .files-wrapper, .el-switch, .el-checkbox")) continue;
        const txt = clean(child.textContent);
        if (txt) return txt;
      }
    }

    return "";
  };

  const getSberField = (labelText) => {
    const search = labelText.toLowerCase();
    const textBlocks = Array.from(document.querySelectorAll(".a-text")).filter((el) => !isHiddenElement(el));

    for (const el of textBlocks) {
      const labelEl = el.querySelector(".a-text__label");
      if (!labelEl) continue;
      const txt = clean(labelEl.textContent).toLowerCase();
      if (txt === search) {
        const val = extractValueFromTextBlock(el);
        if (val) return val;
      }
    }

    for (const el of textBlocks) {
      const labelEl = el.querySelector(".a-text__label");
      if (!labelEl) continue;
      const txt = clean(labelEl.textContent).toLowerCase();
      if (txt.includes(search)) {
        const val = extractValueFromTextBlock(el);
        if (val) return val;
      }
    }

    return "";
  };

  const getCustomerFromTable = () => {
    const tableWrap = document.querySelector("#DynamicControlBidInfo_BidCustomersRO");
    if (!tableWrap) return { name: "", inn: "" };
    const headers = Array.from(tableWrap.querySelectorAll("thead th .cell p")).map((p) =>
      clean(p.textContent).toLowerCase()
    );
    const firstRow = tableWrap.querySelector("tbody tr.el-table__row");
    if (!firstRow) return { name: "", inn: "" };
    const cells = Array.from(firstRow.querySelectorAll("td")).map((td) => clean(td.textContent));

    const nameIdx = headers.findIndex((h) => h.includes("наименование заказчика"));
    const innIdx = headers.findIndex((h) => h === "инн" || h.includes("инн"));

    return {
      name: nameIdx !== -1 ? cells[nameIdx] || "" : "",
      inn: innIdx !== -1 ? cells[innIdx] || "" : ""
    };
  };

  const numberRaw =
    getSberField("Номер процедуры") ||
    getSberField("ИД процедуры") ||
    "";

  const name =
    getSberField("Наименование процедуры") ||
    getSberField("Предмет процедуры") ||
    getSberField("Наименование лота") ||
    "Не найдено";

  const tableCustomer = getCustomerFromTable();
  let organizer =
    getSberField("Наименование Организатора") ||
    getSberField("Наименование заказчика") ||
    getSberField("Организатор") ||
    tableCustomer.name ||
    "Не найдено";

  const inn =
    getSberField("ИНН Организатора") ||
    getSberField("ИНН заказчика") ||
    tableCustomer.inn ||
    "";

  if (inn && organizer !== "Не найдено" && !organizer.includes(inn)) {
    organizer += ` (ИНН ${inn})`;
  }

  const place =
    getSberField("Место поставки товара, выполнения работ, оказания услуг") ||
    getSberField("Место поставки товара") ||
    getSberField("Место рассмотрения") ||
    getSberField("Место нахождения") ||
    getSberField("Регион") ||
    "Не указано";

  const deadline =
    getSberField("Дата и время окончания срока подачи заявок на участие") ||
    getSberField("Окончание подачи заявок на участие") ||
    getSberField("Окончание срока подачи заявок") ||
    "Не найдено";

  const finParts = [];
  const startPrice =
    getSberField("Начальная (максимальная) цена договора") ||
    getSberField("Начальная цена процедуры") ||
    getSberField("Начальная (максимальная) цена");

  if (startPrice) {
    const nds = getSberField("Признак НДС");
    finParts.push(`Начальная цена: ${startPrice} ₽${nds ? ` (${nds})` : ""}`);
  }

  const ensureApp =
    getSberField("Размер обеспечения заявки, руб.") ||
    getSberField("Размер обеспечения заявки");

  if (ensureApp && ensureApp !== "0.00" && ensureApp !== "0" && ensureApp.toLowerCase() !== "не установлено") {
    finParts.push(`Обеспечение заявки: ${ensureApp} ₽`);
  }

  const operatorFee =
    getSberField("Обеспечение оплаты услуг оператора, руб.") ||
    getSberField("Обеспечение оплаты услуг оператора") ||
    getSberField("Стоимость процедуры") ||
    getSberField("Стоимость лота");

  if (operatorFee && operatorFee !== "0.00" && operatorFee !== "0") {
    finParts.push(`Оплата услуг оператора: ${operatorFee} ₽`);
  }

  return {
    number: numberRaw ? (numberRaw.startsWith("№") ? numberRaw : `№ ${numberRaw}`) : "Не найдено",
    name,
    organizer,
    place,
    deadline,
    finance: finParts.length > 0 ? finParts.join(" | ") : "Не найдено",
    sources: location.href
  };
};

window.TenderSnap.detectors.push((host) => {
  if (host.includes("sberbank-ast.ru") || host.includes("utp.sberbank-ast.ru")) {
    return "sberbank-ast.ru";
  }
  return null;
});