import React from "react"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink
} from "@/components/ui/navigation-menu"

const MainMenu: React.FC = () => (
  <NavigationMenu>
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Home</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="/">Home Page</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Documents</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="/documents">All Documents</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Profile</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="/profile">My Profile</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
)

export default MainMenu
