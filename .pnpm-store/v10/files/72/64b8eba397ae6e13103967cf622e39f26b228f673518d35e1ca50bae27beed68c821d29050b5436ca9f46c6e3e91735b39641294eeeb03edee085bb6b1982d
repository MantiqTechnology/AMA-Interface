import { Fragment as _Fragment, createElementVNode as _createElementVNode, createVNode as _createVNode, mergeProps as _mergeProps } from "vue";
// Components
import { VFileUploadKey } from "./VFileUploadDropzone.js";
import { VFileUploadItem } from "./VFileUploadItem.js";
import { VDefaultsProvider } from "../VDefaultsProvider/VDefaultsProvider.js";
import { makeVListProps, VList } from "../VList/VList.js"; // Utilities
import { inject } from 'vue';
import { getFileKey } from "./fileKey.js";
import { genericComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVFileUploadListProps = propsFactory({
  clearable: Boolean,
  showSize: Boolean,
  files: Array,
  ...makeVListProps({
    border: false,
    elevation: 0,
    lines: false
  })
}, 'VFileUploadList');
export const VFileUploadList = genericComponent()({
  name: 'VFileUploadList',
  props: makeVFileUploadListProps(),
  setup(props, {
    slots
  }) {
    const context = inject(VFileUploadKey, null);
    useRender(() => {
      const files = props.files ?? context?.files.value ?? [];
      const disabled = context?.disabled.value ?? props.disabled;
      const readonly = context?.readonly.value ?? false;
      const listProps = VList.filterProps(props);
      if (!slots.default && !files.length) return _createElementVNode(_Fragment, null, null);
      return _createVNode(VList, _mergeProps(listProps, {
        "disabled": disabled,
        "class": ['v-file-upload-list', props.class],
        "style": props.style,
        "bgColor": "transparent"
      }), {
        default: () => [slots.default?.({
          files,
          onClickRemove: i => context?.onClickRemove(i)
        }) ?? files.map((file, index) => {
          const key = getFileKey(file);
          const slotProps = {
            file,
            props: {
              'onClick:remove': () => context?.onClickRemove(index)
            }
          };
          return _createVNode(VDefaultsProvider, {
            "key": key,
            "defaults": {
              VFileUploadItem: {
                file,
                clearable: props.clearable && !readonly,
                disabled,
                showSize: props.showSize,
                variant: 'flat'
              }
            }
          }, {
            default: () => [slots.item?.(slotProps) ?? _createVNode(VFileUploadItem, {
              "key": key,
              "onClick:remove": () => context?.onClickRemove(index)
            }, null)]
          });
        })]
      });
    });
  }
});
//# sourceMappingURL=VFileUploadList.js.map