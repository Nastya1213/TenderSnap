window.TenderSnap.parsers["etprf.ru"] = async ({ clean }) => {
  const getDetailVal = (labelName) => {
    const labels = Array.from(document.querySelectorAll("td.td-label"));
    const found = labels.find((td) => {
      const text = clean(td.textContent).toLowerCase();
      return text === labelName.toLowerCase() || text.startsWith(labelName.toLowerCase());
    });
    if (found && found.nextElementSibling) {
      const clone = found.nextElementSibling.cloneNode(true);
      clone.querySelectorAll("a, button, .property-button").forEach((el) => el.remove());
      return clean(clone.textContent);
    }
    return "";
  };

  const numRaw = getDetailVal("Номер извещения");
  const number = numRaw ? `№ ${numRaw}` : "Не найдено";
  const name =
    getDetailVal("Наименование закупки") ||
    getDetailVal("Полное наименование (предмет договора)") ||
    "Не найдено";

  let organizer = "Не найдено";
  const orgHeaders = Array.from(document.querySelectorAll("h2")).filter((h) =>
    h.textContent.includes("Организация, осуществляющая размещение")
  );
  if (orgHeaders.length > 0) {
    let nextEl = orgHeaders[0].nextElementSibling;
    while (nextEl && nextEl.tagName !== "H2") {
      if (nextEl.classList && nextEl.classList.contains("details-table")) {
        const label = clean(nextEl.querySelector(".td-label")?.textContent);
        if (label === "Наименование") {
          organizer = clean(nextEl.querySelector(".td-value")?.textContent);
          break;
        }
      }
      nextEl = nextEl.nextElementSibling;
    }
  }
  if (organizer === "Не найдено") {
    const orgLink = document.querySelector('a[href*="/Customer/id/"]');
    if (orgLink) organizer = clean(orgLink.textContent);
  }

  const place =
    getDetailVal("Место поставки, выполнения работ, оказания услуг") ||
    getDetailVal("Место поставки") ||
    "Не указано";
  let deadline = getDetailVal("Окончание срока подачи заявок") || "Не найдено";
  deadline = deadline.split("\\Местное")[0].trim();

  const finParts = [];
  const startPrice =
    getDetailVal("Начальная цена") ||
    getDetailVal("Общая начальная цена по позициям/номенклатуре");
  if (startPrice) {
    finParts.push(`Начальная цена: ${startPrice.replace(/руб\.?/gi, "").trim()} ₽`);
  }

  let bidSec =
    getDetailVal("Размер обеспечения(резервирования оплаты) заявки") ||
    getDetailVal("Размер обеспечения (резервирования оплаты) заявки") ||
    getDetailVal("Размер обеспечения заявки");

  let contractSec =
    getDetailVal("Размер обеспечения исполнения договора") ||
    getDetailVal("Размер обеспечения договора");

  const custTable = document.querySelector('table[data-orm-table-id="CustomerRequirements"]');
  if (custTable) {
    const headers = Array.from(custTable.querySelectorAll("th")).map((th) => clean(th.textContent).toLowerCase());
    const dataRow = custTable.querySelectorAll("tr")[1];
    if (dataRow) {
      const cells = Array.from(dataRow.querySelectorAll("td")).map((td) => clean(td.textContent));

      if (!bidSec) {
        const bidSizeIdx = headers.findIndex((h) => h.includes("размер обеспечения заявки"));
        const bidReqIdx = headers.findIndex((h) => h.includes("требуется обеспечение заявки"));
        if (bidSizeIdx !== -1 && cells[bidSizeIdx]) {
          bidSec = cells[bidSizeIdx];
        } else if (bidReqIdx !== -1 && cells[bidReqIdx]) {
          bidSec = cells[bidReqIdx];
        }
      }

      if (!contractSec) {
        const contractSizeIdx = headers.findIndex(
          (h) => h.includes("размер обеспечения договора") || h.includes("размер обеспечения исполнения договора")
        );
        const contractReqIdx = headers.findIndex((h) => h.includes("требуется обеспечение договора"));
        if (contractSizeIdx !== -1 && cells[contractSizeIdx]) {
          contractSec = cells[contractSizeIdx];
        } else if (contractReqIdx !== -1 && cells[contractReqIdx]) {
          contractSec = cells[contractReqIdx];
        }
      }
    }
  }

  const formatCurrency = (val) => {
    if (!val) return "";
    const cleaned = val.replace(/руб\.?/gi, "").trim();
    return /\d/.test(cleaned) && !cleaned.includes("₽") && !cleaned.includes("%") ? `${cleaned} ₽` : cleaned;
  };

  if (bidSec) {
    finParts.push(`Обеспечение заявки: ${formatCurrency(bidSec)}`);
  }

  const winnerFee = getDetailVal("Оплата с победителя");
  if (winnerFee) {
    finParts.push(`Оплата с победителя: ${formatCurrency(winnerFee)}`);
  }

  if (contractSec) {
    finParts.push(`Обеспечение договора: ${formatCurrency(contractSec)}`);
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

window.TenderSnap.detectors.push(() => {
  if (document.querySelector("table.details-table td.td-label")) {
    return "etprf.ru";
  }
  return null;
});
