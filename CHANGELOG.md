# Changelog — GymTrack

Tutte le modifiche significative al progetto sono documentate in questo file.
Formato: `## YYYY-MM-DD — Tipo` seguito da sezioni Aggiunto / Modificato / Fix.

## 2026-07-11 — Feature (esercizi cardio: durata/distanza al posto di peso/reps)

### Aggiunto
- Nuova unità esercizio **"Cardio (durata/distanza)"** in Gestione. Per questi esercizi le righe serie mostrano Min/Km invece di Kg/Reps/RIR (`set.durationMin`/`set.distanceKm` sul record serie, `weight`/`reps` restano 0), col riferimento "ultima volta" formattato di conseguenza (es. "30min · 5.2km").
- Avviando una scheda con un esercizio cardio, le righe pre-create ignorano il target reps (non applicabile) e restano vuote da compilare.
- Colonne "Durata (min)" e "Distanza (km)" aggiunte all'export CSV serie.

### Modificato
- Gli esercizi cardio sono esclusi dal calcolo PR/1RM stimato e dalla select "Progressione" in Statistiche (concetti di forza non applicabili). Volume/serie totali in Home restano invariati: peso×reps=0 per le serie cardio non altera i totali.
- Bump `CACHE_NAME` a `gymtrack-v10`.

## 2026-07-11 — Feature (export CSV Corpo, obiettivo peso, tag difficoltà)

### Aggiunto
- **Esporta Corpo (CSV)**: peso e misurazioni nel tempo, accanto al bottone di export serie già presente.
- **Obiettivo peso corporeo**: campo editabile nella card "Peso corporeo", mostra la differenza dall'ultimo peso registrato e una linea di riferimento tratteggiata sul grafico.
- **Tag difficoltà allenamento**: Facile/Media/Dura nel modale allenamento (tap di nuovo per togliere la selezione), salvato su `workout.feeling` e mostrato nello storico in Home.

## 2026-07-11 — Feature (promemoria backup, confronto sessioni, superset)

### Aggiunto
- **Promemoria backup**: banner in Home se non è mai stato esportato un backup (con dati presenti) o sono passati più di 14 giorni dall'ultimo; il bottone esporta subito. Data ultimo backup tracciata in `localStorage` (`gymtrack_last_backup`), fuori dal blob dati principale.
- **Confronto con la volta scorsa**: al tocco di "Fatto" (non chiudendo con la ✕, che resta un semplice "nascondi"), se l'allenamento viene da una scheda e ha serie registrate, confronta volume e numero di serie con la sessione precedente della stessa scheda in un toast.
- **Superset**: in fase di creazione scheda, checkbox "Abbina in superset con l'esercizio precedente" collega due esercizi (`routine.items[].supersetId`). In log si mostrano raggruppati con un'etichetta; il timer di riposo parte solo dopo l'ultimo esercizio della coppia, non tra uno e l'altro.

