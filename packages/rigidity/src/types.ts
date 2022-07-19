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

export type SSRMode = 'sync' | 'async' | 'node-stream' | 'web-stream';

export type ServerFunction = (request: Request) => Promise<Response>;

export interface AppProps {
  children: JSX.Element;
}

export type App = (props: AppProps) => JSX.Element;

export type WebVitalsMetric = Metric;

export interface ErrorProps {
  statusCode: number;
  error?: Error;
}

export type ErrorPage = Page<ErrorProps>;

export interface RenderResult<T> {
  assets: string;
  App: () => JSX.Element;
  tags: TagDescription[];
  data: T;
  isError: boolean;
}

export interface RigidityRoot {
  App?: App;
  Document?: () => JSX.Element;
  Error404?: ErrorPage;
  Error500?: ErrorPage;
  Error?: ErrorPage;
  reportWebVitals?: (metric: WebVitalsMetric) => void;
}

export interface GlobalRenderOptions {
  env?: 'production' | 'development';
  cdn?: string;
  assetsUrl: string;
  publicUrl: string;
  ssrMode: SSRMode;
  root: RigidityRoot;
  pages: PageRoute[];
}

export interface ServerRenderOptions extends GlobalRenderOptions {
  enableStaticFileServing: boolean;
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
  cdn?: string;
  public?: string;
  assets?: string;
  root?: string;
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
  env?: 'production' | 'development';
  adapter: Adapter<any>;
  ssrMode?: SSRMode;
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

export interface Adapter<T> {
  enableStaticFileServing: boolean;
  generateScript: (config: string) => string;
  create: (fn: ServerFunction) => T;
}
