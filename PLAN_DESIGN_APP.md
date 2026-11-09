# Telauto – Plan de design pentru aplicația Android v1

Versiunea 1 · 2026-11-09 · stare: **aprobat de proprietar 2026-11-09**

Se sprijină pe `TELAUTO_PLAN_DESIGN_v1.md` (planul site-ului). Tot ce nu e scris aici rămâne ca pe site:
culorile, fonturile (Golos Text, Unbounded), logo-ul „eticheta de preț”, cardurile, fișa produsului,
insignele de încredere, tema întunecată, textele ro/ru.

## 1. Ideea

Aplicația este „Telauto de pe telefon, dar ca o aplicație”: aceleași ecrane pe care oamenii le cunosc de pe
site, fără nimic de site (subsol, banner de cookie-uri, ecrane de calculator), cu mișcările și gesturile cu care
sunt obișnuiți pe Android.

Principii noi, pe lângă cele ale site-ului:

- **Fiecare ecran are un singur antet**, cu titlul lui și săgeata „Înapoi”, ca în orice aplicație.
- **Înapoi funcționează mereu** (butonul sau gestul telefonului): închide întâi ce e deschis deasupra
  (panou, galerie, meniu), apoi întoarce la ecranul anterior, **la același loc din listă**.
- **Nimic sub cameră sau sub bara de gesturi.** Toate barele fixe țin cont de marginile sigure ale ecranului.
- **Răspuns imediat la atingere:** schelete gri în loc de ecran gol, o vibrație scurtă la acțiunile importante.

## 2. Carcasa aplicației

### 2.1 Ecrane „principale” și ecrane „interioare”

| Fel | Ecrane | Antet | Bara de jos |
| --- | --- | --- | --- |
| Principale | Acasă, Caută (și categoria), Mesaje (lista), Cont (meniul) | antet principal | da |
| Interioare | anunțul, conversația, adăugare/editare, ecranele din Cont, login, profil public, pagini statice | antet interior (Înapoi + titlu) | nu (unele au bara lor de acțiune) |

```
Antet principal (Acasă)              Antet interior
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ [eticheta] Telauto           │     │ ←  Setări              [⋮]   │
│ [ 🔍 Caută pe Telauto       ]│     └──────────────────────────────┘
└──────────────────────────────┘
```

- Antetul principal de pe Acasă: logo-ul compact și câmpul de căutare (ca acum pe telefon). Pe Caută/Mesaje/Cont:
  doar titlul ecranului, mare (Unbounded), care se micșorează când derulezi.
- Antetul interior: săgeata Înapoi (zonă de atingere 48 × 48), titlul pe un rând (cu „…” dacă e lung),
  1–2 pictograme de acțiune în dreapta. Fără logo.
- Antetele stau fixe sus, cu fundal `surface` și contur de 1 px `line` care apare doar după ce ai derulat.
- Bara de stare a telefonului (ora, bateria) are culoarea antetului; în tema întunecată – întunecată.

### 2.2 Bara de jos

Rămâne bara de acum (Acasă · Caută · Adaugă · Mesaje · Cont, „Adaugă” rotund galben, ridicat), cu două schimbări:

- apare **doar pe ecranele principale**;
- apăsarea pe fila deja deschisă duce lista sus (cum fac aplicațiile mari).

### 2.3 Mișcare

- Deschiderea unui ecran interior: glisează din dreapta (200 ms); Înapoi: invers. Schimbarea filelor din bara de
  jos: fără glisare, doar o estompare scurtă (120 ms).
- Dacă telefonul are „animații reduse”, nu există mișcare.
- Restul rămâne ca pe site (panoul de filtre de jos, inima de la „Salvează”).

### 2.4 Fără internet

- Sus apare o bandă discretă „Nu există conexiune la internet”. Anunțurile deja văzute rămân afișate.
- Butoanele care trimit ceva (publică, trimite mesaj) spun clar „Nu există conexiune, încearcă din nou”.
- Prima pornire fără internet: ecran gol cu logo-ul, textul și butonul „Încearcă din nou”.

### 2.5 Pornire și iconiță

- Ecranul de pornire: fundal Hârtie (în tema întunecată – fundalul întunecat), logo-ul în centru. Fără text.
- Iconița pe ecranul telefonului: eticheta de preț albă pe fundal albastru `brand` (adaptivă: se potrivește cu
  cerc, pătrat rotunjit etc.).

## 3. Ecranele

### 3.1 Acasă

Ca pe site pe telefon (categorii, module, anunțuri noi), plus:
- trage în jos pentru reîmprospătare;
- lista „Anunțuri noi” se încarcă mai departe singură când ajungi la capăt (fără numere de pagini).

### 3.2 Caută și categoria

