# Poranny checklist uruchomienia — arturpaprocki.com

Ten dokument to jedna sesja komend do wykonania rano, w kolejności. Repo jest
w pełni zbudowane lokalnie (`D:\Projects\arturpaprocki.com`), CI/CD skonfigurowane,
ale **nic nie zostało jeszcze wypchnięte na GitHub.com** — to pierwszy krok poniżej.

Wykonuj z katalogu repo:

```
cd D:\Projects\arturpaprocki.com
```

---

## G3 — publikacja repo jako publiczne (user-page)

Login GitHub: `artur-paprocki` (zweryfikowany przez `gh api user -q .login`).

1. Utwórz publiczne repo `artur-paprocki.github.io` z bieżącego katalogu i wypchnij:
   ```
   gh repo create artur-paprocki.github.io --public --source . --push
   ```
   To tworzy repo NA GitHubie i wypycha commit `main`. Nazwa repo musi być dokładnie
   `<login>.github.io`, żeby GitHub Pages traktował to jako **user page** (serwowana
   z roota, bez prefiksu `/<repo>/` w URL-ach).

2. Włącz GitHub Pages z publikacją przez GitHub Actions (workflow `deploy.yml`
   już to obsługuje, ale Pages trzeba przełączyć na `build_type=workflow`):
   ```
   gh api repos/artur-paprocki/artur-paprocki.github.io/pages -X POST -f build_type=workflow
   ```

3. Obejrzyj workflowy (powinny odpalić się automatycznie po pushu z kroku 1):
   ```
   gh run list --repo artur-paprocki/artur-paprocki.github.io
   gh run watch --repo artur-paprocki/artur-paprocki.github.io
   ```
   Oczekuj dwóch zielonych runów: `CI` i `Deploy`.

4. Zweryfikuj żywą stronę (dostępna kilka-kilkanaście sekund po zakończeniu `Deploy`):
   ```
   curl -I https://artur-paprocki.github.io
   ```
   Oczekiwany rezultat: `HTTP/2 200`.

---

## G1 — akceptacja treści (esej-manifest + "O mnie")

Drafty czekają w vault w:
```
D:\GalacticEmpire\100 Projects\Blog arturpaprocki.com\drafty\dlaczego-pisze\{brief,PL,EN}.md
D:\GalacticEmpire\100 Projects\Blog arturpaprocki.com\drafty\o-mnie\{PL,EN}.md
```

Przeczytaj i zaakceptuj (zdanie po zdaniu — to wypowiedź publiczna). Po akceptacji,
podmiana demo na treść docelową to operacja plikowa w repo:

1. **Nowe pliki eseju** (frontmatter wzorowany na obecnym demo w
   `src/eseje/przykladowy-esej.md` / `src/essays/sample-essay.md` — skopiuj strukturę,
   podmień `title`, `description`, `date`, `heroAlt`, `readingTime`, usuń `demo: true`,
   wklej zaakceptowaną treść PL/EN):
   ```
   src/eseje/dlaczego-pisze.md      (pair: /essays/why-i-write/)
   src/essays/why-i-write.md        (pair: /eseje/dlaczego-pisze/)
   ```

2. **Usuń demo:**
   ```
   git rm src/eseje/przykladowy-esej.md src/essays/sample-essay.md
   ```

3. **Zaktualizuj `lighthouserc.json`** — URL testowy `/eseje/przykladowy-esej/index.html`
   zmień na `/eseje/dlaczego-pisze/index.html` (nowy adres eseju-manifestu).

4. **Strona "O mnie"** (`src/o-mnie.njk` / `src/en/about.njk`) — wklej zaakceptowaną
   treść z draftów w miejsce obecnego placeholdera.

5. Build lokalnie i sprawdź renderowanie w obu językach/motywach przed commitem:
   ```
   npm run build
   npm run serve
   ```

6. Commit + push (patrz sekcja "Push" na końcu tego dokumentu).

---

## G2 — DNS (OVH)

Pełna lista rekordów: **`docs/dns.md`**. Skrót:

1. W panelu OVH dla strefy `arturpaprocki.com` dodaj 4× rekord A na `@` oraz
   1× CNAME `www` → `artur-paprocki.github.io.` (dokładne wartości w `docs/dns.md`).
2. Poczekaj na propagację, zweryfikuj:
   ```
   nslookup arturpaprocki.com
   ```
3. Dodaj plik `src/CNAME` z zawartością:
   ```
   arturpaprocki.com
   ```
4. Ustaw custom domain w GitHub Pages:
   ```
   gh api repos/artur-paprocki/artur-paprocki.github.io/pages -X PUT -f cname=arturpaprocki.com
   ```
5. Wymuś HTTPS (może wymagać kilku minut/godzin na wystawienie certyfikatu —
   jeśli błąd, odczekaj i powtórz):
   ```
   gh api repos/artur-paprocki/artur-paprocki.github.io/pages -X PUT -f https_enforced=true
   ```
6. Zweryfikuj:
   ```
   curl -I https://arturpaprocki.com
   curl -I https://www.arturpaprocki.com
   ```

---

## Finalnie — zdjęcie noindex

Dopiero gdy G1 + G2 + G3 są zrobione i strona żyje na docelowej domenie z SSL:

1. `src/_data/site.mjs`: `noindex: true` → `noindex: false`
2. `lighthouserc.json`: podnieś asercję `categories:seo` z `0.65` na `1`
   (SEO score był ograniczony wyłącznie przez `noindex` — po jego zdjęciu Lighthouse
   powinien pokazać pełne 100).
3. Push — CI z podniesioną asercją musi przejść na zielono, zanim uznasz Fazę 1
   za zamkniętą.

---

## Push (używane w krokach G1 i "Finalnie")

```
git add -A
git commit -m "..."
git push
```

(Repo już ma remote `origin` ustawiony przez `gh repo create --push` w kroku G3.1.)
