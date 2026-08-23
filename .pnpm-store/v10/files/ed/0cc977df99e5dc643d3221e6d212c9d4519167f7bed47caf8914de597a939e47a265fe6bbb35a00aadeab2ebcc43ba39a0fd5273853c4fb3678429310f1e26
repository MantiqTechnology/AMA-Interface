import { normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode, createVNode as _createVNode } from "vue";
// Styles
import "./VHighlight.css";

// Composables
import { useTextColor } from "../../composables/color.js";
import { makeTagProps } from "../../composables/tag.js"; // Utilities
import { computed } from 'vue';
import { toHighlight } from "./toHighlight.js";
import { defineComponent, propsFactory } from "../../util/index.js"; // Types
export const makeVHighlightProps = propsFactory({
  text: {
    type: String,
    default: ''
  },
  query: [String, Array],
  matches: Array,
  matchAll: Boolean,
  ignoreCase: Boolean,
  color: String,
  opacity: [String, Number],
  markClass: String,
  ...makeTagProps({
    tag: 'span'
  })
}, 'VHighlight');
export const VHighlight = defineComponent({
  name: 'VHighlight',
  props: makeVHighlightProps(),
  setup(props) {
    const chunks = computed(() => toHighlight(() => props.text, () => props.query, {
      matches: () => props.matches,
      matchAll: () => props.matchAll,
      ignoreCase: () => props.ignoreCase
    }));
    const {
      textColorClasses,
      textColorStyles
    } = useTextColor(() => props.color);
    return () => _createVNode(props.tag, {
      "class": "v-highlight"
    }, {
      default: () => [chunks.value.map((chunk, i) => chunk.match ? _createElementVNode("mark", {
        "key": i,
        "class": _normalizeClass(['v-highlight__mark', textColorClasses.value, props.markClass]),
        "style": _normalizeStyle([textColorStyles.value, {
          '--v-highlight-opacity': props.opacity
        }])
      }, [chunk.text]) : _createElementVNode("span", {
        "key": i
      }, [chunk.text]))]
    });
  }
});
//# sourceMappingURL=VHighlight.js.map