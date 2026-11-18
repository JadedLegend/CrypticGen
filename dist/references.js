const themes = [
  {
    title: "Systemic Critique & Control",
    premise: "An institution can offer abundant choices while keeping ownership of the menu.",
    cues: /\b(power|system\w*|control|institution\w*|money|workplace|market\w*|boss\w*|rule\w*|freedom|bureaucracy)\b/giu,
    modules: ["03", "11", "20", "27", "34"],
  },
  {
    title: "Paradox as Operating System",
    premise: "Let two incompatible truths shape the song and leave both audible at the end.",
    cues: /\b(paradox\w*|conflict\w*|contradict\w*|tension\w*|opposit\w*|both|threshold\w*|between|doubt\w*)\b/giu,
    modules: ["05", "13", "20", "30", "34"],
  },
  {
    title: "Alchemy, Myth & Esotericism",
    premise: "Give an internal change a physical process that can fail, leave residue, or change whoever touches it.",
    cues: /\b(alchem\w*|myth\w*|ritual\w*|spell\w*|cocoon\w*|transform\w*|chang\w*|fung\w*|element\w*|metamorph\w*)\b/giu,
    modules: ["07", "12", "29", "33", "34"],
  },
  {
    title: "Psychedelic Phenomenology",
    premise: "Track the evidence of a change in perception through the senses as the speaker's bearings give way and reform.",
    cues: /\b(percept\w*|dream\w*|ego|disorient\w*|sensory|dimension\w*|surreal\w*|dissolv\w*|mirror\w*)\b/giu,
    modules: ["08", "09", "18", "24", "29"],
  },
  {
    title: "The Artist's Struggle & Creative Process",
    premise: "Find where the constraint makes the work possible and where working inside it begins to cost the maker.",
    cues: /\b(artist\w*|creat\w*|song\w*|writ\w*|mak\w*|pressur\w*|constraint\w*|craft\w*|struggl\w*)\b/giu,
    modules: ["06", "16", "24", "25", "35"],
  },
  {
    title: "Compression & Density",
    premise: "Give one tightly phrased image multiple consequences and let its sound carry the turn between them.",
    cues: /\b(compress\w*|dens\w*|phon\w*|rhyme\w*|cadence\w*|wordplay|glyph\w*|sound\w*|rhythm\w*|lyric\w*)\b/giu,
    modules: ["01", "04", "06", "17", "22", "36"],
  },
];

export const PARADOX_CONTEXT = [
  "Thematic routing from MUZICK-MAP.md, read against MUZICK-CLEAN.md. These are paraphrased anchor prompts for fresh imagery.",
  ...themes.map(({ title, premise }) => title + " — " + premise),
].join("\n");

