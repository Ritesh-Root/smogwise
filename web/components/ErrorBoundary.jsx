import { Banner } from '@astryxdesign/core/Banner';
import { Component } from 'react';

/**
 * Catches errors while rendering its children, such as a lazy chunk that failed to download, and shows
 * a message instead of a blank page. Changing `resetKey` (for example a new plan) tries again.
 */
export class ErrorBoundary extends Component {
  /** @param {{resetKey?: unknown, message: string, children: import('react').ReactNode}} props */
  constructor(props) {
    super(props);
    this.state = { failed: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  render() {
    return this.state.failed ? <Banner role="alert" status="error" title={this.props.message} /> : this.props.children;
  }
}
