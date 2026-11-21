import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../components/Chat.jsx';
import { HINDI_REQUEST, PLAN_REQUEST, stubFetch } from './fixtures.js';
import { renderWithTheme } from './render.jsx';

function setup(routes, request = PLAN_REQUEST) {
  const fetchStub = stubFetch(routes);
  vi.stubGlobal('fetch', fetchStub.impl);
  const user = userEvent.setup();
  renderWithTheme(<Chat planRequest={request} />);
  return { user, calls: fetchStub.calls };
}
const SUGGESTION = 'Which mask should we use?';
const chatCalls = (calls) => calls.filter((call) => call.url.includes('api/chat'));

describe('follow-up chat', () => {
  it('sends a suggested question with the household context and shows the answer as Markdown', async () => {
    const { user, calls } = setup([['api/chat', 200, { answer: 'Wear an **N95** mask.' }]]);
    await user.click(screen.getByRole('button', { name: SUGGESTION }));
    expect(await screen.findByText('N95')).toBeInTheDocument();
    expect(chatCalls(calls)[0].body).toMatchObject({ question: SUGGESTION, history: [], lat: 28.65 });
    expect(chatCalls(calls)[0].body.profile.cookingFuel).toBe('lpg');
  });

  it('keeps the suggestions in place so keyboard focus is not lost', async () => {
    const { user } = setup([['api/chat', 200, { answer: 'Ok.' }]]);
    await user.click(screen.getByRole('button', { name: SUGGESTION }));
    await screen.findByText('Ok.');
    expect(screen.getByRole('button', { name: SUGGESTION })).toBeInTheDocument();
  });

  it('sends earlier turns as history on the next question', async () => {
    const { user, calls } = setup([['api/chat', 200, { answer: 'First answer.' }]]);
    await user.click(screen.getByRole('button', { name: SUGGESTION }));
    await screen.findByText('First answer.');
    await user.click(screen.getByRole('button', { name: 'Windows open while cooking?' }));
    await waitFor(() => expect(chatCalls(calls)).toHaveLength(2));
    expect(chatCalls(calls)[1].body.history).toEqual([
      { role: 'user', text: SUGGESTION },
      { role: 'model', text: 'First answer.' },
    ]);
  });

  it('announces a failed answer, takes the unanswered question back out, and keeps it for a retry', async () => {
    const { user } = setup([['api/chat', 502, { error: 'The assistant could not answer that.' }]]);
    await user.click(screen.getByRole('button', { name: SUGGESTION }));
    await waitFor(() => {
      expect(
        screen
          .getAllByRole('alert')
          .map((node) => node.textContent)
          .join(' '),
      ).toContain('The assistant could not answer that.');
    });
    expect(screen.queryByText('You')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveTextContent(SUGGESTION);
  });

  it('marks Hindi answers with their language', async () => {
    const { user } = setup([['api/chat', 200, { answer: 'दोपहर में टहलें।' }]], HINDI_REQUEST);
    await user.click(screen.getByRole('button', { name: SUGGESTION }));
    const answer = await screen.findByText('दोपहर में टहलें।');
    expect(answer.closest('[lang="hi"]')).not.toBeNull();
  });
});
