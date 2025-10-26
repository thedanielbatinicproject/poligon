import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import Defaulttheme from "./Defaulttheme";
import App from "./pages/App";
import "./styles/global.css"; // Import your global styles

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={Defaulttheme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);