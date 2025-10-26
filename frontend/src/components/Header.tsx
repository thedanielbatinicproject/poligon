import { Flex, Box, Button } from "@chakra-ui/react";

export type Role = "visitor" | "student" | "mentor" | "admin";

interface HeaderProps {
  role: Role;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Header = ({ role, onLogin, onLogout }: HeaderProps) => (
  <Flex as="header" bg="blue.600" color="white" p={4} justify="space-between">
    <Box fontWeight="bold" fontFamily={"heading"}>Poligon App</Box>
    <Flex gap={4}>
      {role === "visitor" && <Button onClick={onLogin}>Login</Button>}
      {role === "student" && <Box>Student Dashboard</Box>}
      {role === "mentor" && <Box>Mentor Panel</Box>}
      {role === "admin" && <Box>Admin Panel</Box>}
      {role !== "visitor" && <Button onClick={onLogout}>Logout</Button>}
    </Flex>
  </Flex>
);
