(async () => {
  const { parsers, detectors, utils } = window.TenderSnap;

  const showToast = (title, message, isError = false) => {
    const oldToast = document.getElementById("universal-parser-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.id = "universal-parser-toast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      maxWidth: "420px",
      backgroundColor: isError ? "#d32f2f" : "#263238",
      color: "#ffffff",
      padding: "16px 20px",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: "2147483647",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      lineHeight: "1.45",
      opacity: "0",
      transform: "translateY(16px)",
      transition: "opacity 0.25s ease, transform 0.25s ease",
      cursor: "pointer",
      borderLeft: isError ? "5px solid #ff8a80" : "5px solid #4caf50"
    });

    toast.innerHTML = `
      <div style="font-weight:600; font-size:14px; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>${isError ? "❌ " : "✅ "}${title}</span>
        <span style="font-size:11px; opacity:0.6; font-weight:normal; margin-left:12px;">Закрыть ✕</span>
      </div>
      <div style="white-space:pre-wrap; opacity:0.9; max-height:220px; overflow-y:auto;"></div>
    `;
    toast.lastElementChild.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    const hide = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(16px)";
      setTimeout(() => toast.remove(), 250);
    };
    toast.addEventListener("click", hide);
    setTimeout(hide, 4000);
  };

  const host = location.hostname;
  const domainMatches = Object.keys(parsers)
    .filter((domain) => host.includes(domain))
    .sort((a, b) => b.length - a.length);

  let matchedKey = domainMatches[0] || null;

  if (!matchedKey) {
    for (const detector of detectors) {
      const key = detector(host);
      if (key) {
        matchedKey = key;
        break;
      }
    }
  }

  if (!matchedKey || !parsers[matchedKey]) {
    showToast("Площадка пока не настроена", `Для сайта ${host} еще нет правил парсинга.`, true);
    return;
  }

  const data = await parsers[matchedKey](utils);

  const resultText =
`Номер: ${data.number}
Наименование: ${data.name}
Организатор: ${data.organizer}
Место исполнения: ${data.place}
Прием заявок до: ${data.deadline}
Финансы: ${data.finance}
Источники: ${data.sources}`;

  navigator.clipboard
    .writeText(resultText)
    .then(() => showToast("Данные успешно скопированы", resultText, false))
    .catch((err) => showToast("Ошибка копирования", String(err), true));
})();
