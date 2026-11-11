# WebMCP

The app exposes its actions as [WebMCP](https://github.com/webmachinelearning/webmcp) tools, so an agent running in the browser can drive the builder. Tools register through `document.modelContext.registerTool` (the current draft) or `navigator.modelContext` (the earlier draft and polyfills such as MCP-B). In a browser with neither, nothing is registered.

Code lives in `src/webmcp/`:

- `model-context.ts` is the registration adapter. Results go back as MCP `content`, and a thrown error becomes an `isError` result.
- `WebMcpRoot.tsx` registers the app-wide tools on every page. `src/pages/routes.tsx` mounts it.
- `ui-tools.ts` holds the generic control tools.
- `builder-tools.ts` holds the builder tools. `BuilderPage` registers them while the builder is open.

## Every page

| Tool | What it does |
| --- | --- |
| `get_page_info`, `navigate_to_page` | Report the current page, or move to another page (`/`, `/gyms`, `/library`, `/parts/<id>`, `/?gym=<slug>`). |
| `list_ui_controls`, `operate_ui_control` | List every visible button, link, field and menu item, then click it, set its value, check it, press a key on it, or hand it a file. This reaches any control, including ones that have no dedicated tool. |

## Builder

- **Commands:** each command palette entry is exposed as `editor_<id>`, for example `editor_undo`, `editor_view_top`, `editor_lock_all` and `editor_export_3mf`. A new palette command shows up as a tool automatically.
- **Read:** `get_builder_state`, `list_design_parts`, `get_part_details`, `search_parts_catalog`, `list_warnings`, `get_design_document`, `capture_viewport` (a screenshot of the 3D view) and `wait_for_build`.
- **Place:** `list_placement_options`, `add_part`, `move_part`, `start_placement`, `accept_placement`, `cancel_placement`, `delete_parts`, `duplicate_parts` and `rotate_part`.
- **Edit:** `set_part_params`, `reset_part`, `set_variant`, `set_part_paired`, `set_plates`, `list_plates`, `set_appearance` and `set_logo`.
- **Selection and view:** `select_parts`, `frame_parts`, `set_camera_view`, `set_parts_hidden`, `set_parts_locked` and `set_panel_open`.
- **Room and rack:** `set_room_size`, `set_room_finishes`, `set_rack_dimensions`, `list_rack_presets`, `apply_rack_preset`, `edit_rack_topology`, `reset_entire_rack` and `new_design`.
- **History:** `list_history`, `go_to_history_step`, `clear_history` and `play_build_animation`.
- **Designs:** `list_saved_designs`, `manage_saved_design`, `get_design_json`, `load_design_json`, `list_gyms` and `open_gym`.
- **Fallback:** `replace_design_document` validates and commits an edited RackDoc. Use it for any edit no other tool covers.

Edits go through `BuilderStore` the same way the UI's edits do. Each edit is one undoable history step, and locked parts refuse to move.

Positions are in millimetres, in the frame `list_design_parts` and the rack uprights use: x points right, y points toward the back, and the origin is the rack centre.
