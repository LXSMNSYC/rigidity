import {
  createComponent,
  renderToStringAsync,
} from 'solid-js/web';
import {
  Root,
} from '../components/Document';
import {
  RenderResult,
  ErrorProps,
  GlobalRenderOptions,
} from '../types';
import renderApp, { RenderAppOptions } from './render-app';
import renderError from './render-error';

async function renderCore(
  globalOptions: GlobalRenderOptions,
  pageResult: RenderResult,
): Promise<string> {
  const documentResult = await renderToStringAsync(() => (
    createComponent(Root, {
      ...pageResult,
      document: globalOptions.document,
    })
  ));

  return `<!DOCTYPE html>${documentResult}`;
}

export async function renderServerError(
  globalOptions: GlobalRenderOptions,
  renderOptions: ErrorProps,
): Promise<string> {
  return renderCore(globalOptions, {
    App: renderError(
      globalOptions,
      renderOptions,
    ),
    tags: [],
    errorProps: renderOptions,
  });
}

export async function renderServer(
  globalOptions: GlobalRenderOptions,
  renderOptions: RenderAppOptions,
): Promise<string> {
  return renderCore(globalOptions, {
    App: renderApp(
      globalOptions,
      renderOptions,
    ),
    tags: [],
  });
}
