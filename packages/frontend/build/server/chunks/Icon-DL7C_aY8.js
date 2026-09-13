import { d as attr, f as attr_class, i as clsx, F as FILENAME } from './index.js-CIqeq94u.js';
import { p as push_element, a as pop_element } from './dev-carmgcOP.js';

Icon[FILENAME] = "src/lib/components/Icon.svelte";
function Icon($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { name, size = 16, class: className = "" } = $$props;
      $$renderer2.push(`<svg${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${attr_class(clsx(className))}>`);
      push_element($$renderer2, "svg", 5, 0);
      if (name === "gem") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<path d="M6 3h12l4 6-10 13L2 9z">`);
        push_element($$renderer2, "path", 17, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M11 3 8 9l4 13 4-13-3-6">`);
        push_element($$renderer2, "path", 17, 38);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M2 9h20">`);
        push_element($$renderer2, "path", 17, 73);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "wallet") {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4">`);
        push_element($$renderer2, "path", 19, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M3 5v14a2 2 0 0 0 2 2h16v-5">`);
        push_element($$renderer2, "path", 19, 45);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M18 12a1 1 0 0 0 0 4h4v-4z">`);
        push_element($$renderer2, "path", 19, 84);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "trending-up") {
        $$renderer2.push("<!--[2-->");
        $$renderer2.push(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17">`);
        push_element($$renderer2, "polyline", 21, 4);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<polyline points="16 7 22 7 22 13">`);
        push_element($$renderer2, "polyline", 21, 53);
        $$renderer2.push(`</polyline>`);
        pop_element();
      } else if (name === "trending-down") {
        $$renderer2.push("<!--[3-->");
        $$renderer2.push(`<polyline points="22 17 13.5 8.5 8.5 13.5 2 7">`);
        push_element($$renderer2, "polyline", 23, 4);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<polyline points="16 17 22 17 22 11">`);
        push_element($$renderer2, "polyline", 23, 52);
        $$renderer2.push(`</polyline>`);
        pop_element();
      } else if (name === "pie-chart") {
        $$renderer2.push("<!--[4-->");
        $$renderer2.push(`<path d="M21.21 15.89A10 10 0 1 1 8 2.83">`);
        push_element($$renderer2, "path", 25, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M22 12A10 10 0 0 0 12 2v10z">`);
        push_element($$renderer2, "path", 25, 47);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "zap") {
        $$renderer2.push("<!--[5-->");
        $$renderer2.push(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2">`);
        push_element($$renderer2, "polygon", 27, 4);
        $$renderer2.push(`</polygon>`);
        pop_element();
      } else if (name === "minus-circle") {
        $$renderer2.push("<!--[6-->");
        $$renderer2.push(`<circle cx="12" cy="12" r="10">`);
        push_element($$renderer2, "circle", 29, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<line x1="8" y1="12" x2="16" y2="12">`);
        push_element($$renderer2, "line", 29, 36);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "plus-circle") {
        $$renderer2.push("<!--[7-->");
        $$renderer2.push(`<circle cx="12" cy="12" r="10">`);
        push_element($$renderer2, "circle", 31, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<line x1="12" y1="8" x2="12" y2="16">`);
        push_element($$renderer2, "line", 31, 36);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="8" y1="12" x2="16" y2="12">`);
        push_element($$renderer2, "line", 31, 74);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "arrow-left-right") {
        $$renderer2.push("<!--[8-->");
        $$renderer2.push(`<polyline points="17 11 21 7 17 3">`);
        push_element($$renderer2, "polyline", 33, 4);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<line x1="21" y1="7" x2="9" y2="7">`);
        push_element($$renderer2, "line", 33, 40);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<polyline points="7 21 3 17 7 13">`);
        push_element($$renderer2, "polyline", 33, 76);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<line x1="3" y1="17" x2="15" y2="17">`);
        push_element($$renderer2, "line", 33, 111);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "target") {
        $$renderer2.push("<!--[9-->");
        $$renderer2.push(`<circle cx="12" cy="12" r="10">`);
        push_element($$renderer2, "circle", 35, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<circle cx="12" cy="12" r="6">`);
        push_element($$renderer2, "circle", 35, 36);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<circle cx="12" cy="12" r="2">`);
        push_element($$renderer2, "circle", 35, 67);
        $$renderer2.push(`</circle>`);
        pop_element();
      } else if (name === "paperclip") {
        $$renderer2.push("<!--[10-->");
        $$renderer2.push(`<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48">`);
        push_element($$renderer2, "path", 37, 4);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "calendar") {
        $$renderer2.push("<!--[11-->");
        $$renderer2.push(`<rect x="3" y="4" width="18" height="18" rx="2" ry="2">`);
        push_element($$renderer2, "rect", 39, 4);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<line x1="16" y1="2" x2="16" y2="6">`);
        push_element($$renderer2, "line", 39, 60);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="8" y1="2" x2="8" y2="6">`);
        push_element($$renderer2, "line", 39, 97);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="3" y1="10" x2="21" y2="10">`);
        push_element($$renderer2, "line", 39, 132);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "alert-triangle") {
        $$renderer2.push("<!--[12-->");
        $$renderer2.push(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z">`);
        push_element($$renderer2, "path", 41, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<line x1="12" y1="9" x2="12" y2="13">`);
        push_element($$renderer2, "line", 41, 89);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="12" y1="17" x2="12.01" y2="17">`);
        push_element($$renderer2, "line", 41, 127);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "bar-chart") {
        $$renderer2.push("<!--[13-->");
        $$renderer2.push(`<line x1="12" y1="20" x2="12" y2="10">`);
        push_element($$renderer2, "line", 43, 4);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="18" y1="20" x2="18" y2="4">`);
        push_element($$renderer2, "line", 43, 43);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<line x1="6" y1="20" x2="6" y2="16">`);
        push_element($$renderer2, "line", 43, 81);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "building") {
        $$renderer2.push("<!--[14-->");
        $$renderer2.push(`<rect x="4" y="2" width="16" height="20" rx="2" ry="2">`);
        push_element($$renderer2, "rect", 45, 4);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<path d="M9 22v-4h6v4">`);
        push_element($$renderer2, "path", 45, 60);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 6h.01">`);
        push_element($$renderer2, "path", 45, 84);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M16 6h.01">`);
        push_element($$renderer2, "path", 45, 104);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M12 6h.01">`);
        push_element($$renderer2, "path", 45, 125);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M12 10h.01">`);
        push_element($$renderer2, "path", 45, 146);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M12 14h.01">`);
        push_element($$renderer2, "path", 45, 168);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M16 10h.01">`);
        push_element($$renderer2, "path", 45, 190);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M16 14h.01">`);
        push_element($$renderer2, "path", 45, 212);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 10h.01">`);
        push_element($$renderer2, "path", 45, 234);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 14h.01">`);
        push_element($$renderer2, "path", 45, 255);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "credit-card") {
        $$renderer2.push("<!--[15-->");
        $$renderer2.push(`<rect x="1" y="4" width="22" height="16" rx="2" ry="2">`);
        push_element($$renderer2, "rect", 47, 4);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<line x1="1" y1="10" x2="23" y2="10">`);
        push_element($$renderer2, "line", 47, 60);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "clipboard") {
        $$renderer2.push("<!--[16-->");
        $$renderer2.push(`<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2">`);
        push_element($$renderer2, "path", 49, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<rect x="8" y="2" width="8" height="4" rx="1" ry="1">`);
        push_element($$renderer2, "rect", 49, 88);
        $$renderer2.push(`</rect>`);
        pop_element();
      } else if (name === "settings") {
        $$renderer2.push("<!--[17-->");
        $$renderer2.push(`<circle cx="12" cy="12" r="3">`);
        push_element($$renderer2, "circle", 51, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z">`);
        push_element($$renderer2, "path", 51, 35);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "layout-dashboard") {
        $$renderer2.push("<!--[18-->");
        $$renderer2.push(`<rect x="3" y="3" width="7" height="9" rx="1">`);
        push_element($$renderer2, "rect", 53, 4);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<rect x="14" y="3" width="7" height="5" rx="1">`);
        push_element($$renderer2, "rect", 53, 51);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<rect x="14" y="12" width="7" height="9" rx="1">`);
        push_element($$renderer2, "rect", 53, 99);
        $$renderer2.push(`</rect>`);
        pop_element();
        $$renderer2.push(`<rect x="3" y="16" width="7" height="5" rx="1">`);
        push_element($$renderer2, "rect", 53, 148);
        $$renderer2.push(`</rect>`);
        pop_element();
      } else if (name === "coins") {
        $$renderer2.push("<!--[19-->");
        $$renderer2.push(`<circle cx="8" cy="8" r="6">`);
        push_element($$renderer2, "circle", 55, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<path d="M18.09 10.37A6 6 0 1 1 10.34 18">`);
        push_element($$renderer2, "path", 55, 33);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M7 6h1v4">`);
        push_element($$renderer2, "path", 55, 76);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="m16.71 13.88.7.71-2.82 2.82">`);
        push_element($$renderer2, "path", 55, 96);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "repeat") {
        $$renderer2.push("<!--[20-->");
        $$renderer2.push(`<polyline points="17 1 21 5 17 9">`);
        push_element($$renderer2, "polyline", 57, 4);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<path d="M3 11V9a4 4 0 0 1 4-4h14">`);
        push_element($$renderer2, "path", 57, 39);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<polyline points="7 23 3 19 7 15">`);
        push_element($$renderer2, "polyline", 57, 75);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<path d="M21 13v2a4 4 0 0 1-4 4H3">`);
        push_element($$renderer2, "path", 57, 110);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "tag") {
        $$renderer2.push("<!--[21-->");
        $$renderer2.push(`<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z">`);
        push_element($$renderer2, "path", 59, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<line x1="7" y1="7" x2="7.01" y2="7">`);
        push_element($$renderer2, "line", 59, 94);
        $$renderer2.push(`</line>`);
        pop_element();
      } else if (name === "bell") {
        $$renderer2.push("<!--[22-->");
        $$renderer2.push(`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9">`);
        push_element($$renderer2, "path", 61, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M13.73 21a2 2 0 0 1-3.46 0">`);
        push_element($$renderer2, "path", 61, 59);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "save") {
        $$renderer2.push("<!--[23-->");
        $$renderer2.push(`<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z">`);
        push_element($$renderer2, "path", 63, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<polyline points="17 21 17 13 7 13 7 21">`);
        push_element($$renderer2, "polyline", 63, 79);
        $$renderer2.push(`</polyline>`);
        pop_element();
        $$renderer2.push(`<polyline points="7 3 7 8 15 8">`);
        push_element($$renderer2, "polyline", 63, 121);
        $$renderer2.push(`</polyline>`);
        pop_element();
      } else if (name === "dollar-sign") {
        $$renderer2.push("<!--[24-->");
        $$renderer2.push(`<line x1="12" y1="1" x2="12" y2="23">`);
        push_element($$renderer2, "line", 65, 4);
        $$renderer2.push(`</line>`);
        pop_element();
        $$renderer2.push(`<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6">`);
        push_element($$renderer2, "path", 65, 42);
        $$renderer2.push(`</path>`);
        pop_element();
      } else if (name === "receipt") {
        $$renderer2.push("<!--[25-->");
        $$renderer2.push(`<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z">`);
        push_element($$renderer2, "path", 67, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 7h8">`);
        push_element($$renderer2, "path", 67, 87);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 11h8">`);
        push_element($$renderer2, "path", 67, 105);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path d="M8 15h5">`);
        push_element($$renderer2, "path", 67, 124);
        $$renderer2.push(`</path>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></svg>`);
      pop_element();
    },
    Icon
  );
}
Icon.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { Icon as I };
//# sourceMappingURL=Icon-DL7C_aY8.js.map
