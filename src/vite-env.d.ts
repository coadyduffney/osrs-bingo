/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.tsx' {
  import { FC } from 'react';
  const component: FC<any>;
  export default component;
}
