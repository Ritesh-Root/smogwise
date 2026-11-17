import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Badge } from '@astryxdesign/core/Badge';

const impact = (text) => <Text type="supporting">{`Impact: ${text}`}</Text>;

function Section({ title, children }) {
  return (
    <VStack gap={2}>
      <Heading level={3}>{title}</Heading>
      <List hasDividers>{children}</List>
    </VStack>
  );
}

/** The model's plan: alerts first, then routine, indoor air hacks and swaps, each with its impact. */
export function PlanView({ plan, language }) {
  return (
    <Card padding={6}>
      <VStack gap={5} lang={language}>
        <Heading level={2}>Your plan for today</Heading>
        <Text>{plan.summary}</Text>
        {plan.alerts.map((alert) => (
          <Banner key={alert} status="warning" title={alert} />
        ))}
        <Section title="Daily routine">
          {plan.routine.map((r) => (
            <ListItem key={`${r.time}-${r.action}`} label={<Text>{`${r.time}: ${r.action}`}</Text>} description={impact(r.impact)} />
          ))}
        </Section>
        <Section title="Indoor air hacks">
          {plan.indoor.map((i) => (
            <ListItem
              key={i.tip}
              label={<Text>{i.tip}</Text>}
              description={impact(i.impact)}
              endContent={<Badge variant="neutral" label={i.cost} />}
            />
          ))}
        </Section>
        <Section title="Sustainable swaps">
          {plan.alternatives.map((a) => (
            <ListItem key={a.swap} label={<Text>{a.swap}</Text>} description={impact(a.impact)} />
          ))}
        </Section>
      </VStack>
    </Card>
  );
}
