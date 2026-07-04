# DNS — arturpaprocki.com (OVH)

Rekordy do wpisania w panelu OVH dla strefy `arturpaprocki.com`, żeby domena wskazywała
na GitHub Pages. **Bramka G2** — te zmiany wykonuje agent w przeglądarce dopiero po
pokazaniu Arturowi dokładnej listy poniżej i jego "tak".

Konto GitHub: `artur-paprocki` (login zweryfikowany przez `gh api user -q .login`).

## Rekordy do dodania

| Typ | Nazwa (subdomena) | Wartość (TTL domyślny) |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `artur-paprocki.github.io.` |

`@` oznacza root domeny (`arturpaprocki.com` bez subdomeny) — w panelu OVH czasem
zapisywane jako puste pole nazwy. Cztery rekordy A to standardowy zestaw GitHub Pages
(load-balanced anycast) — wpisz wszystkie cztery, nie tylko jeden.

## Rekordy opcjonalne (IPv6, AAAA)

Jeśli panel OVH pozwala i chcesz też IPv6:

| Typ | Nazwa | Wartość |
|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

Nieobowiązkowe — GitHub Pages działa poprawnie na samych rekordach A.

## Usuń przed dodaniem (jeśli istnieją)

Jeśli strefa ma już jakiekolwiek istniejące rekordy A/AAAA/CNAME na `@` lub `www`
(np. domyślna parkingowa strona OVH) — usuń je najpierw, żeby nie kolidowały z
powyższymi.

## Propagacja

DNS propaguje się zwykle w ciągu minut do ~kilku godzin (TTL zależny od OVH, zwykle
niski dla nowych rekordów). Sprawdzenie:

```
nslookup arturpaprocki.com
nslookup www.arturpaprocki.com
```

## Co dzieje się PO wpisaniu rekordów w OVH (kroki po stronie GitHub)

Te kroki wykonuje agent (odczyt + zapis przez `gh api`, bez interakcji w przeglądarce)
dopiero PO potwierdzeniu, że rekordy DNS są already wpisane w OVH:

1. **`src/CNAME`** — dodaj plik z zawartością:
   ```
   arturpaprocki.com
   ```
   (NIE twórz tego pliku teraz — dopiero po G2, razem z resztą kroków tej sekcji.)

2. **Ustaw custom domain przez GitHub API:**
   ```
   gh api repos/artur-paprocki/artur-paprocki.github.io/pages -X PUT -f cname=arturpaprocki.com
   ```

3. **Wymuś HTTPS (po tym jak GitHub wystawi certyfikat — może potrwać do ~24h po
   weryfikacji DNS):**
   ```
   gh api repos/artur-paprocki/artur-paprocki.github.io/pages -X PUT -f https_enforced=true
   ```
   Jeśli certyfikat jeszcze nie gotowy, ta komenda zwróci błąd — odczekaj i spróbuj
   ponownie.

4. **Weryfikacja końcowa:**
   ```
   curl -I https://arturpaprocki.com
   curl -I https://www.arturpaprocki.com
   ```
   Oczekiwany rezultat: `HTTP/2 200` na obu, `www` może zwrócić redirect 301 do
   root domeny (standardowe zachowanie GitHub Pages dla custom domain + CNAME).

5. **Zdjęcie noindex** (dopiero teraz, gdy domena i SSL działają) —
   `src/_data/site.mjs`: `noindex: true` → `noindex: false`.

6. **Podniesienie asercji SEO w `lighthouserc.json`** z `0.65` na `1` (komentarz
   w tym pliku odsyła tutaj — SEO score rósł tylko dlatego, że `noindex` blokował
   pełny wynik).

7. **Commit + push** zmian z punktów 1, 5, 6 na `main` — uruchomi to zarówno CI
   (z podniesioną asercją SEO), jak i deploy z aktualnym `CNAME`.

Pełna kolejność komend do skopiowania — patrz `docs/uruchomienie.md`.
