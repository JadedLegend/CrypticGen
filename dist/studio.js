import { LEVERS, STAGES, runTrack } from './engine.js';
import { mountConnection } from './connection.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#composer');
const seed = $('#seed');
const steering = $('#steering');
const status = $('#compose-status');
const historyDialog = $('#history');
const tabs = [...document.querySelectorAll('[role="tab"]')];
const storage = { draft: 'crypticgen.draft.v1', trackPrefix: 'crypticgen.track.v1.' };
const leverElements = new Map();
const stageElements = new Map();
const stageRoles = ['Concept', 'Production', 'Lyrics', 'Arrangement'];
let tracks = readTracks();
let selected = null;
let currentRun = null;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

function readTracks() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(storage.trackPrefix))
      .map((key) => read(key, null))
      .filter((track) => typeof track?.title === 'string' && typeof track.lyrics === 'string' && typeof track.style === 'string')
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  } catch { return []; }
}

window.addEventListener('storage', (event) => {
  if (event.key?.startsWith(storage.trackPrefix)) {
    tracks = readTracks();
    updateHistoryCount();
  }
});

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function message(text, kind = '') {
  status.textContent = text;
  status.dataset.kind = kind;
}

function saveDraft() {
  write(storage.draft, { seed: seed.value, engine: steering.checked, controls: controls() });
}

function controls() {
  return Object.fromEntries([...leverElements].map(([id, { range, locked }]) => [id, locked ? Number(range.value) : null]));
}

function toggleLevers() {
  for (const [id, row] of leverElements) {
    const lever = LEVERS.find((item) => item.id === id);
    row.range.style.setProperty('--level', `${(Number(row.range.value) - Number(row.range.min)) / (Number(row.range.max) - Number(row.range.min)) * 100}%`);
    row.hold.classList.toggle('locked', row.locked);
    row.hold.setAttribute('aria-pressed', String(row.locked));
    row.hold.setAttribute('aria-label', `${row.locked ? 'Release' : 'Lock'} ${lever.label}`);
    row.hold.textContent = row.locked ? 'Locked' : steering.checked ? 'Auto' : 'Default';
    row.value.textContent = row.locked || !steering.checked ? row.range.value : '—';
    row.shell.classList.toggle('is-auto', steering.checked && !row.locked);
  }
}

const draft = read(storage.draft, {});
seed.value = typeof draft.seed === 'string' ? draft.seed.slice(0, seed.maxLength) : '';
steering.checked = draft.engine === true;

for (const lever of LEVERS) {
  const shell = make('div', 'lever');
  const label = make('label', 'lever-name', lever.label);
  const range = make('input', 'lever-range');
  range.type = 'range';
  range.id = `lever-${lever.id}`;
  range.min = lever.min ?? 0;
  range.max = lever.max ?? 100;
  range.step = 1;
  const initial = draft.controls?.[lever.id];
  const locked = Number.isInteger(initial) && initial >= Number(range.min) && initial <= Number(range.max);
  range.value = locked ? initial : lever.defaultValue;
  label.htmlFor = range.id;
  const hint = make('p', 'lever-hint', lever.hint);
  hint.id = `${range.id}-hint`;
  const endpoints = make('div', 'lever-endpoints');
  endpoints.id = `${range.id}-endpoints`;
  endpoints.append(make('span', '', lever.low), make('span', '', lever.high));
  range.setAttribute('aria-describedby', `${hint.id} ${endpoints.id}`);
  const value = make('output', 'lever-value');
  value.htmlFor = range.id;
  const hold = make('button', 'lever-lock');
  hold.type = 'button';
  const row = { shell, range, value, hold, locked };
  hold.addEventListener('click', () => {
    row.locked = !row.locked;
    if (!row.locked) range.value = lever.defaultValue;
    toggleLevers();
    saveDraft();
  });
  range.addEventListener('input', () => {
    row.locked = true;
    toggleLevers();
    saveDraft();
  });
  shell.append(label, value, hint, range, hold, endpoints);
  $('#levers').append(shell);
  leverElements.set(lever.id, row);
}

