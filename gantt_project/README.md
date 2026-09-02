![alt License](https://img.shields.io/badge/licence-AGPL--3-blue.svg)

# 📊 Odoo Custom Project Gantt

Un modulo Odoo (v14) che integra la potente libreria **DHTMLX Gantt** all'interno dell'ecosistema Odoo, fornendo un'interfaccia di pianificazione progetti interattiva, moderna e completamente responsive.

Il modulo è progettato per funzionare sia come **Cruscotto Globale** (tutti i progetti), sia come **Vista di Dettaglio** (singolo progetto aperto tramite Smart Button), mantenendo intatta la navigazione nativa (Breadcrumbs) di Odoo.

## ✨ Funzionalità Principali

*   **Pianificazione Interattiva (Drag & Drop):** Modifica le date di inizio/fine e l'avanzamento (percentuale) dei task trascinando direttamente le barre nel grafico.
*   **Gestione Dipendenze:** Crea e rimuovi relazioni (Finish-to-Start) tra i task unendo i "pallini" di collegamento ai lati delle barre. I dati vengono salvati automaticamente su Odoo tramite RPC.
*   **Doppia Modalità di Visualizzazione:**
    *   *Vista Globale:* Accessibile da menu, mostra tutti i progetti con possibilità di filtraggio.
    *   *Vista Singolo Progetto:* Accessibile dallo Smart Button "Vista Gantt" all'interno della scheda di un progetto. Nasconde il filtro progetti e mostra solo l'alberatura pertinente.
*   **Allarmi Visivi (Overdue Alerts):** I task che hanno superato la data di scadenza e non sono completati al 100% vengono automaticamente evidenziati con una grafica a strisce rosse d'emergenza e l'icona ⚠️.
*   **Filtri Rapidi:** 
    *   Ricerca live per **Nome Task**.
    *   Filtro dinamico per **Assegnatario** (popolato con gli utenti interni di Odoo).
*   **Esportazione e Strumenti:**
    *   Esportazione nativa in **PDF** (tramite API DHTMLX).
    *   Pulsante **Aggiorna (Refresh)** per ricaricare i dati da Odoo senza ricaricare la pagina web.
    *   Livelli di **Zoom** multipli (Giorno, Settimana, Mese).
    *   Pulsante **Oggi** per centrare la timeline sulla data odierna.
*   **Interfaccia Pulita (UX):** Possibilità di nascondere o mostrare la tabella laterale di sinistra (Tree View) con un comodo pulsante a comparsa (☰) per massimizzare lo spazio dedicato alla timeline.

## 📦 Dipendenze

Questo modulo richiede l'installazione dei seguenti moduli base di Odoo:
*   **`project`** (Progetti - per la gestione dei task e dei progetti)
*   **`web`** (Core UI - implicito in ogni modulo visivo)

## 🚀 Installazione e Utilizzo

1.  Posiziona la cartella del modulo (es. `custom_gantt_project`) all'interno della directory `addons` della tua istanza Odoo.
2.  Riavvia il servizio Odoo e aggiorna la Lista delle App.
3.  Installa il modulo.

### Come accedere alla vista:
*   **Menu principale progetti:** Clicca sulla voce di menu creata per accedere alla panoramica generale.
*   **Singolo Progetto:** Apri l'app Progetti, entra nella form di un progetto specifico e clicca sullo Smart Button **"Vista Gantt"** in alto a destra.

Credits
=======

Contributors
------------

* AngioC

Maintainer
----------

* AngioC