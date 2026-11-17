import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { ChatComposer, ChatMessage, ChatMessageBubble, ChatMessageList } from '@astryxdesign/core/Chat';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useRef, useState } from 'react';
import { askQuestion } from '../api.js';
import { DISCLAIMER, LIMITS, SUGGESTED_QUESTIONS } from '../constants.js';

const SENDERS = {
  user: { sender: 'user', name: 'You' },
  model: { sender: 'assistant', name: 'SmogWise' },
};

/**
 * Follow-up questions answered from the same live air data and household profile as the plan.
 * A question that fails is taken back out of the conversation and put back in the box so it can be retried.
 * @param {{planRequest: import('../types.js').PlanRequest}} props
 */
export function Chat({ planRequest }) {
  const language = planRequest.profile.language;
  /** @type {[Array<{id: number, role: 'user' | 'model', text: string}>, Function]} */
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const nextId = useRef(0);

  /** @param {string} text */
  async function ask(text) {
    const question = text.trim();
    if (question.length < LIMITS.questionMin || isAsking) return;
    setError('');
    setDraft('');
    setIsAsking(true);
    const history = turns.map(({ role, text: turnText }) => ({ role, text: turnText }));
    const asked = { id: nextId.current++, role: 'user', text: question };
    setTurns((previous) => [...previous, asked]);
    try {
      const { answer } = await askQuestion(planRequest, question, history);
      setTurns((previous) => [...previous, { id: nextId.current++, role: 'model', text: answer }]);
    } catch (failure) {
      setTurns((previous) => previous.filter((turn) => turn.id !== asked.id));
      setDraft(question);
      setError(failure.message);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <Heading level={2}>Ask a follow-up</Heading>
        <HStack gap={2} wrap="wrap">
          {SUGGESTED_QUESTIONS.map((question) => (
            <Button key={question} label={question} variant="secondary" size="sm" onClick={() => ask(question)} />
          ))}
        </HStack>
        <ChatMessageList isStreaming={isAsking} aria-label="Conversation with SmogWise">
          {turns.map((turn) => (
            <ChatMessage key={turn.id} {...SENDERS[turn.role]}>
              <ChatMessageBubble>
                {turn.role === 'user' ? (
                  <Text>{turn.text}</Text>
                ) : (
                  <VStack lang={language}>
                    <Markdown headingLevelStart={3}>{turn.text}</Markdown>
                  </VStack>
                )}
              </ChatMessageBubble>
            </ChatMessage>
          ))}
          {isAsking && (
            <ChatMessage {...SENDERS.model}>
              <ChatMessageBubble>
                <Spinner size="sm" label="Checking the air data..." />
              </ChatMessageBubble>
            </ChatMessage>
          )}
        </ChatMessageList>
        {error && <Banner role="alert" status="error" title={error} />}
        <ChatComposer
          value={draft}
          onChange={setDraft}
          onSubmit={ask}
          isDisabled={isAsking}
          placeholder="e.g. Is it safe for my son to play cricket at 5 pm?"
        />
        <Text type="supporting">{DISCLAIMER}</Text>
      </VStack>
    </Card>
  );
}
