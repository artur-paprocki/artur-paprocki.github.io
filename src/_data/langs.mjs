// Rejestr języków strony — jedyne miejsce, w którym opisany jest język (LANG-SET, spec 0052).
//
// Do tej pory strona była dwujęzyczna z założenia: esej wskazywał jeden
// odpowiednik polem `pair:`, a szablony rozstrzygały wszystko przez
// `if lang == "en"`. Model zestawu odwraca to: wersje jednego tekstu wiąże
// wspólny klucz `work:`, kolekcja `works` (patrz eleventy.config.mjs) zbiera
// z niego uporządkowaną listę wersji, a wszystko pozostałe — przełącznik,
// hreflang, JSON-LD, kolekcja esejów, /llms.txt — czyta stąd.
//
// Dołożenie kolejnego języka = dopisanie wpisu w `by`, kodu w `order`
// i klucza `work:` w esejach. `live: false` znaczy: język jest już opisany,
// ale nie ma jeszcze własnej sekcji strony, więc przełącznik nie proponuje
// go tam, gdzie nie ma dokąd pójść.
//
// Etykieta w przełączniku jest zapisana alfabetem łacińskim także dla
// chińskiego („ZH"): pasek nawigacji nie ładuje kroju CJK, a podzbiór
// Noto Serif SC budowany per esej (FONT-CJK) obejmuje znaki tekstu, nie
// interfejsu.
//
// `latinExt` mówi, czy tekst w tym języku sięga poza podzbiór `latin` krojów
// łacińskich. Polski i angielski — tak (diakrytyka), chiński — nie: łacina na
// stronie ZH to nazwy własne i skróty („Camerimage", „LED", „prompt-to-splat"),
// czyli czysty ASCII. Z tej flagi korzysta wyłącznie preload w `base.njk`;
// reguły `@font-face` w `fonts.css` zostają dla wszystkich takie same, więc
// flaga może najwyżej opóźnić pobranie pliku, nigdy go nie zablokować.
//
// `ui` to napisy strony eseju: baner podglądu, wiersz metryki, odtwarzacz,
// zapis na newsletter. Do 26.07 stały one w `essay.njk` jako
// `„po polsku" if lang == "pl" else „in English"`, więc każdy język poza
// polskim BYŁ angielskim — strona chińska mówiła „July 11, 2026 · 5 min read"
// i „PREVIEW — draft…". Czwarty język dokłada się tu wpisem, nie kolejnym
// `else`. `{n}` podstawia się przez filtr `replace` w szablonie (czas czytania
// jest daną strony, nie języka).
//
// Etykieta `listen` w wersji chińskiej NIE mówi „głos autora" (decyzja Artura
// z 26.07): wersji ZH nie czyta Artur, tylko natywny lektor. Polska i angielska
// zostają przy głosie autora, bo tam to prawda.
//
// `readVersion` to odnośnik w nagłówku eseju do innej wersji tego samego
// tekstu. Napisany jest w języku wersji DOCELOWEJ — tak jak `switchTo`
// i tak jak dzisiejsze „Read in English →" na stronie polskiej: link jest
// zaproszeniem skierowanym do czytelnika, który będzie czytał tamtą wersję,
// więc musi być dla niego rozpoznawalny bez znajomości języka strony, na
// której stoi. Dlatego wersja chińska mówi po chińsku, a odnośnik dostaje
// `lang`/`hreflang`, żeby przeglądarka i czytnik ekranu wiedziały, w jakim
// języku jest ten napis.

const origin = "pl";
const order = ["pl", "en", "zh"];

