import { Theme } from '@astryxdesign/core/theme';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App.jsx';
import { theme } from '../theme.js';
import { accessibilityViolations } from './a11y.js';
import { PLAN_RESPONSE, stubFetch } from './fixtures.js';

const PLACE = { lat: 28.65, lng: 77.31, label: 'Anand Vihar, Delhi, India' };

function setup(routes = []) {
  const fetchStub = stubFetch([['location', 200, PLACE], ['api/plan', 200, PLAN_RESPONSE], ...routes]);
  vi.stubGlobal('fetch', fetchStub.impl);
  const user = userEvent.setup();
  const view = render(<Theme theme={theme}><App /></Theme>);
  return { user, calls: fetchStub.calls, ...view };
}

const placeField = () => screen.getByLabelText(/City or neighbourhood/);
const submit = () => screen.getByRole('button', { name: 'Get my clean-air plan' });

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

  it('blocks an empty submit, explains the problem and focuses the place field', async () => {
    const { user, calls } = setup();
    await user.click(submit());
    expect((await screen.findAllByText('Enter your city or neighbourhood.')).length).toBeGreaterThan(0);
    expect(placeField()).toHaveFocus();
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

    const region = await screen.findByRole('region', { name: 'Your clean-air plan' });
    expect(await screen.findByText('Air is poor today, so protect the children first.')).toBeInTheDocument();
    expect(region).toBeInTheDocument();
    expect(screen.getByText('Your plan is ready.')).toBeInTheDocument();

    expect(calls[0].url).toContain('/api/location?q=Anand%20Vihar%2C%20Delhi');
    const body = calls[1].body;
    expect(body).toMatchObject({ lat: 28.65, lng: 77.31, label: 'Anand Vihar, Delhi, India' });
    expect(body.profile).toMatchObject({ household: ['children'], commuteMode: 'car_petrol', commuteKm: 20, commuteDays: 5, cookingFuel: 'lpg', language: 'en' });
  });

  it('moves focus to the results when the plan is ready', async () => {
    const { user } = setup();
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    const region = await screen.findByRole('region', { name: 'Your clean-air plan' });
    await waitFor(() => expect(region).toHaveFocus());
  });

  it('reports an unknown place on the field and does not build a plan', async () => {
    const { user, calls } = setup([]);
    vi.stubGlobal('fetch', stubFetch([['location', 404, { error: 'We could not find that place.' }]]).impl);
    await user.type(placeField(), 'Nowhereville');
    await user.click(submit());
    expect(await screen.findByText('We could not find that place.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your clean-air plan' })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('shows a banner when the plan service fails', async () => {
    const { user } = setup();
    vi.stubGlobal('fetch', stubFetch([['location', 200, PLACE], ['api/plan', 502, { error: 'A data service is temporarily unavailable.' }]]).impl);
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    expect(await screen.findByText('A data service is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your clean-air plan' })).toBeNull();
  });

  it('tells the user when the network is down', async () => {
    const { user } = setup();
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    expect(await screen.findByText(/We could not reach SmogWise/)).toBeInTheDocument();
  });

  it('copies a shareable text version of the plan', async () => {
    const { user } = setup();
    // user-event installs its own clipboard on setup, so replace it afterwards.
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    await user.click(await screen.findByRole('button', { name: 'Copy plan to share' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain('SmogWise plan for Anand Vihar, Delhi, India');
    expect(await screen.findByText(/Plan copied/)).toBeInTheDocument();
  });

  it('says so when copying is not available', async () => {
    const { user } = setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    await user.click(await screen.findByRole('button', { name: 'Copy plan to share' }));
    expect(await screen.findByText(/Copying is not available/)).toBeInTheDocument();
  });
});

describe('follow-up chat', () => {
  it('sends a suggested question with the household context and shows the answer', async () => {
    const { user, calls } = setup([['api/chat', 200, { answer: 'Wait until **3 pm**, when the air is cleanest.' }]]);
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    await user.click(await screen.findByRole('button', { name: 'Which mask should we use?' }));

    expect(await screen.findByText(/Wait until/)).toBeInTheDocument();
    const chat = calls.find((c) => c.url.includes('api/chat'));
    expect(chat.body).toMatchObject({ question: 'Which mask should we use?', history: [], lat: 28.65 });
    expect(chat.body.profile.cookingFuel).toBe('lpg');
  });

  it('shows an error banner when the answer fails', async () => {
    const { user } = setup([['api/chat', 502, { error: 'The assistant could not answer that.' }]]);
    await user.type(placeField(), 'Delhi');
    await user.click(submit());
    await user.click(await screen.findByRole('button', { name: 'Which mask should we use?' }));
    expect(await screen.findByText('The assistant could not answer that.')).toBeInTheDocument();
  });
});
