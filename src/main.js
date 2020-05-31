import React from "react";
import { render } from "react-dom";
import { Global, css } from "@emotion/core";

import GLTFModifier from "./gltf-modifier";

const styles = css`
  html,
  body,
  #root {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
`;

const App = () => {
  return (
    <>
      <Global {...styles} />
      <GLTFModifier />
    </>
  );
};

render(<App />, document.getElementById("root"));