const by = {
  pl: {
    live: true,
    hreflang: "pl",
    latinExt: true,
    label: "PL",
    switchTo: "Przełącz na polski",
    readVersion: "Czytaj po polsku →",
    home: "/",
    about: "/o-mnie/",
    contact: "/kontakt/",
    feed: "/feed.xml",
    nav: {
      essays: "Eseje",
      about: "O mnie",
      contact: "Kontakt",
      themeToggle: "Przełącz motyw",
    },
    ui: {
      draftBanner:
        "PODGLĄD — wersja robocza. Ta strona nie jest publiczna: brak jej na liście esejów, w RSS i w Google.",
      reading: "{n} minut czytania",
      listen: "Posłuchaj — {n} min · głos autora",
      play: "Odtwórz",
      pause: "Pauza",
      progress: "Postęp odtwarzania",
      theses: "Sedno",
      transcript: "Transkrypcja z czasami",
      subscribeTitle: "Nowe eseje co dwa tygodnie",
      subscribeBody:
        "Bez spamu — tylko kolejny esej, prosto do skrzynki. Po polsku lub po angielsku, jak wolisz.",
      subscribeCta: "Subskrybuj newsletter",
    },
    // Etykiety warstwy dla agentów (/llms.txt). `version` nazywa wersję
    // w INNYM języku słowami tej sekcji, więc jest to macierz, nie jedna nazwa.
    llms: {
      heading: "Eseje (po polsku)",
      date: "Data",
      summary: "Opis",
      theses: "Tezy",
      timeMap: "Mapa czasów zdań",
      sentences: "zdań",
      version: { en: "Wersja angielska", zh: "Wersja chińska" },
    },
  },

  en: {
    live: true,
    hreflang: "en",
    latinExt: true,
    label: "EN",
    switchTo: "Switch to English",
    readVersion: "Read in English →",
    home: "/en/",
    about: "/en/about/",
    contact: "/en/contact/",
    feed: "/en/feed.xml",
    nav: {
      essays: "Essays",
      about: "About",
      contact: "Contact",
      themeToggle: "Toggle theme",
    },
    ui: {
      draftBanner:
        "PREVIEW — draft. This page is not public: absent from the essay list, RSS, and Google.",
      reading: "{n} min read",
      listen: "Listen — {n} min · author's voice",
      play: "Play",
      pause: "Pause",
      progress: "Playback progress",
      theses: "Key Takeaways",
      transcript: "Timestamped transcript",
      subscribeTitle: "New essays every two weeks",
      subscribeBody:
        "No spam — just the next essay, straight to your inbox. In Polish or English, your choice.",
      subscribeCta: "Subscribe to the newsletter",
    },
    llms: {
      heading: "Essays (in English)",
      date: "Date",
      summary: "Summary",
      theses: "Theses",
      timeMap: "Sentence time map",
      sentences: "sentences",
      version: { pl: "Polish version", zh: "Chinese version" },
    },
  },

  // Chiński uproszczony — pilotaż na jednym eseju (spec 0052). Sekcja `/zh/`
  // istnieje od fali 3 (strona główna, „o mnie", kontakt, podziękowanie, feed),
  // więc `live: true`: przełącznik ma dokąd prowadzić. Sam esej jest jeszcze
  // draftem, a jego `work:` zostaje zakomentowany (kontrakt stylu §2), więc
  // żaden zestaw nie ma dziś trzeciego elementu — trójka wchodzi w hreflang
  // i JSON-LD dopiero w kroku publikacji.
  //
  // Adresy sekcji są pinyinem, nie angielskim: wewnątrz `/zh/` wszystko, co
  // czyta Chińczyk, jest po chińsku, a URL zostaje ASCII (关于 → guanyu,
  // 联系 → lianxi, 谢谢 → ganxie). Ta sama zasada rządzi slugiem eseju.
  zh: {
    live: true,
    hreflang: "zh-Hans",
    latinExt: false,
    label: "ZH",
    switchTo: "切换到中文",
    readVersion: "阅读中文版 →",
    home: "/zh/",
    about: "/zh/guanyu/",
    contact: "/zh/lianxi/",
    feed: "/zh/feed.xml",
    nav: {
      essays: "文章",
      about: "关于",
      contact: "联系",
      themeToggle: "切换主题",
    },
    ui: {
      draftBanner: "预览——草稿。本页面并未公开：不在文章列表、RSS 和搜索引擎中。",
      reading: "{n} 分钟阅读",
      // „中文朗读" = czytane po chińsku. Bez „głosu autora": tę wersję czyta
      // natywny lektor, nie Artur (decyzja Artura, spec 0052 §2).
      listen: "收听 — {n} 分钟 · 中文朗读",
      play: "播放",
      pause: "暂停",
      progress: "播放进度",
      theses: "要点",
      transcript: "带时间轴的文字稿",
      subscribeTitle: "每两周一篇新文章",
      // Newsletter nie ma wydania chińskiego — mówimy to wprost, zamiast
      // obiecywać czytelnikowi ZH tekst, którego nie dostanie.
      subscribeBody: "没有垃圾邮件——只有下一篇文章，直接送到你的邮箱。目前仅有波兰语和英语版本。",
      subscribeCta: "订阅邮件通讯",
    },
    llms: {
      heading: "文章（中文）",
      date: "日期",
      summary: "摘要",
      theses: "要点",
      timeMap: "句子时间轴",
      sentences: "句",
      version: { pl: "波兰语版本", en: "英文版本" },
      // `note` pojawia się w /llms.txt tuż pod nagłówkiem sekcji i tylko wtedy,
      // gdy sekcja w ogóle się renderuje (czyli gdy język ma opublikowany
      // esej). Agent cytujący wersję chińską ma prawo wiedzieć to, co czytelnik
      // widzi w pierwszym akapicie tekstu: to tłumaczenie maszynowe, którego
      // autor nie przeczytał (TRANS-QA §5). PL i EN takiej noty nie mają, bo
      // nie są tłumaczeniami maszynowymi.
      note:
        "注 / Note: 中文版是试点，正文译自波兰语原文，由 AI 翻译，作者本人未做校读——" +
        "引用时请以波兰语原文为准。The Chinese version is a pilot: an AI translation of the " +
        "Polish original, not proofread by the author — quote the Polish as the source of record.",
    },
  },
};

export default {
  // Kolejność opcji w przełączniku i wpisów hreflang.
  order,
  // Język oryginału: `hreflang="x-default"` i cel `translationOfWork`.
  origin,
  by,
  // Języki, które mają już własną sekcję strony.
  live: order.filter((code) => by[code].live),
  // Ich strony główne — to jest zapasowy zestaw przełącznika dla stron bez
  // odpowiednika (notatka, draft bez pary).
  homes: order
    .filter((code) => by[code].live)
    .map((code) => ({ lang: code, url: by[code].home })),
};
