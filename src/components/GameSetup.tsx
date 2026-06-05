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
  const deckValidation = validateDeck(deck);
  const previewCard = previewCardId ? cardById.get(previewCardId) : null;

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
              ? `${selected.name}-Karten fuer deinen eigenen Spielstil. Du kannst frei mischen.`
              : "Neutrale Karten bringen Draw, Cash, Angriff und Risikoachsen in jedes Deck."}
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
                    {card.kind === "person" ? (
                      <span className="card-statline">
                        {card.attack ?? 0} AP / {card.stability ?? 0} HP
                      </span>
                    ) : null}
                    <small>{card.effect}</small>
                    <em>{copies}/2</em>
                    {!canAdd ? <mark>{deck.length >= 30 ? "Deck voll" : "2 Kopien"}</mark> : null}
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
          <div className="deck-freebuild-note" aria-label="Freier Deckbau">
            <strong>Freier Deckbau</strong>
            <span>Stelle dein Deck ohne Klassen-, Personen- oder Risiko-Pflicht zusammen.</span>
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
          <p>
            Waehle Karten deiner Klasse plus neutrale Karten. Es gibt keine Pflicht fuer Klassenkarten, Personen,
            fruehe Karten oder Risikoachsen.
          </p>
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

function validateDeck(deck: string[]) {
  if (deck.length !== 30) return { valid: false, message: "exakt 30 Karten noetig" };

  const copyCounts = new Map<string, number>();
  for (const cardId of deck) {
    copyCounts.set(cardId, (copyCounts.get(cardId) ?? 0) + 1);
  }
  if ([...copyCounts.values()].some((count) => count > 2)) {
    return { valid: false, message: "max. 2 Kopien pro Karte" };
  }

  return { valid: true, message: "spielbereit" };
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
