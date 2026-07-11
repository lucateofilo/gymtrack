# Changelog — GymTrack

Tutte le modifiche significative al progetto sono documentate in questo file.
Formato: `## YYYY-MM-DD — Tipo` seguito da sezioni Aggiunto / Modificato / Fix.

## 2026-07-11 — Modificato (icona app)

### Modificato
- Sostituite le icone placeholder (riusate da Spicciolo) con un logo dedicato: bilanciere stilizzato in arancione accent (`#ea580c`) su sfondo navy (`#0f172a`), generato via raster con supersampling 4x (nessuna libreria grafica di sistema disponibile nell'ambiente).

## 2026-07-11 — Init

### Aggiunto
- Prima versione dell'app, sullo stesso stack di [Spicciolo](https://github.com/lucateofilo/progetto_spicciolo): PWA vanilla JS/HTML/CSS, storage 100% locale (`localStorage`), nessuna libreria esterna.
- **Log allenamento**: modale "Nuovo allenamento" per aggiungere serie (esercizio, peso, reps, RIR opzionale) durante la sessione; l'allenamento viene creato solo alla prima serie aggiunta e ripulito se rimane vuoto.
- **Esercizi**: gestione con nome, gruppo muscolare (lista fissa) e unità (kg / corpo libero); creazione rapida anche dal modale allenamento ("+ Nuovo esercizio").
- **Record personali (PR)**: 1RM stimato con formula di Epley (`peso * (1 + reps/30)`); ogni serie che supera il record precedente per quell'esercizio è evidenziata con 🏆 e mostra un toast al salvataggio.
- **Progressione per esercizio**: grafico a linea SVG (nessuna libreria di grafici) del miglior 1RM stimato per allenamento, con il record evidenziato.
- **Volume per gruppo muscolare**: barre proporzionali (peso × reps) nel periodo selezionato.
- **Andamento allenamenti**: grafico a barre col numero di allenamenti negli ultimi 6 periodi.
- **Costanza**: calendario a griglia CSS del mese corrente con i giorni allenati evidenziati.
- **Streak settimanale**: numero di settimane consecutive con almeno un allenamento, mostrato in Home.
- **Timer di recupero**: countdown con preset 60/90/120s dentro il modale allenamento, vibrazione a fine riposo se supportata dal dispositivo.
- Filtro periodo globale (Giorno/Settimana/Mese/Anno) con navigazione avanti/indietro, come in Spicciolo.
- **Esporta CSV** di tutte le serie ed **Esporta/Ripristina backup** JSON completo, in Gestione.
- PWA installabile (`manifest.json` + `sw.js`, cache offline dell'app shell). Icone riusate (placeholder) da Spicciolo — da sostituire con un'icona propria.
