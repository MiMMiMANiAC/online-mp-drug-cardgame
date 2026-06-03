const cards = [
  {
    id: "heroin",
    name: "Heroin",
    kind: "Substanz",
    cost: 4,
    icon: "!",
    effect: "+6 Gesundheit. Verhindere den nächsten Stabilitätsschaden.",
    drawback: "+2 Rausch, +1 Abhängigkeit, mische 2x Craving.",
    flavor: "Kurzfristige Betäubung, langfristige Rechnung.",
  },
  {
    id: "kokain",
    name: "Kokain",
    kind: "Substanz",
    cost: 3,
    icon: ">>",
    effect: "Eine Person erhält +3 Angriff und kann sofort handeln.",
    drawback: "+2 Fahndungsdruck, -2 Kontrolle, +1 Rausch.",
    flavor: "Tempo fühlt sich wie Kontrolle an. Ist es aber nicht.",
  },
  {
    id: "mdma",
    name: "MDMA",
    kind: "Substanz",
    cost: 3,
    icon: "+/-",
    effect: "Alle eigenen Personen erhalten +1/+1. +2 Stabilität.",
    drawback: "Nächster Zug: -3 Stabilität.",
    flavor: "Der Comedown steht schon im Kalender.",
  },
  {
    id: "cannabis",
    name: "Cannabis",
    kind: "Substanz",
    cost: 2,
    icon: "?",
    effect: "Reduziere den nächsten Stabilitätsschaden um 2.",
    drawback: "Bei Paranoia: kein Kartenziehen im nächsten Zug.",
    flavor: "Entspannt den Moment, verhandelt aber mit dem Kopf.",
  },
  {
    id: "substanztest",
    name: "Substanztest",
    kind: "Aktion",
    cost: 1,
    icon: "ok",
    effect: "Reduziere den nächsten Substanz-Nachteil um 2. Ziehe 1 Karte.",
    drawback: "",
    flavor: "Wissen ist kein Schild, aber oft ein Airbag.",
  },
  {
    id: "therapieplatz",
    name: "Therapieplatz",
    kind: "Ort",
    cost: 4,
    icon: "+",
    effect: "-2 Abhängigkeit. Du kannst in diesem Zug nicht angreifen.",
    drawback: "",
    flavor: "Der langsamste Zug im Spiel. Manchmal der stärkste.",
  },
];

const hand = document.querySelector("#hand");
const playedCard = document.querySelector("#played-card");
const inspectorTitle = document.querySelector("#inspector-title");
const inspectorText = document.querySelector("#inspector-text");

for (const card of cards) {
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  button.innerHTML = `
    <span class="card-cost">${card.cost}</span>
    <span class="card-kind">${card.kind}</span>
    <strong>${card.name}</strong>
    <span class="card-art" aria-hidden="true">${card.icon}</span>
    <span class="card-effect">${card.effect}</span>
    ${card.drawback ? `<span class="card-drawback">${card.drawback}</span>` : ""}
  `;
  button.addEventListener("click", () => play(card));
  hand.appendChild(button);
}

function play(card) {
  inspectorTitle.textContent = card.name;
  inspectorText.textContent = card.flavor;
  playedCard.textContent = card.name;
  playedCard.classList.remove("animate");
  void playedCard.offsetWidth;
  playedCard.classList.add("animate");
}
