window.TenderSnap.parsers["komtender.ru"] = async ({ clean, getText, resolveRedirectUrl }) => {
  const getBlockField = (labelName) => {
    const labels = Array.from(document.querySelectorAll(".tender-body__label"));
    const found = labels.find(
      (el) =>
        clean(el.innerText).toLowerCase() === labelName.toLowerCase() ||
        clean(el.innerText).toLowerCase().includes(labelName.toLowerCase())
    );
    if (found) {
      const field = found.parentElement.querySelector(".tender-body__field");
      if (field) return clean(field.innerText);
    }
    return "";
  };

  const numRaw = getText(".tender-info-link__number");
  const number = numRaw ? `№ ${numRaw.replace(/^№\s*/, "")}` : getBlockField("Номер") || "Не найдено";
  const name =
    getText('h1.tender-header__h4[data-id="name"]') ||
    getText("h1.tender-header__h4") ||
    getText("h1") ||
    "Не найдено";

  let organizer = getText(".tender-customer__name") || "Не найдено";
  const inn = document.querySelector(".toggle-counterparty[inn]")?.getAttribute("inn") || getBlockField("ИНН");
  if (inn && organizer !== "Не найдено") {
    organizer += ` (ИНН ${inn})`;
  }

  const place =
    getBlockField("Место поставки") ||
    getBlockField("Место исполнения") ||
    getBlockField("Регион") ||
    getBlockField("Адрес") ||
    "Не указано";

  let deadline = "Не найдено";
  const statusBlock = document.querySelector(".tender-status");
  if (statusBlock) {
    const clone = statusBlock.cloneNode(true);
    clone.querySelector(".tender-status__title")?.remove();
    clone.querySelector(".tender-body__you-endtime")?.remove();
    deadline = clean(clone.innerText);
  }

  const finLabels = ["Начальная цена", "Обеспечение заявки", "Обеспечение контракта", "Аванс"];
  const finParts = finLabels
    .map((lbl) => {
      const val = getBlockField(lbl);
      return val ? `${lbl}: ${val}` : "";
    })
    .filter(Boolean);
  const finance = finParts.length > 0 ? finParts.join(" | ") : "Не найдено";

  const rawLinks = Array.from(document.querySelectorAll("li.tender-body__resources-item a"));
  const resolvedLinks = await Promise.all(
    rawLinks.map(async (a) => {
      const label = clean(a.innerText);
      const finalUrl = a.href.includes("/away?") ? await resolveRedirectUrl(a.href) : a.href;
      return `${label}: ${finalUrl}`;
    })
  );
  const sources = resolvedLinks.length > 0 ? resolvedLinks.join(" ; ") : location.href;

  return {
    number,
    name,
    organizer,
    place,
    deadline,
    finance,
    sources
  };
};

window.TenderSnap.detectors.push(() => {
  if (document.querySelector("h1.tender-header__h4") || document.querySelector(".tender-customer__name")) {
    return "komtender.ru";
  }
  return null;
});
