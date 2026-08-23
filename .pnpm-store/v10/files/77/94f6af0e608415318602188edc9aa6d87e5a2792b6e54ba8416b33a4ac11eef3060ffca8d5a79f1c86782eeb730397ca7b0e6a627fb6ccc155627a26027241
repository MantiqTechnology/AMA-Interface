import { mergeProps as _mergeProps, createVNode as _createVNode } from "vue";
// Components
import { makeVSelectionControlProps, VSelectionControl } from "../VSelectionControl/VSelectionControl.js"; // Composables
import { useProxiedModel } from "../../composables/proxiedModel.js"; // Utilities
import { genericComponent, omit, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVCheckboxBtnProps = propsFactory({
  ...makeVSelectionControlProps({
    falseIcon: '$checkboxOff',
    trueIcon: '$checkboxOn',
    indeterminateIcon: '$checkboxIndeterminate'
  })
}, 'VCheckboxBtn');
export const VCheckboxBtn = genericComponent()({
  name: 'VCheckboxBtn',
  props: makeVCheckboxBtnProps(),
  emits: {
    'update:modelValue': value => true,
    'update:indeterminate': value => true
  },
  setup(props, {
    slots
  }) {
    const indeterminate = useProxiedModel(props, 'indeterminate');
    const model = useProxiedModel(props, 'modelValue');
    function onChange(v) {
      if (indeterminate.value) {
        indeterminate.value = false;
      }
    }
    useRender(() => {
      const controlProps = omit(VSelectionControl.filterProps(props), ['modelValue']);
      return _createVNode(VSelectionControl, _mergeProps(controlProps, {
        "modelValue": model.value,
        "onUpdate:modelValue": [$event => model.value = $event, onChange],
        "class": ['v-checkbox-btn', props.class],
        "style": props.style,
        "type": "checkbox",
        "aria-checked": indeterminate.value ? 'mixed' : undefined
      }), slots);
    });
    return {};
  }
});
//# sourceMappingURL=VCheckboxBtn.js.map