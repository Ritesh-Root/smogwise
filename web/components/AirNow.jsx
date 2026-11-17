import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { SEVERITY_STYLES } from '../constants.js';

/** Headline tile: current index, what it means, the official health advice and pollutant levels. */
export function AirNow({ location, air }) {
  const dominant = air.pollutants.find((p) => p.code === air.dominantPollutant);
  const readings = air.pollutants.filter((p) => p.value !== null);
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <Text type="label" color="secondary">{location.label}</Text>
        <HStack gap={4} align="center" wrap="wrap">
          <Text type="display-1" as="p" className={`aqi-number sev-${air.severity}`}>{air.index.aqi}</Text>
          <VStack gap={1}>
            <Heading level={2}>{`${air.severityLabel} air quality`}</Heading>
            <Text type="supporting">
              {`${air.index.name}${dominant ? `. Main pollutant: ${dominant.name}` : ''}`}
            </Text>
          </VStack>
          <Badge variant={SEVERITY_STYLES[air.severity].badge} label={air.index.category || air.severityLabel} />
        </HStack>
        {air.healthAdvice && <Text>{air.healthAdvice}</Text>}
        {readings.length > 0 && (
          <MetadataList title="Pollutant levels" columns="multi" label={{ position: 'top' }}>
            {readings.map((p) => (
              <MetadataListItem key={p.code} label={p.name}>{`${p.value} ${p.units}`}</MetadataListItem>
            ))}
          </MetadataList>
        )}
      </VStack>
    </Card>
  );
}
