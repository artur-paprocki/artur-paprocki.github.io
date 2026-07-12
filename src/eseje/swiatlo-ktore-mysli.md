---
title: "Światło, które myśli"
description: "O seminarium mojego zespołu na Camerimage, błędzie z zamarzniętą rzeką na Antarktydzie i o tym, jak Gaussian splatting generowany z promptu przesuwa ciężar kina z aktorstwa na budowanie świata."
date: 2026-07-11
# pair: /essays/the-light-that-thinks/  — odkomentować przy publikacji (para jest w drafcie)
heroLight: ill-swiatlo-1400
heroDark: dill-swiatlo-1400
heroAlt: "Szkic ołówkiem z akwarelą: hala zdjęciowa, na ścianie LED z chmury świetlnych punktów wyłania się przytulny pokój; na pierwszym planie kamera na kranie i dwie sylwetki ekipy"
readingTime: 5
audio: /assets/audio/swiatlo-ktore-mysli-pl.mp3
draft: true
---

W kadrze, który trafił do finalnego cięcia trailera, przez antarktyczne pustkowie płynie zamarznięta rzeka. Ostre światło, śnieg, góry piętrzące się w tle — wszystko wygląda tak, jak powinno wyglądać kino: przekonująco. Nikt na sali by się nie zawahał. A jednak na Antarktydzie nie ma rzek. Zauważył to dopiero nasz szef technologii, kiedy szykował do tej sceny prezentację. Wcześniej ten kadr przeszedł przez całą produkcję i nikt nie złapał błędu.

