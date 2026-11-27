window.TenderSnap.parsers["kontur.ru"] = async ({ clean, getText }) => {
  let number = "Не найдено";
  const pubInfo = getText(".purchase-description__publication-info");
  const numMatch = pubInfo.match(/№\s*([\d-]+)/);
  if (numMatch) {
    number = `№ ${numMatch[1]}`;
  }

  const name = getText("h1.purchase-description__title") || getText("h1") || "Не найдено";

  let organizer = document.querySelector('[data-tid="lotCustomerActions"]')?.getAttribute("data-name") || "";
  if (!organizer) {
    const infoEl = document.querySelector(".lot-customer__info");
    if (infoEl && infoEl.childNodes.length > 0) {
      organizer = clean(infoEl.childNodes[0].textContent);
    }
  }

  let place = "Не найдено";
  const placeBlock = document.querySelector(".lot-customer__delivery-place .tender-named-values_value");
  if (placeBlock) {
    const clone = placeBlock.cloneNode(true);
    clone.querySelectorAll("button").forEach((btn) => btn.remove());
    place = clean(clone.textContent);
  }

  const deadline =
    getText(".purchase-status__app-submission .purchase-status__result") ||
    getText(".purchase-status__result") ||
    "Не найдено";

  let finance = "Не найдено";
  const priceBlock = document.querySelector('[data-tid="purchaseDescriptionPrices"]');
  if (priceBlock) {
    const rows = Array.from(priceBlock.querySelectorAll(".tender-named-values_row"));
    const finParts = rows
      .map((row) => {
        const label = getText(".tender-named-values_name", row);
        const val =
          getText(".tender-named-values_original-price", row) ||
          getText(".tender-named-values_value", row);
        return label && val ? `${label}: ${val}` : "";
      })
      .filter(Boolean);
    if (finParts.length > 0) {
      finance = finParts.join(" | ");
    }
  }

  const sourceLinks = [];
  const eisLink = document.querySelector("#headerSourceLink");
  if (eisLink && eisLink.href) {
    sourceLinks.push(`${clean(eisLink.innerText)}: ${eisLink.href}`);
  }
  const allRows = Array.from(document.querySelectorAll(".tender-named-values_row"));
  const platformRow = allRows.find((r) => getText(".tender-named-values_name", r) === "Площадка");
  if (platformRow) {
    const etpLink = platformRow.querySelector("a.l-link");
    if (etpLink && etpLink.href) {
      sourceLinks.push(`${clean(etpLink.innerText)}: ${etpLink.href}`);
    }
  }

  return {
    number,
    name,
    organizer: organizer || "Не найдено",
    place,
    deadline,
    finance,
    sources: sourceLinks.length > 0 ? sourceLinks.join(" ; ") : location.href
  };
};
