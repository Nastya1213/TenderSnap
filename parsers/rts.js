window.TenderSnap.parsers["rts-tender.ru"] = async ({ clean, getText }) => {
  const cardRoot = document.querySelector(".card-item") || document;

  const number = getText(".card-item__about a.link", cardRoot) || getText(".card-item__about", cardRoot) || "Не найдено";
  const name =
    getText('h1.main-title[data-annotation="PurchaseName"]') ||
    getText("h1.main-title") ||
    getText("h1") ||
    "Не найдено";

  let organizer = "Не найдено";
  const orgBlocks = Array.from(cardRoot.querySelectorAll(".card-item__organization"));
  const orgBlock =
    orgBlocks.find((b) => getText(".card-item__organization-title", b).toUpperCase().includes("ОРГАНИЗАТОР")) ||
    orgBlocks[0];

  if (orgBlock) {
    const orgMain = orgBlock.querySelector(".card-item__organization-main");
    if (orgMain) {
      const nameEl = orgMain.querySelector("a.text--bold, span.text--bold");
      if (nameEl) {
        const clone = nameEl.cloneNode(true);
        clone.querySelectorAll(".show_statistic_organizer").forEach((el) => el.remove());
        organizer = clean(clone.textContent);
      }
      const innP = Array.from(orgMain.querySelectorAll("p")).find((p) => p.textContent.includes("ИНН"));
      if (innP && organizer !== "Не найдено") {
        const cloneP = innP.cloneNode(true);
        cloneP.querySelector("span.text--bold")?.remove();
        cloneP.querySelector('a[href*="/poisk/region/"]')?.remove();
        const innText = clean(cloneP.textContent).replace(/\.\s*$/, "");
        if (innText) organizer += ` (${innText})`;
      }
    }
  }

  const region = getText('a[href*="/poisk/region/"]', cardRoot);
  const address =
    getText('[itemprop="areaServed"]', cardRoot) ||
    getText(".content-address", cardRoot).replace(/^Адрес поставки:\s*/i, "");
  const place = [region, address].filter(Boolean).join(" — ") || "Согласно закупочной документации";

  let deadline = getText(".card-item__info-end-date time", cardRoot);
  if (!deadline) {
    deadline = getText(".card-item__info-end-date", cardRoot)
      .split("|")[0]
      .replace(/^Подать заявку до:\s*/i, "")
      .trim();
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

  const aboutLinks = Array.from(cardRoot.querySelectorAll(".card-item__about a.link")).map(
    (a) => `${clean(a.innerText)}: ${a.href}`
  );
  const sources =
    aboutLinks.length > 0 ? `${aboutLinks.join(" ; ")} ; Карточка: ${location.href}` : location.href;

  return {
    number,
    name,
    organizer,
    place,
    deadline: deadline || "Не найдено",
    finance,
    sources
  };
};

window.TenderSnap.detectors.push((host) => {
  if (host.includes("rts-tender.ru") || document.querySelector('[itemprop="areaServed"]') || document.querySelector(".content-address")) {
    return "rts-tender.ru";
  }
  return null;
});
