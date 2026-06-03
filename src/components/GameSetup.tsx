import { useState } from "react";
import { cards, cardById } from "../game/cards";
import { playableFactions } from "../game/factions";
import { starterDecks } from "../game/state";
import type { FactionId } from "../game/types";

interface GameSetupProps {
  deck: string[];
  friendCodeDraft: string;
  friends: FriendEntry[];
  onlineError?: string;
  onlineRoomCode: string;
  onlineServerUrl: string;
  onlineShareLink?: string;
  onlineStatus?: string;
  playerFriendCode: string;
  playerName: string;
  selectedFaction: FactionId;
  onAddCard: (cardId: string) => void;
  onAddFriend: () => void;
  onClearDeck: () => void;
  onCreateOnlineRoom: () => void;
  onJoinOnlineRoom: () => void;
  onLoadStarterDeck: () => void;
  onOnlineRoomCodeChange: (roomCode: string) => void;
  onOnlineServerUrlChange: (serverUrl: string) => void;
  onPlayerNameChange: (playerName: string) => void;
  onFriendCodeDraftChange: (friendCode: string) => void;
  onRemoveFriend: (friendCode: string) => void;
  onRemoveCard: (index: number) => void;
  onSelectFaction: (faction: FactionId) => void;
  onStart: () => void;
}

