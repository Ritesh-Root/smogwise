import { Card } from '@astryxdesign/core/Card';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { badness, formatHour } from '../format.js';

const BAR = 10;
const GAP = 2;
const HEIGHT = 100;

const COLUMNS = [
  { key: 'time', header: 'Time' },
  { key: 'aqi', header: 'AQI', align: 'end' },
  { key: 'category', header: 'Category' },
];

/**
 * 24-hour forecast as bars coloured by severity. The chart is one image with a text summary, and the
 * same data is available as a table, so nothing depends on seeing colour or the drawing.
 */
export function ForecastChart({ forecast }) {
  if (forecast.length === 0) {
    return (
      <Card padding={6}>
        <VStack gap={2}>
          <Heading level={2}>Next 24 hours</Heading>
          <Text>An hourly forecast is not available for this location.</Text>
        </VStack>
      </Card>
    );
  }
  const worst = Math.max(...forecast.map((h) => badness(h.index)), 1);
  const best = forecast.reduce((a, b) => (badness(b.index) < badness(a.index) ? b : a));
  const peak = forecast.reduce((a, b) => (badness(b.index) > badness(a.index) ? b : a));
  const summary =
    `Forecast air quality for the next ${forecast.length} hours. ` +
    `Cleanest at ${formatHour(best.time)} (AQI ${best.index.aqi}), most polluted at ${formatHour(peak.time)} (AQI ${peak.index.aqi}).`;
  const width = forecast.length * (BAR + GAP);
  const rows = forecast.map((h) => ({ time: formatHour(h.time), aqi: h.index.aqi, category: h.index.category }));
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <Heading level={2}>Next 24 hours</Heading>
        <svg
          className="forecast-chart"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
        >
          {forecast.map((h, i) => {
            const barHeight = Math.max(4, (badness(h.index) / worst) * HEIGHT);
            return (
              <rect
                key={h.time}
                className={`bar sev-${h.severity}`}
                x={i * (BAR + GAP)}
                y={HEIGHT - barHeight}
                width={BAR}
                height={barHeight}
                rx={2}
              />
            );
          })}
        </svg>
        <HStack justify="between">
          <Text type="supporting">{formatHour(forecast[0].time)}</Text>
          <Text type="supporting">{formatHour(forecast[Math.floor(forecast.length / 2)].time)}</Text>
          <Text type="supporting">{formatHour(forecast.at(-1).time)}</Text>
        </HStack>
        <Text type="supporting">Taller bars mean more polluted air. {summary}</Text>
        <Collapsible trigger={<Text type="label">View the forecast as a table</Text>} defaultIsOpen={false}>
          <Table aria-label="Hourly air quality forecast" data={rows} columns={COLUMNS} idKey="time" density="compact" />
        </Collapsible>
      </VStack>
    </Card>
  );
}