Ta prezentacja miała tytuł [„Światło, które myśli"](https://www.youtube.com/watch?v=jJvGwOjRT2E), a mój zespół poprowadził ją na festiwalu Camerimage — całe nagranie wisi publicznie na kanale festiwalu. Mówiliśmy o trzech drzwiach, którymi sztuczna inteligencja wchodzi dziś do kina: nagrywanie wolumetryczne prawdziwego aktora wprost do silnika gry, reżyserowanie filmu w całości wygenerowanego przez AI, i to, czym zajmujemy się na co dzień w naszym studiu — budowanie wirtualnych światów z [Gaussian splattingu](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) generowanego z promptu. O tym trzecim piszę najwięcej, bo to nasza praca i nasz błąd z rzeką.

Zanim zaczęliśmy używać generowanych światów, przygotowanie wirtualnego setu było najdroższym etapem produkcji. Architekt projektował przestrzeń, ktoś robił tekstury, klient zgłaszał uwagi, wracaliśmy do początku. Potrafiło to trwać tygodniami, zanim cokolwiek trafiło na ścianę LED.

Dziś scenograf otwiera [Marble od World Labs](https://marble.worldlabs.ai), wpisuje opis sceny — czasem pięćdziesiąt słów, czasem tylko zdjęcie referencyjne — i po dziesięciu sekundach ma gotowe środowisko 3D w postaci Gaussian splata, chmury punktów, która niesie w sobie kolor i światło całej sceny naraz. Splat trafia przez wtyczkę [Volinga](https://volinga.ai) do Unreal Engine, a stamtąd na naszą ścianę LED (7,5 na 3,5 metra, technologia [GhostFrame](https://www.ghostframe.com) pozwala nagrywać jednocześnie trzema kamerami). Do tego samego środowiska można domieszać skan zrobiony [ręczną kamerą za około pięć tysięcy dolarów](https://www.xgrids.com) albo klasyczną fotogrametrię — splat, skan i fizyczny rekwizyt żyją teraz w jednej scenie.

Zespół streścił tę zmianę na jednym slajdzie: od „scan-to-splat" do „prompt-to-splat". Do niedawna splat trzeba było wyskanować z miejsca, które istnieje. Dziś wystarczy je opisać — a różnicę między tymi dwoma światami widać na jednym kadrze: po lewej galeria gotowych miejsc, po prawej surowa chmura punktów, od której każde z nich się zaczyna.

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-splat-1400.jpg", "Slajd z seminarium: po lewej galeria gotowych światów Marble, po prawej surowa chmura punktów Gaussian splata" %}
<figcaption>„From scan-to-splat… to prompt-to-splat" — slajd z naszego seminarium. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=2674">Ten moment na nagraniu (44:34)</a>.</figcaption>
</figure>

> Wygenerowanie całego środowiska zajmuje dziesięć sekund. Można zmienić wirtualny set całkowicie i zacząć od nowa.

Dwa tygodnie przed naszym seminarium ta metoda przeszła pierwszy test w prawdziwej produkcji: teledysk dla młodej polskiej artystki, trzy albo cztery wirtualne sety, mniej niż trzy dni przygotowań, ekipa złożona ze scenografa, generalisty Unreal Engine i inżyniera — plus, rzecz jasna, produkcja i aktorzy. [Nasz szef technologii mówił o tym](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=2854) jako o prawdopodobnie pierwszym na świecie komercyjnym użyciu Gaussian splatów generowanych przez AI. Zastrzegam od razu: to samoocena, nie tytuł przyznany przez kogokolwiek z zewnątrz. Z tego teledysku pochodzi za to kadr, który najkrócej tłumaczy, po co nam ta technologia: korytarz pełen androidów, którego nikt nigdy nie zbudował.

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-teledysk-1400.jpg", "Kadr z teledysku: symetryczny korytarz pełen białych androidów w szklanych kapsułach" %}
<figcaption>Kadr z teledysku nakręconego na generowanych splatach — scenografia za ścianą LED dokładana w czasie rzeczywistym. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3040">Fragment na nagraniu (50:40)</a>.</figcaption>
</figure>

Drugim testem był trailer do filmu, który wciąż jest w developmencie: cztery sceny, sześć dni przygotowań, jeden dzień zdjęciowy na ARRI Alexa Mini z zawodowym operatorem. [Normalnie na taki materiał po prostu nie ma budżetu](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3236) — to forma promocyjna, na którą firmy produkcyjne nie wydają realnych pieniędzy, dopóki film nie ma finansowania. Tu nagle się to opłacało.

<figure class="still-ill">
<iframe src="https://www.youtube-nocookie.com/embed/jJvGwOjRT2E?start=2918&end=2927" title="Wideo-cytat: przygotowanie zajęło mniej niż trzy dni" loading="lazy" allowfullscreen></iframe>
<figcaption>Dziewięć sekund, które streszczają całą zmianę tempa: „Przygotowanie wszystkiego zajęło nam mniej niż trzy dni — to przyspiesza proces wielokrotnie" (48:38–48:47).</figcaption>
</figure>

Na tym samym seminarium gościł reżyser, który spędził pięć miesięcy z dwunastoosobowym zespołem, kręcąc osiemdziesięciominutowy film w całości wygenerowany przez AI. [Jego teza](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=1388) była prostsza, niż się spodziewałem: modele nie przenoszą emocji z twarzy aktora, więc trzeba przestać na niej polegać. Zamiast tego buduje się kontekst — scenografię, atmosferę, świat wokół postaci. Model nazwał [„wielkim kalkulatorem"](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=4742), bo — jak mówił — polecenie „zagraj strasznie" nie działa ani na aktora, ani na sieć neuronową.

> „2001: Odyseję kosmiczną" pamięta się nie za aktorstwo, tylko za świat, który zbudował Kubrick. To samo można dziś zrobić z AI — zaprosić widza do środka historii, zamiast pokazywać mu tylko twarz.

Przypomniał przy okazji, że Pixar i Disney od dekad robią kino bez żywego aktora na ekranie i nikt nie nazywa tego ułomnością gatunku. Dla kogoś, kto chce zadebiutować, to zmiana reguł gry: nie trzeba już czekać pięciu czy dziesięciu lat, aż ułożą się aktorzy, producenci i budżet, żeby pokazać własną wizję świata.

Nic z tego nie jest jeszcze proste. Finał generatywnej sceny to [zawsze zgadywanka](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=4538): zmiana jednego krzesła potrafi wymusić regenerację całego kadru, a największym problemem zostaje ciągłość emocji tej samej postaci między ujęciami. Wnętrza wychodzą dobrze, ale eksteriery ze splatów wciąż mają kłopoty z perspektywą, więc na planie i tak trzymamy w zapasie klasyczne plansze 2.5D jako zabezpieczenie. I nikt nie powinien traktować tego jako oszczędności bez kosztów — wyszkolenie zespołu i naszych prompt engineerów kosztowało sporo, zanim cokolwiek zaczęło działać szybciej niż po staremu.

<figure class="still-ill">
<iframe src="https://www.youtube-nocookie.com/embed/jJvGwOjRT2E?start=4538&end=4568" title="Wideo-cytat: finał jest zawsze zgadywanką" loading="lazy" allowfullscreen></iframe>
<figcaption>Pół minuty szczerości z pytań publiczności: „Finał jest zawsze zgadywanką — najczęściej bierzesz to, co dostajesz, a ostatnie słowo ma reżyser" (1:15:38).</figcaption>
</figure>

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-antarktyda-1400.jpg", "Kadr z trailera: postać na śnieżnej grani Antarktydy, po lewej wijąca się zamarznięta rzeka" %}
<figcaption>Kadr z trailera: grań na Antarktydzie — i rzeka, która nie miała prawa tam płynąć. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3687">Historia tej pomyłki na nagraniu (1:01:27)</a>.</figcaption>
</figure>

Wracam do tej zamarzniętej rzeki, bo to najkrótszy skrót tego, czego nauczyło mnie to seminarium. Model wygenerował górę, śnieg, światło, kompozycję kadru — wszystko, czego oko potrzebuje, żeby uwierzyć w scenę. Nie wiedział jednej rzeczy: że na tym kontynencie rzeki nie płyną. Ta wiedza nie leży w danych treningowych w formie, która sama się aktywuje we właściwym momencie. Leży w kimś, kto był tam wcześniej albo choćby o tym czytał, i kto ma powód, żeby zwątpić w to, co widzi.

Prowadzę studio, które od 2022 roku buduje produkcję wirtualną w Warszawie — ścianę LED, przechwytywanie ruchu, Unreal Engine, a coraz częściej też agentów AI pomagających w tej samej pracy. Widzę więc z bliska, jak szybko światło na naszej ścianie zaczyna myśleć samo — jak sprawnie potrafi zaproponować górę, rzekę, całe niebo. Ale to wciąż my decydujemy, czy ta rzeka ma tam płynąć. Im szybciej maszyna generuje światy, tym więcej czasu zostaje nam na jedyne pytanie, którego ona sama sobie nie zada: czego na tym obrazie być nie powinno.
