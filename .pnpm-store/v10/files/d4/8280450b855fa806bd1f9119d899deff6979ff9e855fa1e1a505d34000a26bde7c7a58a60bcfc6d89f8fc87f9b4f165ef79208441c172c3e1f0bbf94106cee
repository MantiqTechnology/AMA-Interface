import { reactive, h as h$1, Suspense, nextTick, getCurrentInstance, onErrorCaptured, effectScope } from 'vue';
import { defineComponent, h, tryUseNuxtApp, useRouter } from '#imports';
import NuxtRoot from '#build/root-component.mjs';
import { useLink } from 'vue-router';

const RouterLink = defineComponent({
  functional: true,
  props: {
    to: {
      type: [String, Object],
      required: true
    },
    custom: Boolean,
    replace: Boolean,
    // Not implemented
    activeClass: String,
    exactActiveClass: String,
    ariaCurrentValue: String
  },
  setup: (props, { slots }) => {
    const link = useLink(props);
    return () => {
      const route = link.route.value;
      const href = link.href.value;
      const isActive = link.isActive.value;
      const isExactActive = link.isExactActive.value;
      return props.custom ? slots.default?.({ href, navigate: link.navigate, route, isActive, isExactActive }) : h(
        "a",
        {
          href,
          onClick: (e) => {
            e.preventDefault();
            return link.navigate(e);
          }
        },
        slots
      );
    };
  }
});

function cleanupAll() {
  for (const fn of (window.__cleanup || []).splice(0)) {
    fn();
  }
}
function addCleanup(fn) {
  window.__cleanup ||= [];
  window.__cleanup.push(fn);
}
function runEffectScope(fn) {
  const scope = effectScope();
  addCleanup(() => scope.stop());
  return scope.run(fn);
}
function wrapperSuspended(component, options, {
  wrapperFn,
  wrappedRender = (fn) => fn,
  suspendedHelperName,
  clonedComponentName
}) {
  const { props = {}, attrs = {} } = options;
  const { route = "/", scoped = false, ...wrapperFnOptions } = options;
  const vueApp = tryUseNuxtApp()?.vueApp || globalThis.__unctx__.get("nuxt-app").tryUse().vueApp;
  const {
    render: componentRender,
    setup: componentSetup,
    ...componentRest
  } = component;
  let wrappedInstance = null;
  let setupContext;
  let setupState;
  const setProps = reactive({});
  function patchInstanceAppContext() {
    const app = getCurrentInstance()?.appContext.app;
    if (!app) return;
    for (const [key, value] of Object.entries(vueApp)) {
      if (key in app) continue;
      app[key] = value;
    }
  }
  const ClonedComponent = {
    components: {},
    ...component,
    name: clonedComponentName,
    async setup(props2, instanceContext) {
      const currentInstance = getCurrentInstance();
      if (currentInstance) {
        currentInstance.emit = (event, ...args) => {
          setupContext.emit(event, ...args);
        };
      }
      if (!componentSetup) return;
      const result = scoped ? await runEffectScope(() => componentSetup(props2, setupContext)) : await componentSetup(props2, setupContext);
      if (wrappedInstance?.exposed) {
        instanceContext.expose(wrappedInstance.exposed);
      }
      setupState = result && typeof result === "object" ? result : {};
      return result;
    }
  };
  const SuspendedHelper = {
    name: suspendedHelperName,
    render: () => "",
    async setup() {
      if (route) {
        const router = useRouter();
        await router.replace(route);
      }
      return () => h$1(ClonedComponent, { ...props, ...setProps, ...attrs }, setupContext.slots);
    }
  };
  return new Promise((resolve, reject) => {
    let isMountSettled = false;
    const wrapper = wrapperFn(
      {
        inheritAttrs: false,
        __cssModules: componentRest.__cssModules,
        setup: (props2, ctx) => {
          patchInstanceAppContext();
          wrappedInstance = getCurrentInstance();
          setupContext = ctx;
          const nuxtRootSetupResult = runEffectScope(
            () => NuxtRoot.setup(props2, {
              ...ctx,
              expose: () => {
              }
            })
          );
          onErrorCaptured((error, ...args) => {
            if (isMountSettled) return;
            isMountSettled = true;
            try {
              wrappedInstance?.appContext.config.errorHandler?.(error, ...args);
              reject(error);
            } catch (error2) {
              reject(error2);
            }
            return false;
          });
          return nuxtRootSetupResult;
        },
        render: wrappedRender(() => h$1(
          Suspense,
          {
            onResolve: () => nextTick().then(() => {
              if (isMountSettled) return;
              isMountSettled = true;
              wrapper.setupState = setupState;
              resolve({
                wrapper,
                setProps: (props2) => {
                  Object.assign(setProps, props2);
                }
              });
            })
          },
          {
            default: () => h$1(SuspendedHelper)
          }
        ))
      },
      {
        ...wrapperFnOptions,
        global: mergeComponentMountingGlobalOptions(wrapperFnOptions.global, {
          config: {
            globalProperties: makeAllPropertiesEnumerable(
              vueApp.config.globalProperties
            )
          },
          directives: vueApp._context.directives,
          provide: vueApp._context.provides,
          stubs: {
            Suspense: false,
            [SuspendedHelper.name]: false,
            [ClonedComponent.name]: false
          },
          components: { ...vueApp._context.components, RouterLink }
        })
      }
    );
  });
}
function mergeComponentMountingGlobalOptions(options = {}, defaults = {}) {
  const compilerOptions = {
    ...defaults.config?.compilerOptions,
    ...options.config?.compilerOptions
  };
  return {
    ...options,
    mixins: [...defaults.mixins || [], ...options.mixins || []],
    stubs: {
      ...defaults.stubs,
      ...Array.isArray(options.stubs) ? Object.fromEntries(options.stubs.map((n) => [n, true])) : options.stubs
    },
    plugins: [...defaults.plugins || [], ...options.plugins || []],
    components: { ...defaults.components, ...options.components },
    provide: { ...defaults.provide, ...options.provide },
    mocks: { ...defaults.mocks, ...options.mocks },
    config: {
      ...defaults.config,
      ...options.config,
      ...Object.keys(compilerOptions).length ? { compilerOptions } : void 0,
      globalProperties: {
        ...defaults.config?.globalProperties,
        ...options.config?.globalProperties
      }
    },
    directives: { ...defaults.directives, ...options.directives }
  };
}
function makeAllPropertiesEnumerable(target) {
  return {
    ...target,
    ...Object.fromEntries(
      Object.getOwnPropertyNames(target).map((key) => [key, target[key]])
    )
  };
}

export { cleanupAll, wrapperSuspended };
