# Nieruchomości – wersja HTML (bez serwera)

Strona w czystym HTML, CSS i JavaScript. Działa na **każdym** hostingu (także zwykłym, na PHP)
oraz na darmowych: GitHub Pages, Netlify, Cloudflare Pages.
Można ją też otworzyć bez internetu – dwuklik na `index.html`.

## Pliki

| Plik / folder | Co to jest |
|---|---|
| `index.html` | strona główna |
| `ogloszenia.html` | lista ogłoszeń z wyszukiwarką i filtrami |
| `ogloszenie.html` | szczegóły jednego ogłoszenia (`ogloszenie.html?id=3`) |
| `panel.html` | panel do dodawania i edycji ogłoszeń |
| `dane/ogloszenia.js` | **wszystkie ogłoszenia** – jedyny plik, który się zmienia |
| `zdjecia/` | zdjęcia ogłoszeń |
| `css/`, `js/`, `img/` | wygląd i skrypty – nie trzeba ruszać |

## Jak dodać ogłoszenie

1. Otwórz `panel.html` w przeglądarce.
2. Kliknij **+ Dodaj ogłoszenie**, wypełnij formularz, wybierz zdjęcia, zapisz.
3. Kliknij **Pobierz ogloszenia.js** – plik trafi do folderu Pobrane.
4. Podmień nim plik `dane/ogloszenia.js`.
5. Skopiuj wybrane zdjęcia do folderu `zdjecia/`.
6. Wyślij na hosting zmieniony `dane/ogloszenia.js` i nowe zdjęcia.

Zmiany w panelu są pamiętane w przeglądarce, dopóki nie podmienisz pliku –
można spokojnie dodać kilka ogłoszeń i pobrać plik raz na końcu.
Pracujesz na innym komputerze? Użyj przycisku **Wczytaj plik…** i wskaż aktualny `ogloszenia.js`.

## Wskazówki

- Nazwy zdjęć najlepiej bez spacji i polskich znaków (np. `krakow-1.jpg`).
  Na hostingu wielkość liter ma znaczenie: `Foto.JPG` ≠ `foto.jpg`.
- Zmniejszaj zdjęcia przed dodaniem (np. do 1600 px szerokości) – strona będzie szybsza.
- `panel.html` nie musisz wysyłać na hosting. Nawet jeśli tam będzie, nikt obcy
  nie zmieni Twoich ogłoszeń – panel zmienia tylko plik pobierany na własny komputer.
- Przykładowe ogłoszenia usuniesz w panelu (przycisk **Usuń**), a potem pobierz i podmień plik.
