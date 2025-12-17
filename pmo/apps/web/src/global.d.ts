/// <reference types="vite/client" />

// Re-export JSX namespace from React for backwards compatibility
// This allows using `JSX.Element` without `React.` prefix
import type { JSX } from 'react';
export { JSX };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Element extends React.ReactElement<
    unknown,
    string | React.JSXElementConstructor<unknown>
  > {}
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Element extends React.ReactElement<
      unknown,
      string | React.JSXElementConstructor<unknown>
    > {}
    interface ElementClass extends React.Component<unknown, unknown> {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty {
      props: object;
    }
    interface ElementChildrenAttribute {
      children: object;
    }
    type IntrinsicAttributes = React.Attributes;
    type IntrinsicClassAttributes<T> = React.ClassAttributes<T>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