- Rândul „Filtre (2)” și „Sortare” rămâne lipit sub antet când derulezi.
- Rezultatele: încărcare continuă la capătul listei (în locul paginării), cu schelete gri.
- Întoarcerea de la un anunț revine exact la același loc din listă.

### 3.3 Anunțul

```
┌──────────────────────────────┐
│ ←                    ♡   ⤴   │  ← butoane rotunde peste galerie
│                              │
│          galeria             │  ← glisare stânga/dreapta, „3 / 8”
│                              │
├──────────────────────────────┤
│ 125 000 lei  negociabil      │
│ [IMEI indicat] [Pe site 2 ani]│
│ Titlul anunțului             │
│ Chișinău · azi, 14:20        │
│ fișa produsului …            │
│ …                            │
├──────────────────────────────┤
│ [ Scrie mesaj ][ Arată tel. ]│  ← bara fixă jos (existentă)
└──────────────────────────────┘
```

- Sus nu e antet obișnuit: butoanele Înapoi, Salvează și Distribuie plutesc peste galerie. După ce derulezi
  sub galerie, apare antetul interior cu titlul anunțului.
- Atingerea pozei deschide galeria pe tot ecranul (fundal negru, glisare, mărire cu două degete, Înapoi o închide).
- „Distribuie” deschide meniul Android (WhatsApp, Viber, Telegram…) cu linkul anunțului de pe site.
- După „Arată telefonul”, butonul devine „Sună” și deschide aplicația de apeluri.

### 3.4 Adăugare și editare anunț

Pașii rămân ca pe site (1 Categorie … 5 Publicare, „Continuă” fix jos). Schimbări:
- la „Poze”, butonul de adăugare deschide un meniu: **„Fă o poză”** sau **„Alege din galerie”**;
- Înapoi din pasul 2–5 întoarce la pasul anterior, nu iese din formular; ieșirea cu date completate întreabă
  „Ieși? Ciorna rămâne salvată.”;
- la „Anunțul a fost publicat” – o vibrație scurtă.

### 3.5 Mesaje

- Lista: ca acum, cu tragere în jos pentru reîmprospătare.
- Conversația: antetul interior conține poza mică, titlul și prețul anunțului (apăsabil). Câmpul de scris rămâne
  mereu deasupra tastaturii; lista de mesaje se mută în sus, nu se ascunde după tastatură.

### 3.6 Cont

Meniul de acum, plus o grupă nouă „Despre aplicație” la final:
- Despre Telauto, Reguli, Confidențialitate, Contact (paginile care pe site sunt în subsol);
- Tema: Ca telefonul / Luminoasă / Întunecată;
- Limba: Română / Русский;
- „Versiunea 1.0.0” (text mic, gri).

Ecranele din Cont (Anunțurile mele, Favorite, Garajul, Setări…) devin ecrane interioare, cu Înapoi spre meniu.

### 3.7 Login, înregistrare, resetare parolă

Ca pe site, în ecrane interioare. După „Creează cont”: „Ți-am trimis un e-mail. Deschide linkul **pe acest
telefon** – se va deschide aplicația.”

## 4. Tablete

Același aspect ca pe telefon (nu cel de calculator), conținutul centrat cu lățime de maximum 840 px; cardurile
în 3 coloane.

## 5. Ce NU se schimbă

Culori, fonturi, logo, carduri, fișa produsului, insigne, texte, logica (Supabase), tema întunecată. Ecranele de
calculator rămân în cod (pentru merge-urile cu site-ul), dar nu se folosesc în aplicație.

## 6. Cine ce face (etapa 3 din planul APK)

| Partea | Cine | Fișiere |
| --- | --- | --- |
| Înapoi (cu „stiva” de panouri), linkuri externe, bara de stare, tastatură, distribuire, vibrații, internet | Codex C2 | `src/native/**` |
| Antetele, bara de jos pe ecranele principale, margini sigure, mișcare, revenirea la locul din listă, banda/ecranul fără internet, schelete | Codex C3 | `src/appshell/**` |
| Acasă, Caută, categoria, anunțul, galeria, profilul public | Codex C4 | paginile și componentele lor |
| Adăugare/editare, Cont, Mesaje, login | Codex C5 | paginile și componentele lor |
| Legăturile în App.tsx/Layout.tsx, textele ro/ru noi, `index.html` (viewport-fit=cover), iconița și ecranul de pornire | Claude | fișierele comune |

## 7. Hotărârile proprietarului (2026-11-09)

1. **Rotirea ecranului:** doar vertical; galeria pe tot ecranul se poate roti.
2. **Înapoi pe Acasă:** „Apasă încă o dată pentru a ieși”.
3. **Listele:** încărcare continuă în loc de pagini numerotate.
4. **Iconița:** eticheta albă pe fundal albastru `brand`.
5. Planul este aprobat fără alte modificări.