### Modificato (audit ponytail sul lotto di feature)
- Rimosso `Store.getBodyLogById`, mai chiamato (la lista passa già l'oggetto per closure).
- `renderBodyWeightChart` e la lista voci "Corpo" ora riusano `formatKg` invece di reimplementare la formattazione localizzata del peso.
- Bump `CACHE_NAME` a `gymtrack-v8`.

## 2026-07-11 — Feature (tab Corpo: peso, misurazioni, foto)

### Aggiunto
- **Quarta tab "Corpo"**: nuova collezione `bodyLogs` (peso, misurazioni vita/petto/braccia/cosce/fianchi, foto opzionale) con grafico peso nel tempo e lista voci.
- **Foto progresso**: salvate in IndexedDB (`assets/js/photos.js`, stesso wrapper nativo di Spicciolo per gli scontrini, store separato `gymtrack_photos`/`body`) per non appesantire il JSON in `localStorage`. Non incluse nel backup (come le foto scontrino di Spicciolo) — aggiornato il testo in Gestione per dirlo esplicitamente.
- Backup/ripristino estesi automaticamente a `bodyLogs`.
- Bump `CACHE_NAME` a `gymtrack-v7`, aggiunto `assets/js/photos.js` all'app shell cacheata offline.

## 2026-07-11 — Feature (nota esercizio, duplica scheda, calcolatore dischi)

### Aggiunto
- **Nota per esercizio**: campo opzionale su ogni esercizio della scheda (`routine.items[].note`), mostrato durante il log sotto il nome dell'esercizio.
- **Duplica scheda**: bottone nel modale scheda (solo in modifica) che crea una copia con stessi gruppo/esercizi e nome "{nome} (copia)".
- **Calcolatore dischi**: link nel timer di riposo apre un modale con peso totale e peso bilanciere, calcola i dischi per lato (greedy su 25/20/15/10/5/2.5/1.25kg).

## 2026-07-11 — Refactor (audit ponytail)

### Modificato
- Rimossa la classe `positive` su `.trend-bar`: nessuna regola CSS la usava (residuo del pattern entrata/uscita di Spicciolo, qui il trend è un conteggio sempre positivo).
- Unite `.routine-group-title` e `.routine-group-header span`, stessa regola duplicata due volte.
- Sostituite `.cat-manager-actions button:disabled` + `.exercise-remove-btn:disabled` (stessa dichiarazione `opacity:.3` ripetuta) con un unico `button:disabled` globale.

## 2026-07-11 — Feature (log serie in stile Hevy: righe con spunta)

### Aggiunto
- **Righe serie pre-create con spunta**, ispirate a Hevy: il vecchio form unico "Esercizio + Peso/Reps/RIR + Aggiungi serie" è sostituito da card impilate per esercizio (ancora dentro lo stesso modale a foglio, non schermo intero) con una riga per serie. Avviando una scheda, ogni esercizio parte già con tante righe vuote quante il target di serie definito; loggando ad-hoc, parte con una riga e "+ Serie" ne aggiunge altre.
- **Riferimento "precedente"**: ogni riga mostra peso×reps dell'ultima volta che hai fatto quell'esercizio (sessione più recente diversa da quella in corso), come promemoria per il progressive overload.
- **Timer di riposo automatico**: spuntare una riga la registra e fa partire subito il timer di riposo con la durata dell'esercizio appena completato (`activeRestExerciseId`), senza dover premere Avvia a parte. Togliere la spunta a una serie già registrata la cancella e la riporta modificabile come bozza.
- Modificare peso/reps/RIR di una serie già spuntata li salva subito (nuovo `Store.updateSet`).

### Modificato
- Il cronometro "Serie in corso" ora si ferma anche quando un allenamento vuoto viene scartato in chiusura (non solo a eliminazione esplicita): evita che un timer rimasto acceso su una sessione abbandonata condizioni la durata quando se ne avvia una diversa più tardi.
- Bump `CACHE_NAME` a `gymtrack-v5`.

## 2026-07-11 — Feature (target serie/reps/RIR nelle schede) + icone SVG

### Aggiunto
- **Target serie/ripetizioni/RIR per esercizio**: mancava nella scheda (si impostava solo il recupero). Ogni esercizio di una scheda ora ha anche `sets`/`reps`/`rir` pianificati (`routine.items[]` sostituisce il precedente `exerciseIds[]`, con migrazione automatica in lettura dei dati già salvati). "Avvia allenamento" pre-riempie le ripetizioni del primo esercizio col target della scheda.

### Modificato
- Sostituite tutte le emoji (✏️ 🗑️ 🔥 🏆) con SVG inline coerenti con lo stile già usato altrove nell'app (stroke, `currentColor`), sia nei pulsanti di modifica/elimina sia nel badge PR, nel toast record e nello streak.
- Bump `CACHE_NAME` a `gymtrack-v4`.

## 2026-07-11 — Feature (schede in stile Hevy, timer avanzato)

### Aggiunto
- **Schede**: nuova gerarchia Gruppo scheda → Scheda → Esercizi (`routineGroups`/`routines` in storage.js, `exerciseIds` ordinato). In Home, sezione "Le tue schede" raggruppata con bottone "Avvia allenamento" per ogni scheda; creazione/modifica da un modale dedicato (`#routineModal`, stesso pattern di quick-create già usato per esercizi/categorie) raggiungibile sia da Home (+) sia da Gestione ("Schede").
- **Recupero per esercizio**: campo `restSeconds` sull'esercizio (default 90s), impostabile sia in Gestione sia al momento di aggiungerlo a una scheda. "Avvia allenamento" preseleziona il primo esercizio della scheda e il timer riposo assume subito la sua durata; cambiando esercizio dal select — solo se il timer è a riposo, non se è in corso o in pausa — la durata pronta si aggiorna di conseguenza.
- **Timer riposo Avvia/Pausa/Riprendi/Azzera**: sostituiti i preset fissi 60/90/120s. Pausa congela il conteggio (Riprendi continua da lì), Azzera lo riporta alla durata configurata per l'esercizio corrente. Allo scadere naturale, il timer si auto-azzera pronto per la serie successiva invece di restare fermo a 0:00.
- Storico allenamenti: se un allenamento proviene da una scheda, la lista in Home mostra il nome della scheda invece dei soli gruppi muscolari.
- Backup/ripristino JSON estesi automaticamente a `routineGroups`/`routines` (nessuna modifica visibile, `exportAll()`/`importAll()` già generici sull'intero storage).

### Modificato
- Il cronometro "Serie in corso" (media storica) ora scatta solo allo scadere naturale del riposo, non più anche fermandolo manualmente: con Pausa reale distinta da "ho iniziato la serie", il vecchio segnale (stop manuale) non è più univoco.
- Bump `CACHE_NAME` a `gymtrack-v3`.

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
