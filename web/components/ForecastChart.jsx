import { Card } from '@astryxdesign/core/Card';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { badness, formatHour, severityClass, summariseForecast } from '../format.js';

/** Chart geometry in SVG units: bar width, gap between bars, total height, minimum bar height and corner radius. */
const BAR = 10;
const GAP = 2;
const HEIGHT = 100;
const MIN_BAR_HEIGHT = 4;
const BAR_RADIUS = 2;

const COLUMNS = [
  { key: 'time', header: 'Time' },
  { key: 'aqi', header: 'AQI', align: 'end' },
  { key: 'category', header: 'Category' },
];

/**
 * 24-hour forecast as bars coloured by severity. It is a data chart rather than an icon, so it is drawn
 * as SVG. The chart is one image with a text summary, and the same data is available as a table, so
 * nothing depends on seeing colour or the drawing.
 * @param {{forecast: import('../types.js').ForecastHour[]}} props
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
  const { worstBadness, summary, rows } = summariseForecast(forecast);
  const width = forecast.length * (BAR + GAP);
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
          {forecast.map((hour, i) => {
            const barHeight = Math.max(MIN_BAR_HEIGHT, (badness(hour.index) / worstBadness) * HEIGHT);
            return (
              <rect
                key={hour.time}
                className={`bar ${severityClass(hour.severity)}`}
                x={i * (BAR + GAP)}
                y={HEIGHT - barHeight}
                width={BAR}
                height={barHeight}
                rx={BAR_RADIUS}
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
        <Collapsible
          trigger={
            <Text type="label" className="table-toggle">
              View the forecast as a table
            </Text>
          }
          defaultIsOpen={false}
        >
          <Table
            aria-label="Hourly air quality forecast"
            data={rows}
            columns={COLUMNS}
            idKey="time"
            density="compact"
          />
        </Collapsible>
      </VStack>
    </Card>
  );
}
