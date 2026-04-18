import { useState, useCallback } from "react";

export default function EditorApp() {
  const [text, setText] = useState("Hello world");
  const [opacity, setOpacity] = useState("75");
  const [visible, setVisible] = useState(true);

  const handleTextInput = useCallback((e: Event) => {
    setText((e.target as HTMLInputElement).value);
  }, []);

  const handleSliderInput = useCallback((e: Event) => {
    setOpacity((e.target as HTMLInputElement).value);
  }, []);

  const handleSwitchChange = useCallback((e: Event) => {
    const el = e.target as HTMLElement;
    setVisible(el.getAttribute("checked") === "true");
  }, []);

  return (
    <>
      <fig-header>Properties</fig-header>

      <fig-content>
        <fig-field direction="horizontal">
          <label>Text</label>
          <fig-input-text
            value={text}
            onInput={handleTextInput}
          />
        </fig-field>

        <fig-field direction="horizontal">
          <label>Opacity</label>
          <fig-slider
            value={opacity}
            min="0"
            max="100"
            text="true"
            units="%"
            full
            onInput={handleSliderInput}
          />
        </fig-field>

        <fig-field direction="horizontal">
          <label>Visible</label>
          <fig-switch
            checked={visible ? "true" : "false"}
            onChange={handleSwitchChange}
          />
        </fig-field>
      </fig-content>
    </>
  );
}