const modules = [
  ["sound", "Homophone & Word-Split Semantic Pivots", "Split a word across registers, or let a near-homophone redirect a phrase. Its second hearing should change the thought itself.", "ambiguity", "density"],
  ["voice", "High-Velocity Conversational Cadence", "Let stray speech, an unexpected cultural frame, and sudden sincerity collide inside one quick run. Carry the shift on breath and stress.", "momentum", "abrasion"],
  ["arrangement", "Structured Escalation & Systemic Critique", "Give each section a different tempo and delivery. Move from nimble observation to collective chant, then let a quiet bridge change the stakes of the final release.", "momentum", "abrasion"],
  ["density", "Prefix Redirection & Self-Interrupting Cadence", "Detach and reattach a prefix mid-flow. Make the interruption expose a second argument or slip a joke into the original claim.", "density", "ambiguity"],
  ["range", "Playful Liminal Persona & Theatrical Stage Presence", "Invent a character comfortable on a threshold. Move from dense inner rhyme into a theatrical spoken bridge that lets another side of the speaker surface.", "ambiguity", "momentum"],
  ["sound", "Multisyllabic Alliterative Density & Recursive Meta-Lyrics", "Chain stressed consonants through compound sounds. Let the song interrupt itself to notice how it is being made.", "density", "momentum"],
  ["density", "Line-Broken Minimalist Cadence & Mythic-Street Fusion", "Clip the lines into a halting, syncopated pocket. Bring elemental imagery into contact with a concrete modern street texture.", "-density", "ambiguity"],
  ["voice", "Micro-Punctuation Wordplay & Scale-Shifting", "Use a break or punctuation mark to surface a second reading of an ordinary word. Cut from cosmic scale to some specific household detail without slowing down.", "ambiguity", "momentum"],
  ["density", "Staccato Percussive Micro-Stanzas", "Build short couplets or triplets from hard consonants and sudden stops. Place one surreal turn where the listener expects the pattern to repeat.", "abrasion", "momentum"],
  ["arrangement", "Math-Flow Triplet Pulse & Inversion Mantras", "Switch from double-time argument to a countable slower pattern. Repeat a short mantra, then invert one relation so the return lands differently.", "momentum", "density"],
  ["voice", "Unfiltered Street-Surrealism & Gritty Cadence", "Keep physical texture and blunt humor audible. Let the scale of the thought jump outward while the delivery stays close to ordinary speech.", "abrasion", "ambiguity"],
  ["range", "Tactile Memory, Ritual & Grounded Refrain", "Start with a vulnerable physical memory. Distill it into an earthy refrain with a short recurring vocal pulse beneath it.", "intimacy", "-momentum"],
  ["voice", "Boom-Bap Internal Rhyme & Self-Revising Narration", "Set up a steady boom-bap pocket. Have the speaker question, revise, or heckle their claim from within the bar while the pocket holds.", "density", "intimacy"],
  ["voice", "Deadpan Comedy & Register Whiplash", "Move straight from elevated abstraction into a deadpan personal observation. Use the changed register to qualify what the speaker just claimed.", "abrasion", "intimacy"],
  ["method", "Elevated Cadence & Parallel Clause Architecture", "Build end-stopped lines from parallel clauses and formal cadence. Vary the final clause so the rhetorical frame can carry a genuine shift of thought.", "-abrasion", "-momentum"],
  ["voice", "Conversational Self-Interrogation & Mid-Verse Asides", "Interrupt the main speaker with questions, half-answers, and an ordinary detail. Let the interruption expose a second perspective on the scene.", "intimacy", "ambiguity"],
  ["density", "Internal Vowel Chains & Enjambed Momentum", "Carry a stressed vowel family across line and stanza boundaries. Break into an everyday image while that acoustic momentum is still active.", "density", "momentum"],
  ["density", "Sparse Minimalist Micro-Lines & Rapid Acceleration", "Use isolated two- or three-word lines to make deliberate breathing room, then snap into a dense cluster without warning.", "-density", "momentum"],
  ["range", "Contemplative Spoken Cadence & De-Escalation", "Slow a spoken passage enough that one closely observed detail carries the emotional pivot. Leave time between lines for that detail to settle.", "intimacy", "-momentum"],
  ["arrangement", "Holding Paradox & Structured Tension", "Fit opposing truths into short, balanced verses. Let a narrower pre-chorus put pressure on both truths and keep their disagreement available through the hook.", "ambiguity", "-density"],
  ["range", "Prose-Poem Cadence & Unrhymed Philosophical Weight", "Build rhythm from syntax and recurring stresses inside continuous prose. Let line-end rhyme fall away so the idea and breath phrase can decide when it turns.", "-density", "intimacy"],
  ["sound", "Long-Run Assonance Chain & Recursive Wordplay", "Sustain an assonance family across several bars. Let an unexpected word split carry the thought to a new domain before you resolve the sonic chain.", "density", "momentum"],
  ["voice", "Multiplicity & Sarcastic Cadence", "Begin with playful absurdity and pivot into a pointed account of pressure to conform. Make the different voices inside the speaker audible without flattening them.", "abrasion", "ambiguity"],
  ["method", "Pre-Symbolic Translation & Self-Deprecating Closure", "Describe a sensation that arrives before it has a name. Ground the attempt to translate it with one dry, ordinary admission at the close.", "ambiguity", "intimacy"],
  ["range", "Connector Cadence & Collaboration", "Give overlooked connector words deliberate stresses across two- or four-bar divisions. Let them propel the next phrase and bind one voice's statement to another.", "density", "momentum"],
  ["voice", "Stream-of-Consciousness Prose Monologue", "Keep the speech texture of an unpolished first-person account. Let a sudden correction change how the listener hears a dark joke or confession from earlier.", "intimacy", "abrasion"],
  ["voice", "Dark Humor, Cultural Critique & Unedited Sign-Off", "Move from pointed social critique into sudden vulnerability. End on a blunt remark that leaves the speaker's rough edges and the stakes of the story audible.", "abrasion", "intimacy"],
  ["arrangement", "Time-Stamped Pacing & Hook-Verse Alternation", "Plan approximate timings for a dense narrative verse, a tighter refrain, and a spoken outro. Use the shortened hook to change breathing and attention between long sections.", "momentum", "-density"],
  ["range", "Ritual Initiation & Psychoacoustic Arrangement", "Arrange the song as a sequence the listener can move through. Establish a grounded pulse, introduce a deliberate dissonance, and return to a recognizably changed version of the opening.", "ambiguity", "intimacy"],
  ["method", "Sonic Facilitation & Listener Participation", "Invite listeners into a concrete action or a choice. Use performance and repetition to give them room to recognize their own experience within the song.", "-abrasion", "intimacy"],
  ["voice", "Conversational Storytelling & Pop-Culture Irony", "Use scattered cultural or childhood echoes as rhythmic punctuation. Interrupt the narration with a real question and land the next turn on a daily physical action.", "intimacy", "momentum"],
  ["sound", "Symmetrical Word-Pairing & Surrealist Humor", "Build paired phrases that echo in stress and sound while their images diverge. Let the playful collision carry a reflective turn without slowing the cadence.", "ambiguity", "density"],
  ["voice", "Metamorphosis & Conversational Greeting", "Start with the immediacy of a plainspoken greeting. Evolve its speech rhythm into an internal rhyme chain as the speaker describes an identity in flux.", "intimacy", "momentum"],
  ["arrangement", "Structural Evolution & Dialectical Alchemy", "Trace one change across verse, hook, return verse, and bridge. Introduce a physical trial, then let each section widen its scale and alter the meaning of the opening image.", "ambiguity", "momentum"],
  ["arrangement", "Liquid Electronica & Overdrive Instrumentation Cues", "Pair introspective lines with audible arrangement changes. Specify where a liquid texture opens up and where a sharper instrumental edge pushes against the voice.", "abrasion", "density"],
  ["density", "Phonetic Word-Splitting & Self-Interrupting Cadence", "Cut a familiar word into parts the voice can stress independently. Put that cut inside a rapid internal rhyme chain and let it puncture the speaker's own momentum.", "density", "momentum"],
].map(([group, title, text, ...levers], index) => ({
  group,
  levers,
  reference: { id: String(index + 1).padStart(2, "0"), title, text },
}));

