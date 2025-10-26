import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import DefaultTheme from "./Defaulttheme";
import App from "./pages/App";
import "./styles/global.css";
import "./styles/aurora.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={DefaultTheme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);