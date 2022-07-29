import { createComponent, JSX, mergeProps } from 'solid-js';
import { render, hydrate } from 'solid-js/web';
import { MetaProvider } from 'rigidity-meta';
import { getRoot, getFragment } from './nodes';
import processScript from './process-script';

type Island<P> = (
  id: string,
  props: P,
  strategy: Strategy | undefined,
  hydratable: boolean,
  hasChildren: boolean,
) => Promise<void>;
type IslandComp<P> = (props: P & { children?: JSX.Element }) => JSX.Element;

export type Strategy =
  | ['visible']
  | ['load']
  | ['idle']
  | ['animation-frame']
  | ['media', string]
  | ['delay', number]
  | ['interaction', string[] | boolean]
  | ['ready-state', DocumentReadyState];

export type IslandComponent<P> = P & {
  'client:load'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
  'client:only'?: boolean;
  'client:idle'?: boolean;
  'client:animation-frame'?: boolean;
  'client:delay'?: number;
  'client:interaction'?: string[] | boolean;
  'client:ready-state'?: DocumentReadyState;
};

export default function createIsland<P>(
  source: () => Promise<{ default: IslandComp<P> }>,
): Island<P> {
  return async (id, props, strategy, hydratable, hasChildren) => {
    const marker = getRoot(id);
    const renderCallback = async () => {
      const Comp = (await source()).default;
      const root = () => createComponent(MetaProvider, {
        get children() {
          if (hasChildren) {
            const fragment = getFragment(id);
            return (
              createComponent(Comp, mergeProps(props, {
                get children() {
                  const node = (fragment as HTMLTemplateElement).content.firstChild!;
                  processScript(node);
                  return node;
                },
              }) as P & { children?: JSX.Element })
            );
          }
          return createComponent(Comp, props);
        },
      });
      if (hydratable) {
        hydrate(root, marker, {
          renderId: id,
        });
      } else {
        render(root, marker);
      }
    };

    if (strategy) {
      switch (strategy[0]) {
        case 'media':
          (await import('rigidity-scheduler/media')).default(id, strategy[1], renderCallback);
          break;
        case 'load':
          (await import('rigidity-scheduler/load')).default(id, renderCallback);
          break;
        case 'visible':
          (await import('rigidity-scheduler/visible')).default(id, marker, renderCallback);
          break;
        case 'idle':
          (await import('rigidity-scheduler/idle')).default(id, renderCallback);
          break;
        case 'animation-frame':
          (await import('rigidity-scheduler/animation-frame')).default(id, renderCallback);
          break;
        case 'delay':
          (await import('rigidity-scheduler/delay')).default(id, strategy[1], renderCallback);
          break;
        case 'interaction':
          (await import('rigidity-scheduler/interaction')).default(id, strategy[1], marker, renderCallback);
          break;
        case 'ready-state':
          (await import('rigidity-scheduler/ready-state')).default(id, strategy[1], renderCallback);
          break;
        default:
          await renderCallback();
          break;
      }
    } else {
      await renderCallback();
    }
  };
}
