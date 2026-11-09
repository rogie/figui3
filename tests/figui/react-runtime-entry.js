import React from "../../playground/node_modules/react/index.js";
import { createRoot } from "../../playground/node_modules/react-dom/client.js";

window.__figuiReactRuntime = {
  mount(container) {
    const inputDetails = [];
    const numberDetails = [];
    const recoverableErrors = [];
    const root = createRoot(container, {
      onRecoverableError(error) {
        recoverableErrors.push(String(error));
      },
    });

    const render = (showDatalist) => {
      root.render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "fig-slider",
            { id: "react-slider", value: "25" },
            showDatalist
              ? React.createElement(
                  "datalist",
                  { id: "react-ticks" },
                  React.createElement("option", { value: "25" }),
                )
              : null,
          ),
          React.createElement("fig-checkbox", {
            id: "react-checkbox",
            value: "yes",
            onInput(event) {
              inputDetails.push(event.nativeEvent.detail);
            },
          }),
          React.createElement("fig-input-number", {
            id: "react-number",
            value: "12",
            onInput(event) {
              numberDetails.push(event.nativeEvent.detail);
            },
          }),
        ),
      );
    };

    render(true);
    return {
      render,
      unmount: () => root.unmount(),
      inputDetails,
      numberDetails,
      recoverableErrors,
    };
  },
};
