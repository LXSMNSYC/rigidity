import { OnLoadArgs, Plugin } from 'esbuild';

interface PostCSSOptions {
  dev: boolean;
}

function createLazyCSS(id: string, content: string, json: Record<string, string>) {
  return `
import { renderStyle } from 'rigidity';
renderStyle(${JSON.stringify(id)}, ${JSON.stringify(content)});
export default ${JSON.stringify(json)};
`;
}

function createRawCSSModule(css: string, json: Record<string, string>) {
  return `
export const styles = ${JSON.stringify(json)};
export const sheet = ${JSON.stringify(css)};
`;
}

export default function postcssPlugin(options: PostCSSOptions): Plugin {
  return {
    name: 'esbuild:postcss',

    async setup(build) {
      const path = await import('path');
      const fs = await import('fs/promises');

      const postcss = await import('postcss');
      const postcssLoadConfig = await import('postcss-load-config');
      const postcssImport = await import('postcss-import');
      const postcssModules = await import('postcss-modules');

      const paths = new Map<string, string>();

      let ids = 0;

      function getStyleID(source: string) {
        const id = paths.get(source);
        if (id) {
          return id;
        }
        const newID = `style-${ids}`;
        ids += 1;
        paths.set(source, newID);
        return newID;
      }

      build.onResolve({ filter: /\.module.css\?raw$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss-modules-raw',
      }));
      build.onResolve({ filter: /\.module.css\?url$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss-modules-url',
      }));
      build.onResolve({ filter: /\.module.css$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss-modules',
      }));
      build.onResolve({ filter: /\.css\?raw$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss-raw',
      }));
      build.onResolve({ filter: /\.css\?url$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss-url',
      }));
      build.onResolve({ filter: /\.css$/ }, (args) => ({
        path: path.join(args.resolveDir, args.path),
        namespace: 'postcss',
      }));

      async function processPostCSS(args: OnLoadArgs): Promise<string> {
        const source = await fs.readFile(args.path, 'utf8');

        const config = await postcssLoadConfig.default({
          env: options.dev ? 'development' : 'production',
        });

        const processor = postcss.default(config.plugins);
        processor.use(postcssImport.default() as any);
        const result = await processor.process(source, {
          from: args.path,
          ...config.options,
        });
        return result.css;
      }

      build.onLoad({ filter: /.*/, namespace: 'postcss' }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: createLazyCSS(getStyleID(args.path), result, {}),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'postcss-raw' }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: result,
          loader: 'text',
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'postcss-url' }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: result,
          loader: 'file',
        };
      });

      async function processPostCSSModules(args: OnLoadArgs) {
        const source = await fs.readFile(args.path, 'utf8');

        const config = await postcssLoadConfig.default({
          env: options.dev ? 'development' : 'production',
        });

        const processor = postcss.default(config.plugins);
        let resultJSON: Record<string, string> = {};
        processor.use(postcssModules.default({
          getJSON(_filename, json) {
            resultJSON = json;
          },
        }));
        processor.use(postcssImport.default() as any);
        const result = await processor.process(source, {
          from: args.path,
          ...config.options,
        });

        return {
          css: result.css,
          json: resultJSON,
        };
      }

      build.onLoad({ filter: /.*/, namespace: 'postcss-modules' }, async (args) => {
        const { css, json } = await processPostCSSModules(args);

        return {
          contents: createLazyCSS(getStyleID(args.path), css, json),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'postcss-modules-raw' }, async (args) => {
        const { css, json } = await processPostCSSModules(args);

        return {
          contents: createRawCSSModule(css, json),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
    },
  };
}
