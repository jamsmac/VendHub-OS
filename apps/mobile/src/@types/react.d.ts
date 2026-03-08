/* eslint-disable @typescript-eslint/no-explicit-any -- must match React's generic signature */
// Override @types/react to fix JSX component type errors in React Native
// This is needed because the root monorepo has a different @types/react version

import "react";

declare module "react" {
  // Allow React Native components to be used as JSX elements

  interface ReactElement<
    _P = any,
    _T extends string | JSXElementConstructor<any> =
      | string
      | JSXElementConstructor<any>,
  > {
    children?: ReactNode;
  }
}