export function GameSetup({
  deck,
  friendCodeDraft,
  friends,
  onlineError,
  onlineRoomCode,
  onlineServerUrl,
  onlineShareLink,
  onlineStatus,
  playerFriendCode,
  playerName,
  selectedFaction,
  onAddCard,
  onAddFriend,
  onClearDeck,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onLoadStarterDeck,
  onOnlineRoomCodeChange,
  onOnlineServerUrlChange,
  onPlayerNameChange,
  onFriendCodeDraftChange,
  onRemoveFriend,
  onRemoveCard,
  onSelectFaction,
  onStart,
}: GameSetupProps) {
  const [collectionTab, setCollectionTab] = useState<"class" | "neutral">("class");
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const selected = playableFactions.find((faction) => faction.id === selectedFaction) ?? playableFactions[0];
  const visibleCards = cards.filter(
    (card) => (collectionTab === "class" ? card.faction === selectedFaction : card.faction === "neutral"),
  );
  const deckValidation = validateDeck(deck, selectedFaction);
  const previewCard = previewCardId ? cardById.get(previewCardId) : null;
  const deckStats = getDeckStats(deck, selectedFaction);

  return (
    <main className="setup-shell">
      <section className="setup-hero">
        <h1>Nebenwirkungen</h1>
        <p>Klasse waehlen, Deck bauen, Karten mischen, Starthand ziehen.</p>
      </section>

      <section className="setup-grid">
        <aside className="setup-panel faction-picker">
          <h2>Klasse</h2>
          {playableFactions.map((faction) => (
            <button
              className={selectedFaction === faction.id ? "is-active" : ""}
              key={faction.id}
              onClick={() => onSelectFaction(faction.id)}
              type="button"
            >
              <strong>{faction.name}</strong>
              <span>{faction.role}</span>
            </button>
          ))}
          <div className="hero-power-preview">
            <span>Heldenskill</span>
            <strong>{selected.heroPower.name}</strong>
            <p>{selected.heroPower.text}</p>
          </div>
        </aside>

        <section className="setup-panel collection">
          <div className="collection-heading">
            <h2>Kartensammlung</h2>
            <div className="collection-tabs" role="tablist" aria-label="Kartentypen">
              <button
                className={collectionTab === "class" ? "is-active" : ""}
                onClick={() => setCollectionTab("class")}
                type="button"
              >
                Klassenkarten
              </button>
              <button
                className={collectionTab === "neutral" ? "is-active" : ""}
                onClick={() => setCollectionTab("neutral")}
                type="button"
              >
                Neutral
              </button>
            </div>
          </div>
          <p className="collection-note">
            {collectionTab === "class"
              ? `12 ${selected.name}-Karten. Mindestens 12 Klassenkarten muessen ins Deck.`
              : "Neutrale Karten bringen Draw, Cash und alle Risikoachsen in jedes Deck."}
          </p>
          <div className="collection-grid">
            {visibleCards
              .filter((card) => card.id !== "craving" && card.id !== "entzug" && !card.id.startsWith("hero_"))
              .map((card) => {
                const copies = deck.filter((cardId) => cardId === card.id).length;
                const canAdd = deck.length < 30 && copies < 2;

                return (
                  <button
                    className="collection-card"
                    disabled={!canAdd}
                    key={card.id}
                    onClick={() => onAddCard(card.id)}
                    onMouseEnter={() => setPreviewCardId(card.id)}
                    onFocus={() => setPreviewCardId(card.id)}
                    type="button"
                  >
                    <span className="card-cost">{card.cost}</span>
                    {card.image ? <img alt="" src={card.image} /> : <i>{card.kind}</i>}
                    <b>{card.kind}</b>
                    <strong>{card.name}</strong>
                    <small>{card.effect}</small>
                    <em>{copies}/2</em>
                  </button>
                );
              })}
          </div>
        </section>

        <aside className="setup-panel deck-panel">
          <h2>Dein Deck</h2>
          <div className="deck-status">
            <strong>{deck.length} / 30</strong>
            <span>{deckValidation.valid ? "spielbereit" : deckValidation.message}</span>
          </div>
          <div className="deck-tools">
            <button type="button" onClick={onLoadStarterDeck}>
              Starterdeck
            </button>
            <button type="button" onClick={onClearDeck}>
              Leeren
            </button>
          </div>
          <div className="deck-rules" aria-label="Deckregeln">
            <span className={deck.length === 30 ? "is-ok" : ""}>30 Karten</span>
            <span className={deckStats.classCards >= 12 ? "is-ok" : ""}>{deckStats.classCards}/12 Klasse</span>
            <span className={deckStats.persons >= 10 ? "is-ok" : ""}>{deckStats.persons}/10 Personen</span>
            <span className={deckStats.earlyCards >= 10 ? "is-ok" : ""}>{deckStats.earlyCards}/10 frueh</span>
            <span className={deckStats.riskAxes >= 3 ? "is-ok" : ""}>{deckStats.riskAxes}/3 Risiken</span>
          </div>
          <ol className="deck-list">
            {deck.map((cardId, index) => {
              const card = cardById.get(cardId);
              if (!card) return null;
              return (
                <li key={`${cardId}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onRemoveCard(index)}
                    onMouseEnter={() => setPreviewCardId(card.id)}
                    onFocus={() => setPreviewCardId(card.id)}
                  >
                    <span>{card.cost}</span>
                    <strong>{card.name}</strong>
                  </button>
                </li>
              );
            })}
          </ol>
          <button className="start-match" disabled={!deckValidation.valid} onClick={onStart} type="button">
            Spiel starten
          </button>
          <div className="profile-panel">
            <strong>Profil</strong>
            <label>
              Name
              <input
                maxLength={18}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                placeholder="Dein Name"
                value={playerName}
              />
            </label>
            <p>
              Freundescode: <span>{playerFriendCode}</span>
            </p>
            <div>
              <input
                aria-label="Freundescode"
                maxLength={12}
                onChange={(event) => onFriendCodeDraftChange(event.target.value.toUpperCase())}
                placeholder="Freundescode"
                value={friendCodeDraft}
              />
              <button onClick={onAddFriend} type="button">
                Add
              </button>
            </div>
            {friends.length ? (
              <ul>
                {friends.map((friend) => (
                  <li key={friend.code}>
                    <span>{friend.code}</span>
                    <button onClick={() => onRemoveFriend(friend.code)} type="button">
                      x
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <small>Noch keine Freunde gespeichert.</small>
            )}
          </div>
          <div className="online-panel">
            <strong>Online 1v1</strong>
            <input
              aria-label="Online-Server"
              onChange={(event) => onOnlineServerUrlChange(event.target.value)}
              placeholder="Server URL, z.B. https://dein-server.onrender.com"
              value={onlineServerUrl}
            />
            <button disabled={!deckValidation.valid} onClick={onCreateOnlineRoom} type="button">
              Raum erstellen
            </button>
            <div>
              <input
                aria-label="Raumcode"
                maxLength={4}
                onChange={(event) => onOnlineRoomCodeChange(event.target.value.toUpperCase())}
                placeholder="CODE"
                value={onlineRoomCode}
              />
              <button disabled={!deckValidation.valid || onlineRoomCode.trim().length !== 4} onClick={onJoinOnlineRoom} type="button">
                Beitreten
              </button>
            </div>
            {onlineShareLink ? (
              <p>
                Teilen: <span>{onlineShareLink}</span>
              </p>
            ) : null}
            {onlineStatus ? <p>{onlineStatus}</p> : null}
            {onlineError ? <em>{onlineError}</em> : null}
          </div>
          <p>Waehle Karten deiner Klasse plus neutrale Karten. Jedes Deck braucht Rausch, Fahndung und Abhaengigkeit. Maximal 2 Kopien pro Karte.</p>
          {previewCard ? <DeckPreview card={previewCard} /> : null}
        </aside>
      </section>
    </main>
  );
}

export interface FriendEntry {
  code: string;
}

export function deckForFaction(faction: FactionId) {
  if (faction === "awareness") return [...starterDecks.awareness];
  if (faction === "dealer") return [...starterDecks.dealer];
  return [...starterDecks.raver];
}

function validateDeck(deck: string[], faction: FactionId) {
  if (deck.length !== 30) return { valid: false, message: "exakt 30 Karten noetig" };

  const copyCounts = new Map<string, number>();
  for (const cardId of deck) {
    copyCounts.set(cardId, (copyCounts.get(cardId) ?? 0) + 1);
  }
  if ([...copyCounts.values()].some((count) => count > 2)) {
    return { valid: false, message: "max. 2 Kopien pro Karte" };
  }

  const classCards = deck.filter((cardId) => cardById.get(cardId)?.faction === faction).length;
  if (classCards < 12) return { valid: false, message: "mind. 12 Klassenkarten" };

  const persons = deck.filter((cardId) => cardById.get(cardId)?.kind === "person").length;
  if (persons < 10) return { valid: false, message: "mind. 10 Personen" };

  const earlyCards = deck.filter((cardId) => {
    const cost = cardById.get(cardId)?.cost ?? 99;
    return cost >= 1 && cost <= 3;
  }).length;
  if (earlyCards < 10) return { valid: false, message: "mind. 10 Karten mit Kosten 1-3" };

  const risks = riskAxes(deck);
  if (risks < 3) return { valid: false, message: "Rausch, Fahndung und Abhaengigkeit noetig" };

  return { valid: true, message: "spielbereit" };
}

function getDeckStats(deck: string[], faction: FactionId) {
  return {
    classCards: deck.filter((cardId) => cardById.get(cardId)?.faction === faction).length,
    persons: deck.filter((cardId) => cardById.get(cardId)?.kind === "person").length,
    earlyCards: deck.filter((cardId) => {
      const cost = cardById.get(cardId)?.cost ?? 99;
      return cost >= 1 && cost <= 3;
    }).length,
    riskAxes: riskAxes(deck),
  };
}

function riskAxes(deck: string[]) {
  const tags = new Set(deck.flatMap((cardId) => cardById.get(cardId)?.tags ?? []));
  return Number(tags.has("rausch")) + Number(tags.has("fahndung")) + Number(tags.has("abhaengigkeit"));
}

function DeckPreview({ card }: { card: NonNullable<ReturnType<typeof cardById.get>> }) {
  return (
    <section className="deck-preview" aria-label="Kartenvorschau">
      <div className="deck-preview-art">{card.image ? <img alt="" src={card.image} /> : <i>{card.kind}</i>}</div>
      <div className="deck-preview-body">
        <span>{card.cost}</span>
        <strong>{card.name}</strong>
        <small>{card.kind}</small>
        {card.attack !== undefined ? (
          <b>
            {card.attack}/{card.stability}
          </b>
        ) : null}
        <p>{card.effect}</p>
        {card.drawback ? <em>{card.drawback}</em> : null}
      </div>
    </section>
  );
}
