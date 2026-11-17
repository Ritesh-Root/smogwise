import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App.jsx';
import { accessibilityViolations } from './a11y.js';
import { PLACE, PLAN_RESPONSE, stubFetch } from './fixtures.js';
import { renderWithTheme } from './render.jsx';

/** Routes given by a test are tried before the defaults, so a test can override any endpoint. */
function setup(routes = []) {
  const fetchStub = stubFetch([...routes, ['location', 200, PLACE], ['api/plan', 200, PLAN_RESPONSE]]);
  vi.stubGlobal('fetch', fetchStub.impl);
  const user = userEvent.setup();
  const view = renderWithTheme(<App />);
  return { user, calls: fetchStub.calls, ...view };
}

const placeField = () => screen.getByLabelText(/City or neighbourhood/);
const submit = () => screen.getByRole('button', { name: 'Get my clean-air plan' });
const planCalls = (calls) => calls.filter((call) => call.url.includes('api/plan'));

async function buildPlan(user, place = 'Delhi') {
  await user.type(placeField(), place);
  await user.click(submit());
  return screen.findByRole('region', { name: 'Your clean-air plan' });
}

describe('household form', () => {
  it('has a skip link, one h1, a named form and no automated accessibility violations', async () => {
    const { container } = setup();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('form', { name: 'Tell us about your household' })).toBeInTheDocument();
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('offers every household, fuel and heating choice with a label', () => {
    setup();
    for (const name of ['Children', 'Older adults', 'Asthma or lung condition', 'Pregnant', 'Works outdoors']) {
      expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('radiogroup', { name: /Winter heating/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Plan language/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'We own an air purifier' })).toBeInTheDocument();
  });

  it('marks the Hindi option with its own language', () => {
    setup();
    expect(document.querySelector('[lang="hi"]')).toHaveTextContent('हिन्दी');
  });

  it('blocks an empty submit, explains the problem and focuses the place field', async () => {
    const { user, calls } = setup();
    await user.click(submit());
    expect((await screen.findAllByText('Enter your city or neighbourhood.')).length).toBeGreaterThan(0);
    await waitFor(() => expect(placeField()).toHaveFocus());
    expect(placeField()).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it('shows the error after the user leaves the field and clears it as they type', async () => {
    const { user } = setup();
    await user.type(placeField(), 'a');
    await user.tab();
    expect((await screen.findAllByText('Enter your city or neighbourhood.')).length).toBeGreaterThan(0);
    expect(placeField()).toHaveAttribute('aria-invalid', 'true');
    await user.type(placeField(), 'b');
    // The library keeps the last announcement in a hidden live region, so check the field state instead.
    await waitFor(() => expect(placeField()).not.toHaveAttribute('aria-invalid', 'true'));
  });
});

describe('building a plan', () => {
  it('looks up the place, sends the household and shows the plan', async () => {
    const { user, calls } = setup();
    await user.type(placeField(), 'Anand Vihar, Delhi');
    await user.click(screen.getByRole('checkbox', { name: 'Children' }));
    await user.click(submit());

    await screen.findByRole('region', { name: 'Your clean-air plan' });
    expect(await screen.findByText('Air is poor today, so protect the children first.')).toBeInTheDocument();
    expect(screen.getByText('Your plan is ready.')).toBeInTheDocument();

    expect(calls[0].url).toContain('/api/location?q=Anand%20Vihar%2C%20Delhi');
    const body = planCalls(calls)[0].body;
    expect(body).toMatchObject({ lat: 28.65, lng: 77.31, label: 'Anand Vihar, Delhi, India' });
    expect(body.profile).toMatchObject({
      household: ['children'],
      commuteMode: 'car_petrol',
      commuteKm: 20,
      commuteDays: 5,
      cookingFuel: 'lpg',
      language: 'en',
    });
  });

  it('does not look the same place up twice when the plan is rebuilt', async () => {
    const { user, calls } = setup();
    await buildPlan(user, 'Delhi');
    await user.click(submit());
    await waitFor(() => expect(planCalls(calls)).toHaveLength(2));
    expect(calls.filter((call) => call.url.includes('api/location'))).toHaveLength(1);
  });

  it('moves focus to the results when the plan is ready', async () => {
    const { user } = setup();
    const region = await buildPlan(user);
    await waitFor(() => expect(region).toHaveFocus());
  });

  it('reports an unknown place on the field and does not build a plan', async () => {
    const { user, calls } = setup([['location', 404, { error: 'We could not find that place.' }]]);
    await user.type(placeField(), 'Nowhereville');
    await user.click(submit());
    expect((await screen.findAllByText('We could not find that place.')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: 'Your clean-air plan' })).toBeNull();
    expect(planCalls(calls)).toHaveLength(0);
  });

  it('announces a plan failure as an alert', async () => {
    const { user } = setup([['api/plan', 502, { error: 'A data service is temporarily unavailable.' }]]);
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert').map((node) => node.textContent);
      expect(alerts.join(' ')).toContain('A data service is temporarily unavailable.');
    });
    expect(screen.queryByRole('region', { name: 'Your clean-air plan' })).toBeNull();
  });

  it('tells the user when the network is down', async () => {
    const { user } = setup();
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    expect((await screen.findAllByText(/We could not reach SmogWise/)).length).toBeGreaterThan(0);
  });

  it('shows a Hindi plan with Hindi headings and asks the server for Hindi', async () => {
    const { user, calls } = setup();
    await user.type(placeField(), 'Delhi');
    await user.click(screen.getByRole('radio', { name: /Hindi/ }));
    await user.click(submit());
    await screen.findByRole('region', { name: 'Your clean-air plan' });
    expect(planCalls(calls)[0].body.profile.language).toBe('hi');
    expect(await screen.findByRole('heading', { name: 'आज की आपकी योजना' })).toBeInTheDocument();
  });
});

describe('copying the plan', () => {
  it('copies a shareable text version of the plan', async () => {
    const { user } = setup();
    // user-event installs its own clipboard on setup, so replace it afterwards.
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await buildPlan(user);
    await user.click(await screen.findByRole('button', { name: 'Copy plan to share' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain('SmogWise plan for Anand Vihar, Delhi, India');
    expect(await screen.findByText(/Plan copied/)).toBeInTheDocument();
  });

  it('says so when copying is not available', async () => {
    const { user } = setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    await buildPlan(user);
    await user.click(await screen.findByRole('button', { name: 'Copy plan to share' }));
    expect(await screen.findByText(/Copying is not available/)).toBeInTheDocument();
  });
});

describe('use my location', () => {
  const useLocation = (getCurrentPosition) =>
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });

  it('fills the field from the browser position, rounded to about 1 km', async () => {
    const { user, calls } = setup([['lat=', 200, { lat: 19.07, lng: 72.87, label: 'Mumbai, Maharashtra, India' }]]);
    useLocation((success) => success({ coords: { latitude: 19.07612345, longitude: 72.87771234 } }));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await waitFor(() => expect(placeField()).toHaveValue('Mumbai, Maharashtra, India'));
    expect(calls[0].url).toContain('lat=19.08&lng=72.88');
    expect(await screen.findByText(/Location set to Mumbai/)).toBeInTheDocument();
  });

  it('explains when the browser refuses', async () => {
    const { user } = setup();
    useLocation((_success, failure) => failure(new Error('denied')));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect((await screen.findAllByText(/We could not get your location/)).length).toBeGreaterThan(0);
  });

  it('explains when the browser has no location support', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect((await screen.findAllByText(/Your browser cannot share location/)).length).toBeGreaterThan(0);
  });
});
