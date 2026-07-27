# Publikowanie i podgląd esejów

## Podgląd przed publikacją (draft)

1. W frontmatterze eseju dodaj linijkę: `draft: true`.
2. Push → po ~2 min esej jest zbudowany pod SEKRETNYM adresem:
   `https://arturpaprocki.com/podglad/<slug>-<kod>/` (kod wypisze się w
   `_site/podglad/` przy buildzie lokalnym; EN: `/preview/...`).
   Strona wygląda 1:1 jak finalna (ilustracje, motywy, audio), ale:
   - nie ma jej na stronie głównej, w RSS ani w sitemapie,
   - ma meta `noindex` (Google nie indeksuje),
   - na górze świeci baner PODGLĄD.
3. Publikacja = USUŃ linijkę `draft: true` → push. Esej przenosi się pod
   `/eseje/<slug>/` i pojawia wszędzie.

## Podgląd lokalny (bez internetu)

`cd D:\Projects\arturpaprocki.com` → `npm run serve` → http://localhost:8080

## Nowy esej ręcznie

Skopiuj istniejący plik z `src/eseje/` jako wzór frontmattera (title,
description, date, work, heroLight/heroDark, heroAlt, readingTime, theses, audio?).
Wersja EN w `src/essays/`.

Wersje jednego tekstu wiąże **wspólny klucz `work:`** — ten sam ciąg we frontmatterze
każdej z nich (zwykle slug polski), nie link do drugiej strony. Kolekcja `works`
(`eleventy.config.mjs:97`) zbiera po nim uporządkowany zestaw wersji, a z zestawu
biorą się przełącznik języka, hreflang, `x-default` i JSON-LD
(`workTranslation`/`translationOfWork`). Dwie wersje czy trzy — ta sama ścieżka.

Klucz trzymaj **zakomentowany** (`# work: <klucz>`), dopóki choć jedna wersja ma
`draft: true`: kolekcja nie filtruje draftów, więc odkomentowany klucz wciągnąłby
sekretny adres `/podglad/` do hreflang publicznej strony. Odkomentuj naraz we
wszystkich plikach zestawu, w tym samym kroku co zdjęcie `draft: true`.

Pola `pair:` w esejach **nie wpisuj**. Zostało tylko w stronach stałych
(`src/index.njk`, `o-mnie`, `kontakt`, `dziekuje` + odpowiedniki EN), których ten
model nie dotknął; dla zestawu dwuelementowego build wylicza je sam przez zgodność
wsteczną (`eleventy.config.mjs:51`), a przy trzech wersjach zostaje puste, bo jeden
link przestaje opisywać relację.

Para nie jest wprawdzie martwa — `buildLangSet` (`eleventy.config.mjs:36-41`) montuje
z niej zastępczy zestaw dwuelementowy, więc przełącznik i hreflang działają także dla
strony opisanej samym `pair:`. Ale ta ścieżka zna **wyłącznie oś PL↔EN**, więc tekst
opisany parą nie przyjmie trzeciej wersji — i przemilczy ją bez błędu buildu.
