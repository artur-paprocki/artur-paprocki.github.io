---
title: "The Light That Thinks"
description: "On the seminar my team ran at Camerimage, the frozen river we put into a trailer by mistake, and how prompt-generated Gaussian splatting shifts the weight of cinema from performance to world-building."
date: 2026-07-11
# pair: /eseje/swiatlo-ktore-mysli/  — uncomment on publication (the pair is still in draft)
heroLight: ill-swiatlo-en-1400
heroDark: dill-swiatlo-en-1400
heroAlt: "Pencil-and-watercolor sketch: a lone filmmaker faces a vast LED wall on which an Antarctic landscape with a winding frozen river assembles itself from drifting points of light"
readingTime: 5
audio: /assets/audio/the-light-that-thinks-en.mp3
draft: true
---

In the final cut of a trailer we shipped, a frozen river cuts through an Antarctic wasteland. The light is hard, the snow convincing, mountains stacking up behind it — everything a shot needs to read as real cinema. Nobody in the room paused. Antarctica has no rivers. Our head of technology caught it only while building the slide about this very shot; the frame had passed through the whole production before him and nobody caught it.

That slide belonged to a talk called ["The Light That Thinks,"](https://www.youtube.com/watch?v=jJvGwOjRT2E) which my team gave at the Camerimage festival — the full recording is public on the festival's channel. We walked through three doors AI is currently opening in filmmaking: volumetric capture that carries a real actor's performance straight into a game engine, a feature directed entirely by AI, and the thing we do for a living — building virtual worlds out of [Gaussian splats](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) generated from a prompt. I want to spend most of this essay on the third door, because it's our work, and our mistake with the river.

Before generated worlds, building a virtual set was the most expensive stage of any shoot. An architect designed the space, someone built the textures, the client sent notes, we went back to the start. It could take weeks before anything reached the LED wall.

Now a set designer opens [Marble](https://marble.worldlabs.ai), from World Labs, types a description — sometimes fifty words, sometimes just a reference image — and ten seconds later has a full 3D environment: a Gaussian splat, a cloud of points carrying the color and light of an entire scene at once. The splat goes through a plugin called [Volinga](https://volinga.ai) into Unreal Engine, and from there onto our LED wall — 7.5 by 3.5 meters, running [GhostFrame](https://www.ghostframe.com) so three cameras can shoot it at once. Into the same environment we can fold a scan captured on a [roughly five-thousand-dollar handheld camera](https://www.xgrids.com), or classic photogrammetry — a splat, a scan, and a physical prop now sharing one scene.

The team compressed the shift into a single slide: from scan-to-splat to prompt-to-splat. Until recently a splat had to be scanned from a place that exists. Now you just describe one — and the difference between those two worlds fits in a single frame: a gallery of finished places on the left, and on the right the raw cloud of points every one of them starts from.

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-splat-1400.jpg", "Seminar slide: a gallery of finished Marble worlds on the left, the raw point cloud of a Gaussian splat on the right" %}
<figcaption>"From scan-to-splat… to prompt-to-splat" — a slide from our seminar. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=2674">That moment in the recording (44:34)</a>.</figcaption>
</figure>

> Generating an entire environment now takes ten seconds. You can throw out a virtual set completely and start over.

Two weeks before our seminar, the method got its first real production test: a music video for a young Polish artist, three or four virtual sets, under three days of prep, a crew of one set designer, one Unreal generalist, and one engineer — plus, naturally, the production and the performers. [Our head of technology called it](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=2854) probably the first commercial use of AI-generated Gaussian splats anywhere in the world. I'll flag that immediately: it's a claim he's making about himself, not a title anyone outside handed him. That video also produced the frame that explains, faster than any argument, why we bother with this technology at all: a corridor full of androids that nobody ever built.

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-teledysk-1400.jpg", "A frame from the music video: a symmetrical corridor of white androids in glass capsules" %}
<figcaption>A frame from the music video shot on generated splats — the set behind the LED wall extended in real time. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3040">The clip in the recording (50:40)</a>.</figcaption>
</figure>

The second test was a trailer for a feature still in development: four scenes, six days of prep, one shooting day on an ARRI Alexa Mini with a professional operator. [Normally there's simply no budget for that kind of asset](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3236) — it's a promotional format production companies don't fund until a film has real financing. Suddenly it penciled out.

<figure class="still-ill">
<iframe src="https://www.youtube-nocookie.com/embed/jJvGwOjRT2E?start=2918&end=2927" title="Video quote: prep took less than three days" loading="lazy" allowfullscreen></iframe>
<figcaption>Nine seconds that sum up the change of pace: "It took us less than three days to prepare everything — it speeds up the process many, many times" (48:38–48:47).</figcaption>
</figure>

The same seminar hosted a director who'd spent five months with a twelve-person crew making an 80-minute feature entirely generated by AI. [His thesis](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=1388) was simpler than I expected: models don't carry the same subtlety an actor's face can express, so you stop leaning on the face. You build context instead — set, atmosphere, the world around the character. He called the model ["a big calculator,"](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=4742) because — his words — telling it to "act scared" works no better on a neural network than it does on an actor.

> You don't remember 2001 for the acting. You remember it for the world Kubrick built. That's what I want from AI — to pull the viewer inside the story, not just show them a face.

He pointed out that Pixar and Disney have made cinema without a live actor on screen for decades, and nobody calls that a lesser form. For anyone trying to make a debut, that's a different set of rules: you no longer wait five or ten years for actors, producers, and money to line up before you can show your own vision of a world.

None of this is easy yet. The final result of a generated scene is [always a guess](https://www.youtube.com/watch?v=jJvGwOjRT2E&t=4538) — move one chair and the whole frame regenerates, and the hardest unsolved problem is keeping a character's emotional state consistent shot to shot. Interiors hold up well; exteriors built from splats still struggle with perspective, so on set we keep classic 2.5D plates on hand as a fallback. And none of it is savings without cost: training the team, and our prompt engineers specifically, cost real money before anything started moving faster than the old way.

<figure class="still-ill">
<iframe src="https://www.youtube-nocookie.com/embed/jJvGwOjRT2E?start=4538&end=4568" title="Video quote: the final is always a guess" loading="lazy" allowfullscreen></iframe>
<figcaption>Half a minute of honesty from the Q&A: "The final is always a guess — mostly you take what you get, and the director has the last word" (1:15:38).</figcaption>
</figure>

<figure class="still-ill">
{% img "src/assets/stills/swiatlo-antarktyda-1400.jpg", "A frame from the trailer: a figure on a snowy Antarctic ridge, a winding frozen river on the left" %}
<figcaption>A frame from the trailer: an Antarctic ridge — and the river that had no right to flow there. <a href="https://www.youtube.com/watch?v=jJvGwOjRT2E&t=3687">The story of that mistake in the recording (1:01:27)</a>.</figcaption>
</figure>

I keep coming back to that frozen river, because it's the shortest version of what the seminar taught me. The model generated the mountain, the snow, the light, the whole composition — everything the eye needs to believe the scene. It didn't know one thing: that no rivers run on that continent. That knowledge doesn't sit in training data in a form that activates itself at the right moment. It sits in someone who has been there, or at least read about it, and has a reason to doubt what they're looking at.

I run a studio that's been building virtual production in Warsaw since 2022 — an LED wall, motion capture, Unreal Engine, and increasingly AI agents helping with the same work. So I watch up close how fast the light on our wall is starting to think for itself — how readily it can offer up a mountain, a river, an entire sky. But we still decide whether that river belongs there. The faster the machine generates worlds, the more time is left for the one question it never asks itself: what shouldn't be in this picture.
