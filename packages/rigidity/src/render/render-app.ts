import {
  createComponent,
  ErrorBoundary,
  JSX,
  Suspense,
  useContext,
} from 'solid-js';
import DefaultApp from '../components/App';
import {
  DocumentContext,
} from '../components/Document';
import StatusCode from '../errors/StatusCode';
import {
  MetaProvider,
} from '../meta';
import {
  Router,
} from '../router';
import {
  DataProvider,
} from '../router/components/Data';
import {
  PageTree,
} from '../router/core/create-page-tree';
import {
  GlobalRenderOptions,
} from '../types';
import {
  getErrorPage,
} from './error-page';

export interface RenderAppOptions {
  pathname: string;
  search: string;
  routes: PageTree;
}

export default function renderApp<T>(
  global: GlobalRenderOptions,
  options: RenderAppOptions,
  response?: T,
): () => JSX.Element {
  const CustomAppPage = global.app ?? DefaultApp;
  const Custom500Page = getErrorPage(500, global);
  const CustomNotFound = getErrorPage(404, global);

  return () => {
    const context = useContext(DocumentContext);
    return (
      createComponent(DataProvider, {
        data: response,
        get children() {
          return createComponent(Suspense, {
            get children() {
              return (
                createComponent(MetaProvider, {
                  tags: context?.tags ?? [],
                  get children() {
                    return (
                      createComponent(ErrorBoundary, {
                        fallback: (err) => (
                          createComponent(Custom500Page, {
                            data: {
                              error: err,
                              statusCode: 500,
                            },
                            params: {},
                          })
                        ),
                        get children() {
                          return (
                            createComponent(CustomAppPage, {
                              get children() {
                                return (
                                  createComponent(Router, {
                                    location: {
                                      pathname: options.pathname,
                                      search: options.search,
                                    },
                                    get fallback() {
                                      return (
                                        createComponent(CustomNotFound, {
                                          data: {
                                            statusCode: 404,
                                            error: new StatusCode(404),
                                          },
                                          params: {},
                                        })
                                      );
                                    },
                                    routes: options.routes,
                                  })
                                );
                              },
                            })
                          );
                        },
                      })
                    );
                  },
                })
              );
            },
          });
        },
      })
    );
  };
}
