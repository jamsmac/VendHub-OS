// Override @types/react to fix JSX component type errors in React Native
// This is needed because the root monorepo has a different @types/react version

import 'react';

declare module 'react' {
  // Allow React Native components to be used as JSX elements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    children?: ReactNode;
  }
}
