import { Flex, Box, Button, useTheme } from "@chakra-ui/react";
import PoligonLogoNoText from "../assets/images/PoligonLogoNoText.png";
import "../styles/header.css";

export type Role = "visitor" | "student" | "mentor" | "admin" | "user";

interface HeaderProps {
  role: Role;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Header = ({ role, onLogin, onLogout }: HeaderProps) => {
  const theme = useTheme();

  // Gradient backgrounds
  const lakesideGradient = `linear-gradient(90deg, ${theme.gradients?.lakesideAuroraBorealis?.join(", ")})`;
  const forestGradient = `linear-gradient(90deg, ${theme.gradients?.forestNorthernLights?.join(", ")})`;

  // Animation class for moving gradient
  const animatedClass = "aurora-gradient";

  // Choose background and animation
  let bg: string = theme.colors.lakeside[800];
  let className = "";

  if (role === "student" || role === "user") {
    bg = lakesideGradient;
    className = animatedClass;
  } else if (role === "mentor" || role === "admin") {
    bg = forestGradient;
    className = animatedClass;
  }

  return (
    <Flex
      as="header"
      bg={bg}
      className={className}
      color="white"
      p={4}
      justify="space-between"
      align="center"
    >
      <Box display="flex" alignItems="center" gap={2}>
        <img
          src={PoligonLogoNoText}
          alt="Poligon Logo"
          className="poligon-logo-glow"
        />
        <Box fontWeight="bold" fontFamily="heading">Poligon</Box>
      </Box>
      <Flex gap={4}>
        {role === "visitor" && <Button onClick={onLogin} colorScheme="lakeside">Login</Button>}
        {role === "student" && <Box>Student Dashboard</Box>}
        {role === "user" && <Box>User Dashboard</Box>}
        {role === "mentor" && <Box>Mentor Panel</Box>}
        {role === "admin" && <Box>Admin Panel</Box>}
        {role !== "visitor" && <Button onClick={onLogout} colorScheme="lakeside">Logout</Button>}
      </Flex>
    </Flex>
  );
};