import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ForecastChart } from '../components/ForecastChart.jsx';
import Results from '../components/Results.jsx';
import { accessibilityViolations } from './a11y.js';
import { HINDI_REQUEST, PLAN_REQUEST, PLAN_RESPONSE } from './fixtures.js';
import { renderWithTheme } from './render.jsx';

const renderResults = (result = PLAN_RESPONSE, planRequest = PLAN_REQUEST) =>
  renderWithTheme(<Results result={result} planRequest={planRequest} announce={vi.fn()} />);

describe('Results', () => {
  it('shows the air, plan, impact and forecast with their numbers', () => {
    renderResults();
    const region = screen.getByRole('region', { name: 'Your clean-air plan' });
    expect(within(region).getByText('211')).toBeInTheDocument();
    expect(within(region).getByText('NAQI (IN):')).toBeInTheDocument(); // read before the number by screen readers
    expect(within(region).getByRole('heading', { name: 'Poor air quality' })).toBeInTheDocument();
    expect(within(region).getByText('Air is poor today, so protect the children first.')).toBeInTheDocument();
    expect(within(region).getByText('Keep children indoors this morning.')).toBeInTheDocument();
    expect(within(region).getByText('20.4 kg CO2')).toBeInTheDocument();
    expect(within(region).getByText('52% cleaner')).toBeInTheDocument();
    expect(within(region).getByText('Impact: Saves 16.8 kg of CO2 a week')).toBeInTheDocument();
  });

  it('shows the PM2.5 saved by a switch, not only the CO2', () => {
    renderResults();
    expect(
      screen.getByText('Saves 16.8 kg CO2 a week, 874 kg a year, and 1.2 g less PM2.5 a week'),
    ).toBeInTheDocument();
    expect(screen.getByText('82% less CO2')).toBeInTheDocument();
  });

  it('shows health advice for the people in this household', () => {
    renderResults();
    expect(screen.getByText('Children: Keep children indoors.')).toBeInTheDocument();
  });

  it('says which way the scale runs for the universal index', () => {
    const universal = {
      ...PLAN_RESPONSE,
      air: { ...PLAN_RESPONSE.air, index: { ...PLAN_RESPONSE.air.index, higherIsWorse: false } },
    };
    renderResults(universal);
    expect(screen.getByText(/On this index 100 is the cleanest air/)).toBeInTheDocument();
  });

  it('puts the whole Hindi plan card, headings included, in Hindi', () => {
    renderResults(PLAN_RESPONSE, HINDI_REQUEST);
    const heading = screen.getByRole('heading', { name: 'आज की आपकी योजना' });
    expect(heading.closest('[lang="hi"]')).not.toBeNull();
    expect(screen.getByText('प्रभाव: Removes settled dust')).toBeInTheDocument();
    expect(screen.getByText('लागत: Free')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Daily routine' })).toBeNull();
  });

  it('keeps the cost with the tip instead of in a badge that cannot wrap', () => {
    renderResults();
    expect(screen.getByText('Cost: Free')).toBeInTheDocument();
  });

  it('has no automated accessibility violations', async () => {
    const { container } = renderResults();
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('says so when the commute is already low emission', () => {
    const clean = {
      ...PLAN_RESPONSE,
      impact: {
        ...PLAN_RESPONSE.impact,
        commute: { ...PLAN_RESPONSE.impact.commute, alternatives: [] },
        outdoor: null,
      },
    };
    renderResults(clean);
    expect(screen.getByText('You already use one of the lowest-emission ways to travel.')).toBeInTheDocument();
  });

  it('survives an unknown severity level instead of crashing', () => {
    const odd = { ...PLAN_RESPONSE, air: { ...PLAN_RESPONSE.air, severity: 99 } };
    renderResults(odd);
    expect(screen.getByRole('heading', { name: 'Poor air quality' })).toBeInTheDocument();
  });
});

describe('ForecastChart', () => {
  it('describes the chart in text and offers the data as a table', () => {
    renderWithTheme(<ForecastChart forecast={PLAN_RESPONSE.air.forecast} />);
    const chart = screen.getByRole('img');
    expect(chart.getAttribute('aria-label')).toMatch(
      /Forecast air quality for the next 3 hours\. Cleanest at .* \(AQI 120\), most polluted at .* \(AQI 250\)/,
    );
    expect(chart.querySelectorAll('rect')).toHaveLength(3);
    expect(screen.getByText('View the forecast as a table')).toBeInTheDocument();
  });

  it('draws the more polluted hour taller', () => {
    renderWithTheme(<ForecastChart forecast={PLAN_RESPONSE.air.forecast} />);
    const heights = [...screen.getByRole('img').querySelectorAll('rect')].map((r) => Number(r.getAttribute('height')));
    expect(heights[2]).toBeGreaterThan(heights[0]);
    expect(heights[0]).toBeGreaterThan(heights[1]);
  });

  it('copes with a location that has no forecast', () => {
    renderWithTheme(<ForecastChart forecast={[]} />);
    expect(screen.getByText('An hourly forecast is not available for this location.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
