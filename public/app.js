/** SmogWise browser client. All dynamic content is written with textContent, never innerHTML. */

const $ = (id) => document.getElementById(id);
const form = $('profile-form');
const statusEl = $('status');
const placeInput = $('place');
const placeError = $('place-error');

/** Place resolved for the text currently in the input, and the last successful plan request. */
let resolvedPlace = null;
let planRequest = null;
const chatHistory = [];

/** Create an element with optional class and text. */
function el(tag, { className, text } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  node.append(...children);
  return node;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

async function api(path, body) {
  const response = await fetch(`/api/${path}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

const formatHour = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function table(caption, headers, rows) {
  const head = el('tr', {}, headers.map((text) => {
    const th = el('th', { text });
    th.scope = 'col';
    return th;
  }));
  const body = rows.map((cells) => el('tr', {}, cells.map((text) => el('td', { text: String(text) }))));
  return el('div', { className: 'table-wrap' }, [
    el('table', {}, [el('caption', { text: caption }), el('thead', {}, [head]), el('tbody', {}, body)]),
  ]);
}

function renderAir(location, air) {
  const dominant = air.pollutants.find((p) => p.code === air.dominantPollutant);
  $('air-now').replaceChildren(
    el('p', { text: location.label }),
    el('div', { className: `aqi sev-${air.severity}` }, [
      el('span', { className: 'aqi-value', text: String(air.index.aqi) }),
      el('div', {}, [
        el('p', { className: 'aqi-label', text: `${air.severityLabel}: ${air.index.category}` }),
        el('p', { className: 'hint', text: `${air.index.name}${dominant ? `. Main pollutant: ${dominant.name}` : ''}` }),
      ]),
    ]),
    el('p', { text: air.healthAdvice }),
    table('Pollutant levels', ['Pollutant', 'Level'], air.pollutants
      .filter((p) => p.value !== null)
      .map((p) => [p.name, `${p.value} ${p.units}`])),
  );
}

function itemList(items, render) {
  return el('ul', { className: 'items' }, items.map((item) => el('li', {}, render(item))));
}

function renderPlan(plan) {
  $('plan').replaceChildren(
    el('p', { text: plan.summary }),
    ...plan.alerts.map((text) => el('p', { className: 'alert', text })),
    el('h3', { text: 'Daily routine' }),
    itemList(plan.routine, (r) => [
      el('strong', { text: `${r.time}: ${r.action}` }),
      el('p', { className: 'impact-line', text: `Impact: ${r.impact}` }),
    ]),
    el('h3', { text: 'Indoor air hacks' }),
    itemList(plan.indoor, (i) => [
      el('strong', { text: i.tip }),
      el('p', { className: 'impact-line', text: `Impact: ${i.impact}` }),
      el('span', { className: 'tag', text: `Cost: ${i.cost}` }),
    ]),
    el('h3', { text: 'Sustainable swaps' }),
    itemList(plan.alternatives, (a) => [
      el('strong', { text: a.swap }),
      el('p', { className: 'impact-line', text: `Impact: ${a.impact}` }),
    ]),
  );
}

function renderImpact({ commute, outdoor }) {
  const nodes = [];
  if (outdoor) {
    nodes.push(
      el('h3', { text: 'When you go outside' }),
      el('p', {
        text: `Cleanest daytime hour: ${formatHour(outdoor.best.time)} (AQI ${outdoor.best.aqi}). `
          + `Most polluted: ${formatHour(outdoor.worst.time)} (AQI ${outdoor.worst.aqi}). `
          + `Moving outdoor time to the cleanest hour means air that is about ${outdoor.reductionPercent}% less polluted.`,
      }),
    );
  }
  nodes.push(
    el('h3', { text: 'How you travel' }),
    el('p', {
      text: `${commute.label}, ${commute.weeklyKm} km a week: about ${commute.co2KgWeek} kg of CO2 `
        + `and ${commute.pm25GWeek} g of fine particles (PM2.5) from the exhaust each week.`,
    }),
  );
  if (commute.alternatives.length > 0) {
    nodes.push(table('What switching would save', ['Switch to', 'CO2 saved per week', 'CO2 saved per year', 'Reduction'],
      commute.alternatives.map((a) => [a.label, `${a.co2SavedKgWeek} kg`, `${a.co2SavedKgYear} kg`, `${a.co2SavedPercent}%`])));
  } else {
    nodes.push(el('p', { text: 'You already use one of the lowest-emission ways to travel.' }));
  }
  $('impact').replaceChildren(...nodes);
}

function renderForecast(forecast) {
  const everyOtherHour = forecast.filter((_, i) => i % 2 === 0);
  $('forecast').replaceChildren(everyOtherHour.length > 0
    ? table('Forecast air quality index', ['Time', 'AQI', 'Category'],
      everyOtherHour.map((h) => [formatHour(h.time), h.index.aqi, h.index.category]))
    : el('p', { text: 'An hourly forecast is not available for this location.' }));
}

function showPlaceError(message) {
  placeError.textContent = message;
  placeError.hidden = !message;
  placeInput.setAttribute('aria-invalid', String(Boolean(message)));
}

async function resolvePlace() {
  const typed = placeInput.value.trim();
  if (resolvedPlace && resolvedPlace.typed === typed) return resolvedPlace;
  if (typed.length < 2) throw new Error('Enter your city or neighbourhood.');
  const place = await api(`location?q=${encodeURIComponent(typed)}`);
  resolvedPlace = { ...place, typed };
  return resolvedPlace;
}

function readProfile() {
  const data = new FormData(form);
  return {
    household: data.getAll('household'),
    commuteMode: data.get('commuteMode'),
    commuteKm: Number(data.get('commuteKm')),
    commuteDays: Number(data.get('commuteDays')),
    cookingFuel: data.get('cookingFuel'),
    heating: data.get('heating'),
    hasPurifier: $('hasPurifier').checked,
    notes: data.get('notes'),
    language: data.get('language'),
  };
}

async function withBusy(button, task) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    await task();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  showPlaceError('');
  withBusy($('submit'), async () => {
    let place;
    try {
      setStatus('Finding your location...');
      place = await resolvePlace();
    } catch (error) {
      setStatus('');
      showPlaceError(error.message);
      placeInput.focus();
      return;
    }
    try {
      setStatus('Checking the air and building your plan. This takes a few seconds...');
      const request = {
        lat: place.lat,
        lng: place.lng,
        label: place.label,
        utcOffsetMinutes: -new Date().getTimezoneOffset(),
        profile: readProfile(),
      };
      const result = await api('plan', request);
      planRequest = request;
      chatHistory.length = 0;
      $('chat-log').replaceChildren();
      renderAir(result.location, result.air);
      renderPlan(result.plan);
      renderImpact(result.impact);
      renderForecast(result.air.forecast);
      $('results').hidden = false;
      setStatus('Your plan is ready.');
      $('air-title').focus();
    } catch (error) {
      setStatus(error.message, true);
    }
  });
});

$('locate').addEventListener('click', () => {
  showPlaceError('');
  if (!navigator.geolocation) {
    showPlaceError('Your browser cannot share location. Type your city instead.');
    return;
  }
  setStatus('Asking your browser for your location...');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const place = await api(`location?lat=${coords.latitude}&lng=${coords.longitude}`);
        placeInput.value = place.label;
        resolvedPlace = { ...place, typed: place.label };
        setStatus(`Location set to ${place.label}.`);
      } catch (error) {
        setStatus('');
        showPlaceError(error.message);
      }
    },
    () => {
      setStatus('');
      showPlaceError('We could not get your location. Type your city instead.');
    },
    { timeout: 10000, maximumAge: 600000 },
  );
});

$('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('question');
  const question = input.value.trim();
  if (question.length < 2 || !planRequest) return;
  const log = $('chat-log');
  log.append(el('p', { className: 'from-user', text: `You: ${question}` }));
  input.value = '';
  withBusy($('ask'), async () => {
    try {
      const { answer } = await api('chat', { ...planRequest, question, history: chatHistory.slice(-8) });
      chatHistory.push({ role: 'user', text: question }, { role: 'model', text: answer.slice(0, 2000) });
      log.append(el('p', { text: `SmogWise: ${answer}` }));
    } catch (error) {
      log.append(el('p', { className: 'field-error', text: error.message }));
    }
    input.focus();
  });
});
