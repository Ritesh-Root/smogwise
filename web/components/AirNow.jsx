import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { VStack } from '@astryxdesign/core/VStack';
import { HOUSEHOLD_OPTIONS, SEVERITY_BADGES } from '../constants.js';
import { severityClass } from '../format.js';

const MEMBER_LABELS = Object.fromEntries(HOUSEHOLD_OPTIONS.map((option) => [option.value, option.label]));

/**
 * Headline tile: current index, what it means, health advice (general and for this household), and pollutant levels.
 * `language` is the language of the advice text that comes from the Air Quality API.
 * @param {{
 *   location: import('../types.js').PlanResult['location'],
 *   air: import('../types.js').Air,
 *   groupAdvice: import('../types.js').GroupAdvice[],
 *   language: string,
 * }} props
 */
export function AirNow({ location, air, groupAdvice, language }) {
  const dominant = air.pollutants.find((p) => p.code === air.dominantPollutant);
  const readings = air.pollutants.filter((p) => p.value !== null);
  const badge = SEVERITY_BADGES[air.severity] ?? SEVERITY_BADGES.at(-1);
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <Text type="label" color="secondary">
          {location.label}
        </Text>
        <HStack gap={4} align="center" wrap="wrap">
          <Text type="display-1" as="p" className={`aqi-number ${severityClass(air.severity)}`}>
            <VisuallyHidden>{`${air.index.name}: `}</VisuallyHidden>
            {air.index.aqi}
          </Text>
          <VStack gap={1}>
            <Heading level={2}>{`${air.severityLabel} air quality`}</Heading>
            <Text type="supporting">
              {`${air.index.name}${dominant ? `. Main pollutant: ${dominant.name}` : ''}`}
              {air.index.higherIsWorse ? '' : '. On this index 100 is the cleanest air.'}
            </Text>
          </VStack>
          <Badge variant={badge} label={<span lang={language}>{air.index.category || air.severityLabel}</span>} />
        </HStack>
        {air.healthAdvice && <Text lang={language}>{air.healthAdvice}</Text>}
        {groupAdvice.length > 0 && (
          <VStack gap={2} lang={language}>
            {groupAdvice.map(({ member, advice }) => (
              <Text key={member}>{`${MEMBER_LABELS[member] ?? member}: ${advice}`}</Text>
            ))}
          </VStack>
        )}
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
