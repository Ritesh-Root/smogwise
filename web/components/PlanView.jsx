import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { stringsFor } from '../strings.js';

/** A secondary line under a list item. */
function Detail({ children }) {
  return <Text type="supporting">{children}</Text>;
}

function Section({ title, children }) {
  return (
    <VStack gap={2}>
      <Heading level={3}>{title}</Heading>
      <List hasDividers>{children}</List>
    </VStack>
  );
}

/**
 * The model's plan: alerts first, then routine, indoor air hacks and swaps, each with its impact.
 * The whole card is in the plan's language, so it carries that `lang`.
 * @param {{plan: import('../types.js').Plan, language: string}} props
 */
export function PlanView({ plan, language }) {
  const t = stringsFor(language);
  const impact = (text) => <Detail>{`${t.impact}: ${text}`}</Detail>;
  return (
    <Card padding={6}>
      <VStack gap={5} lang={language}>
        <Heading level={2}>{t.planTitle}</Heading>
        <Text>{plan.summary}</Text>
        {plan.alerts.map((alert, index) => (
          <Banner key={`${index}-${alert}`} role="alert" status="warning" title={alert} />
        ))}
        <Section title={t.routine}>
          {plan.routine.map((r, index) => (
            <ListItem
              key={`${index}-${r.time}`}
              label={<Text>{`${r.time}: ${r.action}`}</Text>}
              description={impact(r.impact)}
            />
          ))}
        </Section>
        <Section title={t.indoor}>
          {plan.indoor.map((i, index) => (
            <ListItem
              key={`${index}-${i.tip}`}
              label={<Text>{i.tip}</Text>}
              description={
                <VStack gap={1}>
                  {impact(i.impact)}
                  <Detail>{`${t.cost}: ${i.cost}`}</Detail>
                </VStack>
              }
            />
          ))}
        </Section>
        <Section title={t.swaps}>
          {plan.alternatives.map((a, index) => (
            <ListItem key={`${index}-${a.swap}`} label={<Text>{a.swap}</Text>} description={impact(a.impact)} />
          ))}
        </Section>
      </VStack>
    </Card>
  );
}
