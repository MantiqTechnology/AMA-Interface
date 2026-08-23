import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';

function getEndpointRegistry() {
  const app = window.__app ?? {};
  return app._registeredEndpointRegistry ||= {};
}
function findEndpointRegistryHandlers(url) {
  const endpointRegistry = getEndpointRegistry();
  const pathname = url.replace(/[?#].*$/, "");
  for (const [key, handlers] of Object.entries(endpointRegistry)) {
    if (key === url || key === pathname) {
      if (handlers?.length) {
        return handlers;
      }
    }
  }
}
function registerEndpoint(url, options) {
  const app = window.__app;
  if (!app) {
    throw new Error("registerEndpoint() can only be used in a `@nuxt/test-utils` runtime environment");
  }
  const config = typeof options === "function" ? { url, handler: options, method: void 0, once: false } : { ...options, url };
  config.handler = Object.assign(config.handler, { __is_handler__: true });
  const endpointRegistry = getEndpointRegistry();
  endpointRegistry[url] ||= [];
  endpointRegistry[url].push(config);
  window.__registry.add(url);
  app._registered ||= registerGlobalHandler(app);
  return () => {
    endpointRegistry[url]?.splice(endpointRegistry[url].indexOf(config), 1);
    if (endpointRegistry[url]?.length === 0) {
      window.__registry.delete(url);
    }
  };
}
function mockNuxtImport(_target, _factory) {
  throw new Error(
    "mockNuxtImport() is a macro and it did not get transpiled. This may be an internal bug of @nuxt/test-utils."
  );
}
function mockComponent(_path, _component) {
  throw new Error(
    "mockComponent() is a macro and it did not get transpiled. This may be an internal bug of @nuxt/test-utils."
  );
}
const handler = Object.assign(async (event) => {
  const url = "url" in event && event.url ? (event.url.pathname + event.url.search).replace(/^\/_/, "") : event.path.replace(/^\/_/, "");
  const registeredHandlers = findEndpointRegistryHandlers(url);
  const latestHandler = [...registeredHandlers || []].reverse().find((config) => config.method ? event.method === config.method : true);
  if (!latestHandler) return;
  const result = await latestHandler.handler(event);
  if (!latestHandler.once) return result;
  const index = registeredHandlers?.indexOf(latestHandler);
  if (index === void 0 || index === -1) return result;
  registeredHandlers?.splice(index, 1);
  if (registeredHandlers?.length === 0) {
    window.__registry.delete(latestHandler.url);
  }
  return result;
}, { __is_handler__: true });
function registerGlobalHandler(app) {
  app.use(handler, {
    match: (...args) => {
      const [eventOrPath, _event = eventOrPath] = args;
      const url = typeof eventOrPath === "string" ? eventOrPath.replace(/^\/_/, "") : (eventOrPath.url.pathname + eventOrPath.url.search).replace(/^\/_/, "");
      const event = _event;
      const registeredHandlers = findEndpointRegistryHandlers(url);
      return registeredHandlers?.some((config) => config.method ? event?.method === config.method : true) ?? false;
    }
  });
  return true;
}

async function mountSuspended(component, options = {}) {
  const { cleanupAll, wrapperSuspended } = await import('../chunks/suspended.mjs');
  const suspendedHelperName = "MountSuspendedHelper";
  const clonedComponentName = "MountSuspendedComponent";
  cleanupAll();
  const { wrapper, setProps } = await wrapperSuspended(component, options, {
    wrapperFn: mount,
    suspendedHelperName,
    clonedComponentName
  });
  Object.assign(wrapper, { __setProps: setProps });
  const clonedComponent = wrapper.findComponent({ name: clonedComponentName });
  return wrappedMountedWrapper(wrapper, clonedComponent);
}
function wrappedMountedWrapper(wrapper, component) {
  const wrapperProps = [
    "setProps",
    "emitted",
    "setupState",
    "unmount"
  ];
  return new Proxy(wrapper, {
    get: (_, prop, receiver) => {
      if (prop === "getCurrentComponent") return getCurrentComponentPatchedProxy;
      const target = wrapperProps.includes(prop) ? wrapper : Reflect.has(component, prop) ? component : wrapper;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  function getCurrentComponentPatchedProxy() {
    const currentComponent = component.getCurrentComponent();
    return new Proxy(currentComponent, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (prop === "proxy" && value) {
          return new Proxy(value, {
            get(o, p, r) {
              if (!Reflect.has(currentComponent.props, p)) {
                const setupState = wrapper.setupState;
                if (setupState && typeof setupState === "object") {
                  if (Reflect.has(setupState, p)) {
                    return Reflect.get(setupState, p, r);
                  }
                }
              }
              return Reflect.get(o, p, r);
            }
          });
        }
        return value;
      }
    });
  }
}

async function renderSuspended(component, options = {}) {
  const { cleanupAll, wrapperSuspended } = await import('../chunks/suspended.mjs');
  const wrapperId = "test-wrapper";
  const suspendedHelperName = "RenderHelper";
  const clonedComponentName = "RenderSuspendedComponent";
  const { render: wrapperFn } = await import('@testing-library/vue');
  cleanupAll();
  document.getElementById(wrapperId)?.remove();
  const { wrapper, setProps } = await wrapperSuspended(component, options, {
    wrapperFn,
    wrappedRender: (render) => () => h({
      inheritAttrs: false,
      render: () => h("div", { id: wrapperId }, render())
    }),
    suspendedHelperName,
    clonedComponentName
  });
  wrapper.rerender = async (props) => {
    setProps(props);
    await nextTick();
  };
  return wrapper;
}

export { mockComponent, mockNuxtImport, mountSuspended, registerEndpoint, renderSuspended };
