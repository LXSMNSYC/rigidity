import * as esbuild from 'esbuild';
import * as babel from '@babel/core';
import {
  JSX,
} from 'solid-js';
import {
  Metric,
} from 'web-vitals';
import {
  Page,
  PageRoute,
} from './router/core/create-page-tree';
import {
  APIRoute,
} from './router/core/create-api-tree';

export type ServerFunction = (request: Request) => Promise<Response>;

export interface AppProps {
  Component: () => JSX.Element;
}

export type App = (props: AppProps) => JSX.Element;

export type WebVitalsMetric = Metric;

export interface AppPage extends App {
  reportWebVitals?: (metric: WebVitalsMetric) => void;
}

export interface ErrorProps {
  statusCode: number;
  error?: Error;
}

export type ErrorPage = Page<ErrorProps>;

export interface RenderResult<T> {
  App: () => JSX.Element;
  tags: TagDescription[];
  data: T;
}

export interface GlobalRenderOptions {
  app?: AppPage;
  document?: () => JSX.Element;
  error404?: ErrorPage;
  error500?: ErrorPage;
  error?: ErrorPage;
  pages: PageRoute[];
}

export interface ServerRenderOptions extends GlobalRenderOptions {
  version: string;
  buildDir: string;
  publicDir: string;
  apiDir: string;
  endpoints: APIRoute[];
}

export interface DirectoryOptions {
  api?: string;
  pages?: string;
  build?: string;
  public?: string;
}

export interface PathOptions {
  api?: string;
  public?: string;
}

export interface BuildContext {
  isServer: boolean;
  isDev: boolean;
}

export interface BabelBuildOptions {
  presets: babel.PluginItem[] | ((context: BuildContext) => babel.PluginItem[]);
  plugins: babel.PluginItem[] | ((context: BuildContext) => babel.PluginItem[]);
}

export interface BuildOptions {
  paths?: PathOptions;
  directories?: DirectoryOptions;
  esbuild?: esbuild.BuildOptions | ((context: BuildContext) => esbuild.BuildOptions);
  babel?: BabelBuildOptions;
}

export type BundleType = 'server' | 'client';

export interface TagDescription {
  tag: string;
  props: Record<string, unknown>;
}
