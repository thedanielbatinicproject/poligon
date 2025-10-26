import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'Source Sans Pro', sans-serif",
    description: "'Open Sans', sans-serif",
  },
  colors: {
    lakeside: {
      900: "#1d1640",
      800: "#3d276f",
      700: "#001d83",
      400: "#39977f",
      100: "#b4dac3",
    }
  },
  gradients: {
    northernGetaway: [
      "#023062ff", // base
      "#045686", // transition
      "#17afd4", // glow
      "#49d2e2", // highlight
      "#ea8916"  // accent
    ],
    forestNorthernLights: [
      "#000000", // base
      "#3e0f23", // magenta glow
      "#743c55", // purple-pink
      "#0e392f", // green glow
      "#3e5c3eff"  // forest highlight
    ],
    lakesideAuroraBorealis: [
      "#1d1640", // indigo base
      "#001d83", // blue glow
      "#3d276f", // purple-blue
      "#367250ff", // teal glow
      "#2d4336ff"  // mint highlight
    ]
  }
});

export default theme;