toggleLevers();
seed.addEventListener('input', saveDraft);
steering.addEventListener('change', () => { toggleLevers(); saveDraft(); });
$('#reset').addEventListener('click', () => {
  for (const lever of LEVERS) {
    const row = leverElements.get(lever.id);
    row.locked = false;
    row.range.value = lever.defaultValue;
  }
  toggleLevers();
  saveDraft();
  message('Sliders reset.');
});

STAGES.forEach((stage, index) => {
  const node = make('div', 'stage');
  const marker = make('span', 'stage-marker', String(index + 1));
  marker.setAttribute('aria-hidden', 'true');
  const label = make('span', 'stage-label', stage.name);
  const detail = make('span', 'stage-detail', stageRoles[index]);
  if (stage.role) node.title = stage.role;
  node.append(marker, label, detail);
  $('#stages').append(node);
  stageElements.set(stage.id, { node, marker, detail, index });
});

let connected = false;
const connection = mountConnection({
  root: $('#connection'), trigger: $('#connection-trigger'), stages: STAGES, defaultModel: 'openrouter/free',
  onChange(next) {
    connected = next.connected;
    $('#connection-trigger').dataset.connected = String(connected);
    $('#connection-label').textContent = connected ? 'OpenRouter' : 'Connect OpenRouter';
    if (!currentRun && (!selected || !connected)) {
      message(connected ? 'Ready to generate.' : 'Connect an OpenRouter key to start a run.');
    }
  },
});

function setStage(id, state = '', detail) {
  const stage = stageElements.get(id);
  if (!stage) return;
  stage.node.dataset.state = state;
  stage.marker.textContent = state === 'done' ? '✓' : state === 'failed' ? '!' : String(stage.index + 1);
  stage.detail.textContent = state === 'active' ? 'Working…' : state === 'done' ? 'Complete' : state === 'failed' ? 'Needs attention' : stageRoles[stage.index];
  if (state === 'active') message(`${STAGES[stage.index].name} is working…`);
  if (typeof detail === 'string' && detail) stage.node.title = detail;
  else stage.node.title = STAGES[stage.index].role;
}

function setBusy(busy) {
  $('#generate').disabled = busy;
  $('#cancel').hidden = !busy;
  $('#cancel').disabled = false;
  $('#history-trigger').disabled = busy;
  $('#connection-trigger').disabled = busy;
  $('#reset').disabled = busy;
  $('#lever-fieldset').disabled = busy;
  seed.readOnly = busy;
  form.setAttribute('aria-busy', String(busy));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (currentRun) return;
  const key = connection.getKey();
  if (!key) {
    message('Add an OpenRouter key to generate a track.');
    connection.open();
    return;
  }
  currentRun = new AbortController();
  setBusy(true);
  const signal = currentRun.signal;
  for (const stage of STAGES) setStage(stage.id);
  $('#output-placeholder-title').textContent = 'Track in progress';
  $('#output-placeholder-body').textContent = 'Follow the agents above as they pass the draft through each stage.';
  try {
    const result = await runTrack({
      seed: seed.value.trim(), steering: steering.checked ? 'engine' : 'manual', controls: controls(),
      models: connection.getModels(), key, previous: tracks.at(-1), signal, onStage: setStage,
    });
    if (signal.aborted) return;
    const track = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    tracks.push(track);
    const saved = write(storage.trackPrefix + track.id, track);
    updateHistoryCount();
    showTrack(track);
    message(saved ? 'Track complete and saved in Sessions.' : 'Track complete. Browser storage is unavailable. Download to keep a copy.', saved ? '' : 'warning');
  } catch (error) {
    if (!signal.aborted) message(error instanceof Error ? error.message : 'The run failed. Try again.', 'error');
  } finally {
    if (signal.aborted) {
      for (const stage of STAGES) {
        if (stageElements.get(stage.id).node.dataset.state !== 'done') setStage(stage.id);
      }
      message('Run canceled.');
    }
    currentRun = null;
    setBusy(false);
    $('#output-placeholder-title').textContent = 'Your track starts here';
    $('#output-placeholder-body').textContent = 'Run the four agents to build lyrics, a production brief, and a Suno-ready arrangement.';
  }
});

