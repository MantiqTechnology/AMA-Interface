import { createVNode as _createVNode, createElementVNode as _createElementVNode, Fragment as _Fragment, mergeProps as _mergeProps } from "vue";
// Components
import { VFileUploadItem } from "./VFileUploadItem.js";
import { VBtn } from "../VBtn/VBtn.js";
import { VDefaultsProvider } from "../VDefaultsProvider/VDefaultsProvider.js";
import { makeVDividerProps, VDivider } from "../VDivider/VDivider.js";
import { VIcon } from "../VIcon/VIcon.js";
import { VOverlay } from "../VOverlay/VOverlay.js";
import { makeVSheetProps, VSheet } from "../VSheet/VSheet.js"; // Composables
import { makeDelayProps } from "../../composables/delay.js";
import { makeDensityProps, useDensity } from "../../composables/density.js";
import { useFileDrop } from "../../composables/fileDrop.js";
import { forwardRefs } from "../../composables/forwardRefs.js";
import { IconValue } from "../../composables/icons.js";
import { useLocale } from "../../composables/locale.js"; // Utilities
import { inject, ref, shallowRef, toRef } from 'vue';
import { getFileKey } from "./fileKey.js";
import { genericComponent, pick, propsFactory, useRender } from "../../util/index.js"; // Types
export const VFileUploadKey = Symbol.for('vuetify:file-upload');
export const makeVFileUploadDropzoneProps = propsFactory({
  browseText: {
    type: String,
    default: '$vuetify.fileUpload.browse'
  },
  dividerText: {
    type: String,
    default: '$vuetify.fileUpload.divider'
  },
  title: {
    type: String,
    default: '$vuetify.fileUpload.title'
  },
  subtitle: String,
  icon: {
    type: IconValue,
    default: '$upload'
  },
  clearable: Boolean,
  disabled: Boolean,
  readonly: Boolean,
  error: Boolean,
  hideBrowse: Boolean,
  insetFileList: Boolean,
  multiple: Boolean,
  scrim: {
    type: [Boolean, String],
    default: true
  },
  showSize: Boolean,
  ...makeDelayProps(),
  ...makeDensityProps(),
  ...pick(makeVDividerProps({
    length: 150
  }), ['length', 'thickness', 'opacity']),
  ...makeVSheetProps(),
  modelValue: {
    type: Array,
    default: () => []
  }
}, 'VFileUploadDropzone');
export const VFileUploadDropzone = genericComponent()({
  name: 'VFileUploadDropzone',
  props: makeVFileUploadDropzoneProps(),
  emits: {
    'click:browse': () => true,
    'click:remove': index => true,
    drop: files => true
  },
  setup(props, {
    emit,
    slots
  }) {
    const {
      t
    } = useLocale();
    const {
      densityClasses
    } = useDensity(props);
    const {
      handleDrop,
      hasFilesOrFolders
    } = useFileDrop();
    const context = inject(VFileUploadKey, null);
    const vSheetRef = ref();
    const isDragging = shallowRef(false);
    const isDisabled = toRef(() => context?.disabled.value ?? props.disabled);
    const isReadonly = toRef(() => context?.readonly.value ?? props.readonly);
    const isInteractive = toRef(() => !isDisabled.value && !isReadonly.value);
    function onDragover(e) {
      if (!isInteractive.value) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      isDragging.value = true;
    }
    function onDragleave(e) {
      e.preventDefault();
      const container = e.currentTarget;
      if (!container.contains(e.relatedTarget)) {
        isDragging.value = false;
      }
    }
    async function onDrop(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      isDragging.value = false;
      if (!isInteractive.value || !hasFilesOrFolders(e)) return;
      const files = await handleDrop(e);
      if (context) {
        context.onDrop(files);
      } else {
        emit('drop', files);
      }
    }
    function onClickBrowse() {
      if (!isInteractive.value) return;
      if (context) {
        context.onClickBrowse();
      } else {
        emit('click:browse');
      }
    }
    function onKeydown(e) {
      if (!isInteractive.value) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClickBrowse();
      }
    }
    function onClickRemove(index) {
      if (!isInteractive.value) return;
      if (context) {
        context.onClickRemove(index);
      } else {
        emit('click:remove', index);
      }
    }
    async function onPaste(e) {
      if (!isInteractive.value || !hasFilesOrFolders(e)) return;
      e.preventDefault();
      const files = await handleDrop(e);
      if (!files.length) return;
      if (context) {
        context.onDrop(files);
      } else {
        emit('drop', files);
      }
    }
    useRender(() => {
      const modelValue = context?.files.value ?? props.modelValue;
      const disabled = isDisabled.value;
      const readonly = isReadonly.value;
      const interactive = isInteractive.value;
      const error = context?.error.value || props.error;
      const hasTitle = !!(slots.title || props.title);
      const hasIcon = !!(slots.icon || props.icon);
      const hasBrowse = !!(!props.hideBrowse && (slots.browse || props.density === 'default'));
      const hasFiles = modelValue.length > 0;
      const isInset = props.insetFileList && hasFiles;
      const sheetProps = VSheet.filterProps(props);
      const dividerProps = VDivider.filterProps(props);
      return _createVNode(VSheet, _mergeProps({
        "ref": vSheetRef,
        "tabindex": disabled ? -1 : 0
      }, sheetProps, {
        "class": ['v-file-upload-dropzone', {
          'v-file-upload-dropzone--clickable': !hasBrowse,
          'v-file-upload-dropzone--disabled': disabled,
          'v-file-upload-dropzone--readonly': readonly,
          'v-file-upload-dropzone--dragging': isDragging.value,
          'v-file-upload-dropzone--has-files': hasFiles,
          'v-file-upload-dropzone--inset': isInset,
          'v-file-upload-dropzone--error': error
        }, densityClasses.value, props.class],
        "style": props.style,
        "onDragleave": onDragleave,
        "onDragover": onDragover,
        "onDrop": onDrop,
        "onPaste": onPaste,
        "onClick": !hasBrowse && !(isInset && hasFiles) ? onClickBrowse : undefined,
        "onKeydown": onKeydown
      }), {
        default: () => [slots.default?.({
          isDragging: isDragging.value,
          hasFiles,
          files: modelValue,
          props: {
            onClick: onClickBrowse
          }
        }) ?? (isInset ? _createElementVNode("div", {
          "key": "inset",
          "class": "v-file-upload-inset"
        }, [modelValue.length === 1 && !props.multiple ? slots.single?.({
          file: modelValue[0],
          props: {
            'onClick:remove': () => onClickRemove(0)
          }
        }) ?? _createVNode(VDefaultsProvider, {
          "defaults": {
            VFileUploadItem: {
              file: modelValue[0],
              clearable: props.clearable && !readonly,
              disabled,
              showSize: props.showSize,
              border: false
            }
          }
        }, {
          default: () => [_createVNode(VFileUploadItem, {
            "onClick:remove": () => onClickRemove(0)
          }, null)]
        }) : modelValue.map((file, i) => {
          const key = getFileKey(file);
          const slotProps = {
            file,
            props: {
              'onClick:remove': () => onClickRemove(i)
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
                border: false
              }
            }
          }, {
            default: () => [slots.item?.(slotProps) ?? _createVNode(VFileUploadItem, {
              "key": key,
              "onClick:remove": () => onClickRemove(i)
            }, null)]
          });
        }), _createVNode(VDivider, null, null), _createElementVNode("div", {
          "class": "v-file-upload-inset__action"
        }, [!slots.browse ? _createVNode(VBtn, {
          "readonly": !interactive,
          "text": t(props.browseText),
          "variant": "text",
          "onClick": onClickBrowse
        }, null) : _createVNode(VDefaultsProvider, {
          "defaults": {
            VBtn: {
              readonly: !interactive,
              text: t(props.browseText),
              variant: 'text'
            }
          }
        }, {
          default: () => [slots.browse({
            props: {
              onClick: onClickBrowse
            }
          })]
        })])]) : _createElementVNode(_Fragment, null, [hasIcon && _createElementVNode("div", {
          "key": "icon",
          "class": "v-file-upload-icon"
        }, [!slots.icon ? _createVNode(VIcon, {
          "key": "icon-icon",
          "icon": props.icon
        }, null) : _createVNode(VDefaultsProvider, {
          "key": "icon-defaults",
          "defaults": {
            VIcon: {
              icon: props.icon
            }
          }
        }, {
          default: () => [slots.icon()]
        })]), hasTitle && _createElementVNode("div", {
          "key": "title",
          "class": "v-file-upload-title"
        }, [slots.title?.() ?? t(props.title)]), props.density === 'default' && _createElementVNode(_Fragment, null, [hasBrowse && _createElementVNode(_Fragment, null, [_createElementVNode("div", {
          "key": "upload-divider",
          "class": "v-file-upload-divider"
        }, [slots.divider?.() ?? _createVNode(VDivider, dividerProps, {
          default: () => [t(props.dividerText)]
        })]), !slots.browse ? _createVNode(VBtn, {
          "readonly": !interactive,
          "size": "large",
          "text": t(props.browseText),
          "variant": "tonal",
          "onClick": onClickBrowse
        }, null) : _createVNode(VDefaultsProvider, {
          "defaults": {
            VBtn: {
              readonly: !interactive,
              size: 'large',
              text: t(props.browseText),
              variant: 'tonal'
            }
          }
        }, {
          default: () => [slots.browse({
            props: {
              onClick: onClickBrowse
            }
          })]
        })]), props.subtitle && _createElementVNode("div", {
          "class": "v-file-upload-subtitle"
        }, [props.subtitle])])])), _createVNode(VOverlay, {
          "modelValue": isDragging.value,
          "contained": true,
          "scrim": props.scrim
        }, null), slots.input?.(), slots.loader?.()]
      });
    });
    return forwardRefs({}, vSheetRef);
  }
});
//# sourceMappingURL=VFileUploadDropzone.js.map