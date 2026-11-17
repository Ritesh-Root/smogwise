import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { formatHour } from '../format.js';

function Stat({ heading, value, note }) {
  return (
    <Card padding={4}>
      <VStack gap={1}>
        <Text type="label" color="secondary">{heading}</Text>
        <Text type="display-3" as="p">{value}</Text>
        <Text type="supporting">{note}</Text>
      </VStack>
    </Card>
  );
}

/** The numbers behind the advice. All figures come from the server's deterministic impact engine. */
export function ImpactView({ commute, outdoor }) {
  return (
    <Card padding={6}>
      <VStack gap={5}>
        <Heading level={2}>The impact of your choices</Heading>
        <Grid columns={{ minWidth: 220 }} gap={4}>
          <Stat
            heading="Your commute emits"
            value={`${commute.co2KgWeek} kg CO2`}
            note={`each week, over ${commute.weeklyKm} km by ${commute.label.toLowerCase()}`}
          />
          <Stat
            heading="Exhaust fine particles"
            value={`${commute.pm25GWeek} g PM2.5`}
            note="each week, from the same trips"
          />
          {outdoor && (
            <Stat
              heading="Cleanest daytime hour"
              value={`${outdoor.reductionPercent}% cleaner`}
              note={`at ${formatHour(outdoor.best.time)} (AQI ${outdoor.best.aqi}) than at ${formatHour(outdoor.worst.time)} (AQI ${outdoor.worst.aqi})`}
            />
          )}
        </Grid>
        {commute.alternatives.length > 0 ? (
          <VStack gap={2}>
            <Heading level={3}>What switching would save</Heading>
            <List hasDividers aria-label="Emissions saved by switching how you travel">
              {commute.alternatives.map((a) => (
                <ListItem
                  key={a.mode}
                  label={<Text>{a.label}</Text>}
                  description={<Text type="supporting">{`Saves ${a.co2SavedKgWeek} kg CO2 a week, ${a.co2SavedKgYear} kg a year`}</Text>}
                  endContent={<Badge variant="success" label={`${a.co2SavedPercent}% less`} />}
                />
              ))}
            </List>
          </VStack>
        ) : (
          <Text>You already use one of the lowest-emission ways to travel.</Text>
        )}
        <Text type="supporting">
          Travel figures are estimates from typical per-kilometre emission factors, for comparing options.
        </Text>
      </VStack>
    </Card>
  );
}
