# Changelog — GymTrack

Tutte le modifiche significative al progetto sono documentate in questo file.
Formato: `## YYYY-MM-DD — Tipo` seguito da sezioni Aggiunto / Modificato / Fix.

## 2026-07-11 — Fix (torna al modale, zoom, timer interrotto)

### Fix
- La schermata sessione a schermo intero introdotta prima non era coerente con lo stile a foglio del resto dell'app. Ripristinato il modale `#workoutModal` originale (form Esercizio/Peso/Reps/RIR piatto), mantenendo timer di riposo e stima serie già integrati.
- `.modal-form input`/`select` erano a `font-size: 15px`, sotto la soglia dei 16px che iOS/Android usano per decidere se ingrandire automaticamente la pagina al focus di un campo: lo zoom restava attivo e la pagina non si riadattava. Portato a 16px.
- **Timer interrotto chiudendo il modale**: `closeWorkoutModal()` fermava sempre il timer di riposo/cronometro serie, anche solo chiudendo per sbaglio o per guardare le Statistiche. Ora il timer continua in background (gli `setInterval` restano attivi, aggiornano elementi nascosti ma presenti nel DOM) e `openWorkoutModal()` non lo resetta più a 90s se uno è già in corso.
- Bump `CACHE_NAME` a `gymtrack-v2` in `sw.js` (non veniva mai aggiornato dall'init: chi aveva già installato la PWA offline continuava a vedere asset vecchi ad ogni modifica).

## 2026-07-11 — Modificato (icona v3)

### Modificato
- L'icona precedente (dischi come anelli/"ciambelle" arancioni) non si leggeva bene come bilanciere. Rifatta con dischi pieni (pillole verticali) invece di anelli forati, bianco su sfondo nero invece di arancione su navy.

## 2026-07-11 — Feature (schermata sessione dedicata)

### Aggiunto
- **Sessione a schermo intero**: il FAB non apre più un modale a foglio ma una vera schermata dedicata (`#sessionScreen`), con timer di riposo e stima serie sempre visibili in alto (indipendenti dall'esercizio corrente, dato che il riposo non è legato a una singola card).
- **Card per esercizio con paginazione**: ogni esercizio della sessione è una pagina navigabile con frecce ‹ › o toccando i pallini; l'ultima pagina è sempre un "+" per aggiungere il prossimo esercizio (creazione al volo come già in Gestione). Le pagine si costruiscono progressivamente, nessuna scheda/routine da pianificare prima.
- **Stepper +/− per peso, reps e RIR**: sostituiscono i campi numerici; i valori restano impostati tra una serie e l'altra (utile per ripetere rapidamente la stessa serie) e vengono pre-caricati dall'ultima serie registrata per quell'esercizio in questo allenamento (default 20kg × 8 se è la prima).
- Riaprire un allenamento passato ricostruisce le pagine dagli esercizi già presenti nelle sue serie, in ordine di primo utilizzo.

### Modificato
- Rimossi il vecchio modale `#workoutModal`, il form piatto "Peso/Reps/RIR" e le relative funzioni; la lista serie ora è filtrata per esercizio (una per pagina) invece che per l'intero allenamento.

## 2026-07-11 — Feature (tempo stimato serie)

### Aggiunto
- **Tempo stimato serie**: quando il riposo viene interrotto (manualmente col toggle o a scadenza naturale) parte un cronometro "Serie in corso" che misura il tempo fino al log della serie successiva. Il valore aggiorna una media mobile pesata per esercizio (`avgSetSeconds`, 70% peso al valore precedente/30% all'ultima misura) mostrata come riferimento ("· media m:ss") accanto al cronometro dal ciclo successivo. Cambiare solo il preset del riposo (senza interromperlo) non fa partire il cronometro. Misure fuori dai limiti 1–600s vengono scartate.

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