$('#cancel').addEventListener('click', () => {
  currentRun?.abort();
  $('#cancel').disabled = true;
});

seed.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    form.requestSubmit();
  }
});

function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  }
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const within = (position) => (position + tabs.length) % tabs.length;
    const target = { ArrowRight: within(index + 1), ArrowLeft: within(index - 1), Home: 0, End: tabs.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectTab(tabs[target], true);
  });
});

function showTrack(track) {
  selected = track;
  $('#output-empty').hidden = true;
  $('#track-output').hidden = false;
  $('#download').hidden = false;
  $('#track-title').textContent = track.title;
  for (const [field, limit] of [['lyrics', 5000], ['style', 1000]]) {
    const count = $(`#${field}-count`);
    count.textContent = `${track[field].length.toLocaleString()} / ${limit.toLocaleString()} characters`;
    $(`#${field}`).textContent = track[field];
  }
  const notes = $('#notes');
  notes.replaceChildren();
  const fields = [
    ['Syndicate tension', track.syndicateTension?.title],
    ['Concept', track.concept],
    ['Direction', track.direction],
    ['Engine experiment', track.experiment],
    ['Session summary', track.summary],
  ];
  if (track.references?.length) fields.push(['Craft references', track.references.map((reference) => reference.title).join(' · ')]);
  for (const [name, value] of fields) {
    if (typeof value !== 'string' || !value) continue;
    const section = make('section', 'note');
    section.append(make('h4', '', name), make('p', '', value));
    notes.append(section);
  }
  const resolved = make('section', 'note resolved');
  const values = make('dl', 'resolved-values');
  for (const lever of LEVERS) {
    if (track.resolved?.[lever.id] == null) continue;
    const pair = make('div');
    pair.append(make('dt', '', lever.label), make('dd', '', track.resolved[lever.id]));
    values.append(pair);
  }
  resolved.append(make('h4', '', track.steering === 'engine' ? 'Engine settings' : 'Manual settings'), values);
  notes.append(resolved);
  selectTab(tabs[0]);
}

let copyTimer;
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    if (!selected) return;
    const label = `Copy ${button.dataset.copy}`;
    try {
      await navigator.clipboard.writeText(selected[button.dataset.copy]);
      clearTimeout(copyTimer);
      for (const control of document.querySelectorAll('[data-copy]')) control.textContent = `Copy ${control.dataset.copy}`;
      button.textContent = 'Copied';
      copyTimer = setTimeout(() => { button.textContent = label; }, 1800);
    } catch { message('Clipboard access is unavailable. Select the text to copy it.', 'warning'); }
  });
}

$('#download').addEventListener('click', () => {
  if (!selected) return;
  const output = new Blob([`${selected.title}\n\nSUNO STYLE\n${selected.style}\n\nLYRICS\n${selected.lyrics}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(output);
  const link = document.createElement('a');
  link.download = `${selected.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'crypticgen-track'}.txt`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function updateHistoryCount() {
  const count = $('#history-count');
  count.hidden = !tracks.length;
  count.textContent = tracks.length;
}

$('#history-trigger').addEventListener('click', () => {
  const list = $('#history-list');
  list.replaceChildren();
  if (!tracks.length) list.append(make('p', 'muted', 'Finished tracks will appear here. Sessions are saved in this browser.'));
  for (const track of [...tracks].reverse()) {
    const button = make('button', 'history-track');
    const date = new Date(track.createdAt);
    const caption = Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    button.type = 'button';
    button.append(make('strong', '', track.title), make('span', '', caption));
    button.addEventListener('click', () => {
      showTrack(track);
      historyDialog.close();
      message('Session loaded.');
      $('#output-heading').scrollIntoView({ block: 'nearest' });
    });
    list.append(button);
  }
  historyDialog.showModal();
});
$('#close-history').addEventListener('click', () => historyDialog.close());

updateHistoryCount();
if (tracks.length) showTrack(tracks.at(-1));
