import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { renderWithTheme } from './render.jsx';

function Boom({ explode }) {
  if (explode) throw new Error('render failed');
  return <p>all good</p>;
}

describe('ErrorBoundary', () => {
  it('shows a message as an alert instead of a blank page when a child fails to render', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithTheme(
      <ErrorBoundary message="Something went wrong.">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('renders its children when nothing fails', () => {
    renderWithTheme(
      <ErrorBoundary message="x">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('tries again when the reset key changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const tree = (key, explode) => (
      <ErrorBoundary resetKey={key} message="Something went wrong.">
        <Boom explode={explode} />
      </ErrorBoundary>
    );
    const { rerender } = renderWithTheme(tree(1, true));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(tree(2, false));
    expect(screen.getByText('all good')).toBeInTheDocument();
    expect(render).toBeDefined();
  });
});
