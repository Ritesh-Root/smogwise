import { Theme } from '@astryxdesign/core/theme';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Results from '../components/Results.jsx';
import { ForecastChart } from '../components/ForecastChart.jsx';
import { theme } from '../theme.js';
import { accessibilityViolations } from './a11y.js';
import { PLAN_RESPONSE } from './fixtures.js';

const withTheme = (ui) => render(<Theme theme={theme}>{ui}</Theme>);
const request = { lat: 28.65, lng: 77.31, label: 'Anand Vihar', utcOffsetMinutes: 330, profile: {} };

describe('Results', () => {
  it('shows the air, plan, impact and forecast with their numbers', () => {
    withTheme(<Results result={{ ...PLAN_RESPONSE, language: 'en' }} planRequest={request} onCopy={() => {}} />);
    const region = screen.getByRole('region', { name: 'Your clean-air plan' });
    expect(within(region).getByText('211')).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Poor air quality' })).toBeInTheDocument();
    expect(within(region).getByText('Air is poor today, so protect the children first.')).toBeInTheDocument();
    expect(within(region).getByText('Keep children indoors this morning.')).toBeInTheDocument();
    expect(within(region).getByText('20.4 kg CO2')).toBeInTheDocument();
    expect(within(region).getByText('52% cleaner')).toBeInTheDocument();
    expect(within(region).getByText('Saves 16.8 kg CO2 a week, 874 kg a year')).toBeInTheDocument();
    expect(within(region).getByText('82% less')).toBeInTheDocument();
    expect(within(region).getByText('Impact: Saves 16.8 kg of CO2 a week')).toBeInTheDocument();
  });

  it('marks a Hindi plan with its language', () => {
    withTheme(<Results result={{ ...PLAN_RESPONSE, language: 'hi' }} planRequest={request} onCopy={() => {}} />);
    expect(document.querySelector('[lang="hi"]')).toHaveTextContent('Air is poor today');
  });

  it('has no automated accessibility violations', async () => {
    const { container } = withTheme(<Results result={{ ...PLAN_RESPONSE, language: 'en' }} planRequest={request} onCopy={() => {}} />);
    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it('says so when the commute is already low emission', () => {
    const clean = { ...PLAN_RESPONSE, impact: { ...PLAN_RESPONSE.impact, commute: { ...PLAN_RESPONSE.impact.commute, alternatives: [] }, outdoor: null }, language: 'en' };
    withTheme(<Results result={clean} planRequest={request} onCopy={() => {}} />);
    expect(screen.getByText('You already use one of the lowest-emission ways to travel.')).toBeInTheDocument();
  });
});

describe('ForecastChart', () => {
  it('describes the chart in text and offers the data as a table', () => {
    withTheme(<ForecastChart forecast={PLAN_RESPONSE.air.forecast} />);
    const chart = screen.getByRole('img');
    expect(chart.getAttribute('aria-label')).toMatch(/Forecast air quality for the next 3 hours\. Cleanest at .* \(AQI 120\), most polluted at .* \(AQI 250\)/);
    expect(chart.querySelectorAll('rect')).toHaveLength(3);
    expect(screen.getByText('View the forecast as a table')).toBeInTheDocument();
  });

  it('draws the more polluted hour taller', () => {
    withTheme(<ForecastChart forecast={PLAN_RESPONSE.air.forecast} />);
    const heights = [...screen.getByRole('img').querySelectorAll('rect')].map((r) => Number(r.getAttribute('height')));
    expect(heights[2]).toBeGreaterThan(heights[0]);
    expect(heights[0]).toBeGreaterThan(heights[1]);
  });

  it('copes with a location that has no forecast', () => {
    withTheme(<ForecastChart forecast={[]} />);
    expect(screen.getByText('An hourly forecast is not available for this location.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