export const REFERENCES = modules.map(({ reference }) => reference);

function stableFraction(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function pickTheme(context) {
  return themes
    .map(theme => ({
      theme,
      score: Array.from(context.matchAll(theme.cues)).length + stableFraction(theme.title + context),
    }))
    .sort((a, b) => b.score - a.score)[0].theme;
}

export function chooseReferences({ seed = "", anchor = "", levers = {}, previous } = {}) {
  const theme = pickTheme(`${seed}\n${anchor}`);
  const chosenAnchor = anchor.trim() || theme.premise;
  const context = `${seed}\n${chosenAnchor}`;
  const recent = new Set((previous?.references ?? []).map(({ id }) => id));

  const ranked = modules.map(module => {
    const { id } = module.reference;
    let score = theme.modules.includes(id) ? 1.5 : 0;
    for (const axis of module.levers) {
      const inverse = axis.startsWith("-");
      const level = levers[inverse ? axis.slice(1) : axis] ?? 50;
      const direction = inverse ? -1 : 1;
      score += direction * (level - 50) / 40;
    }
    return { ...module, score: score + stableFraction(id + context) };
  }).sort((a, b) => b.score - a.score);
  const first = ranked[0];
  const second = ranked.find(module =>
    module.group !== first.group &&
    !(recent.has(first.reference.id) && recent.has(module.reference.id))
  );

  return { anchor: chosenAnchor, references: [first.reference, second.reference] };
}
