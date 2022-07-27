import {
  BuildResult,
  OnLoadArgs,
  OnResolveArgs,
  OnResolveResult,
  Plugin,
} from 'esbuild';
import path from 'path';
import fs from 'fs/promises';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import PostcssModulesPlugin from 'postcss-modules';

export interface RecurseBuild {
  filename?: string;
  recurse?: boolean;
  content: string;
  sourceDirectory: string;
  outputDirectory: string;
}

interface PostCSSOptions {
  dev: boolean;
  artifactDirectory: string;
  recurseBuild: (opts: RecurseBuild) => Promise<BuildResult>
}

function createLazyCSS(id: string, content: string, json: Record<string, string>) {
  return `
import { renderStyle } from 'rigidity/render';
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

function createURLCSSModule(p: string, json: Record<string, string>) {
  return `
export const styles = ${JSON.stringify(json)};
export { default as source } from ${JSON.stringify(`${p}?url-only`)};
`;
}

export default function postcssPlugin(
  options: PostCSSOptions,
): Plugin {
  return {
    name: 'rigidity:postcss',

    setup(build) {
      const paths = new Map<string, string>();

      let styleIds = 0;

      function getStyleID(source: string) {
        const id = paths.get(source);
        if (id) {
          return id;
        }
        const newID = `style-${styleIds}`;
        styleIds += 1;
        paths.set(source, newID);
        return newID;
      }

      function pickCSSinJS(kind: OnResolveArgs['kind'], args: OnResolveResult): OnResolveResult {
        if (kind === 'import-rule' || kind === 'entry-point') {
          return {
            path: args.path,
            namespace: 'postcss-vanilla',
          };
        }
        return args;
      }

      build.onResolve({
        filter: /\.module\.css\?url-only$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 9)),
          namespace: 'postcss-modules-url-only',
        })
      ));
      build.onResolve({
        filter: /\.module\.css\?url$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 4)),
          namespace: 'postcss-modules-url',
        })
      ));
      build.onResolve({
        filter: /\.module\.css\?raw$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 4)),
          namespace: 'postcss-modules-raw',
        })
      ));
      build.onResolve({
        filter: /\.module\.css$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 4)),
          namespace: 'postcss-modules',
        })
      ));
      build.onResolve({
        filter: /\.css\?raw$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 4)),
          namespace: 'postcss-raw',
        })
      ));
      build.onResolve({
        filter: /\.css\?url$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path.substring(0, args.path.length - 4)),
          namespace: 'postcss-url',
        })
      ));
      build.onResolve({
        filter: /\.css$/,
      }, (args) => (
        pickCSSinJS(args.kind, {
          path: path.join(args.resolveDir, args.path),
          namespace: 'postcss',
        })
      ));

      async function processPostCSS(args: OnLoadArgs): Promise<string> {
        const source = await fs.readFile(args.path, 'utf8');

        const config = await postcssrc({
          env: options.dev ? 'development' : 'production',
        });

        const processor = postcss(config.plugins);
        const result = await processor.process(source, {
          ...config.options,
          from: args.path,
        });
        const artifact = path.join(
          options.artifactDirectory,
          'stdin.css',
        );
        await options.recurseBuild({
          recurse: true,
          content: result.css,
          filename: path.basename(args.path),
          sourceDirectory: path.dirname(args.path),
          outputDirectory: options.artifactDirectory,
        });
        return fs.readFile(artifact, 'utf8');
      }

      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-vanilla',
      }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: result,
          resolveDir: path.dirname(args.path),
          loader: 'css',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss',
      }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: createLazyCSS(getStyleID(args.path), result, {}),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-raw',
      }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: result,
          loader: 'text',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-url',
      }, async (args) => {
        const result = await processPostCSS(args);
        return {
          contents: result,
          loader: 'file',
        };
      });

      async function processPostCSSModules(args: OnLoadArgs) {
        const source = await fs.readFile(args.path, 'utf8');

        const config = await postcssrc({
          env: options.dev ? 'development' : 'production',
        });

        const processor = postcss(config.plugins);
        let resultJSON: Record<string, string> = {};
        processor.use(PostcssModulesPlugin({
          getJSON(_filename, json) {
            resultJSON = json;
          },
        }));
        const result = await processor.process(source, {
          ...config.options,
          from: args.path,
        });
        const artifact = path.join(
          options.artifactDirectory,
          'stdin.css',
        );
        await options.recurseBuild({
          recurse: true,
          content: result.css,
          filename: path.basename(args.path),
          sourceDirectory: path.dirname(args.path),
          outputDirectory: options.artifactDirectory,
        });
        return {
          css: await fs.readFile(artifact, 'utf8'),
          json: resultJSON,
        };
      }

      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-modules',
      }, async (args) => {
        const { css, json } = await processPostCSSModules(args);

        return {
          contents: createLazyCSS(getStyleID(args.path), css, json),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-modules-raw',
      }, async (args) => {
        const { css, json } = await processPostCSSModules(args);

        return {
          contents: createRawCSSModule(css, json),
          resolveDir: path.dirname(args.path),
          loader: 'js',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-modules-url',
      }, async (args) => {
        const { json } = await processPostCSSModules(args);

        const { dir, base } = path.parse(args.path);

        return {
          contents: createURLCSSModule(`./${base}`, json),
          resolveDir: dir,
          loader: 'js',
        };
      });
      build.onLoad({
        filter: /.*/,
        namespace: 'postcss-modules-url-only',
      }, async (args) => {
        const { css } = await processPostCSSModules(args);

        return {
          contents: css,
          loader: 'file',
        };
      });
    },
  };
}
