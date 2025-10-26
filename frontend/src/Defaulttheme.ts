import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'Source Sans Pro', sans-serif",
    description: "'Open Sans', sans-serif",
  },
});

export default theme;