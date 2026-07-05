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
description, date, pair, heroLight/heroDark, heroAlt, readingTime, audio?).
Wersja EN w `src/essays/` + spięcie polami `pair:` w obu plikach.
