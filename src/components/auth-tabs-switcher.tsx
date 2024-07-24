import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type AuthTabProps = {
  signIn: ReactNode;
  signUp: ReactNode;
}

const AuthTabSwitcher = ({signIn, signUp}: AuthTabProps) => {
  return (
    <Tabs className="w-full" defaultValue="sign-In">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-In">Sign In</TabsTrigger>
        <TabsTrigger value="sign-Up">Sign Up</TabsTrigger>
      </TabsList>

      <TabsContent value="sign-In">{signIn}</TabsContent>
      <TabsContent value="sign-Up">{signUp}</TabsContent>
    </Tabs>
  )
};

export default AuthTabSwitcher;
