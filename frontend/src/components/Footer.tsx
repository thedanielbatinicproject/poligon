import { Box } from "@chakra-ui/react";

export const Footer = () => (
  <Box as="footer" bg="gray.100" color="gray.700" p={4} textAlign="center">
    &copy; {new Date().getFullYear()} Poligon App. All rights reserved.
  </Box>
);
