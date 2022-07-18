import {
  createComponent,
  renderToStream,
  renderToString,
  renderToStringAsync,
} from 'solid-js/web';
import { Readable } from 'stream';
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

async function renderCore<T>(
  globalOptions: GlobalRenderOptions,
  pageResult: RenderResult<T>,
): Promise<string | Readable | ReadableStream> {
  switch (globalOptions.ssrMode) {
    case 'async': {
      const documentResult = await renderToStringAsync(() => (
        createComponent(Root, {
          ...pageResult,
          document: globalOptions.root.Document,
        })
      ));

      return `<!DOCTYPE html>${documentResult}`;
    }
    case 'node-stream': {
      const stream = await import('stream');
      const writable = new stream.Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk, encoding);
          callback();
        },
      });
      writable.write('<!DOCTYPE html>');
      renderToStream(() => (
        createComponent(Root, {
          ...pageResult,
          document: globalOptions.root.Document,
        })
      )).pipe(writable);
      // pipeToNodeWritable(
      //   () => (
      //     createComponent(Root, {
      //       ...pageResult,
      //       document: globalOptions.document,
      //     })
      //   ),
      //   writable,
      //   {
      //     onReady({ write, startWriting }) {
      //       write('<!DOCTYPE html>');
      //       startWriting();
      //     },
      //   },
      // );
      return writable;
    }
    case 'web-stream': {
      const stream = new TransformStream();
      await stream.writable.getWriter().write('<!DOCTYPE html>');
      renderToStream(() => (
        createComponent(Root, {
          ...pageResult,
          document: globalOptions.root.Document,
        })
      )).pipeTo(stream.writable);
      // pipeToWritable(
      //   () => (
      //     createComponent(Root, {
      //       ...pageResult,
      //       document: globalOptions.document,
      //     })
      //   ),
      //   stream.writable,
      //   {
      //     onReady({ write, startWriting }) {
      //       write('<!DOCTYPE html>');
      //       startWriting();
      //     },
      //   },
      // );
      return stream.readable;
    }
    case 'sync':
    default: {
      const documentResult = renderToString(() => (
        createComponent(Root, {
          ...pageResult,
          document: globalOptions.root.Document,
        })
      ));

      return `<!DOCTYPE html>${documentResult}`;
    }
  }
}

export async function renderServerError(
  globalOptions: GlobalRenderOptions,
  renderOptions: ErrorProps,
): Promise<string | Readable | ReadableStream> {
  return renderCore(globalOptions, {
    assets: `${globalOptions.cdn ?? ''}/${globalOptions.assetsUrl}`,
    App: renderError(
      globalOptions,
      renderOptions,
    ),
    tags: [],
    data: {
      load: renderOptions,
    },
    isError: true,
  });
}

export async function renderServer<L, A = undefined>(
  globalOptions: GlobalRenderOptions,
  renderOptions: RenderAppOptions,
  loadData?: L,
  actionData?: A,
): Promise<string | Readable | ReadableStream> {
  return renderCore(globalOptions, {
    assets: `${globalOptions.cdn ?? ''}/${globalOptions.assetsUrl}`,
    App: renderApp(
      globalOptions,
      renderOptions,
      loadData,
      actionData,
    ),
    tags: [],
    data: {
      load: loadData,
      action: actionData,
    },
    isError: false,
  });
}
