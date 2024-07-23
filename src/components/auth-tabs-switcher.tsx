import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type AuthTabProps = {}

const AuthTabSwitcher = ({}: AuthTabProps) => {
  return (
    <Tabs className="">
      <TabsList>
        <TabsTrigger value="Sign-In">Sign In</TabsTrigger>
        <TabsTrigger value="Sign-Up">Sign Up</TabsTrigger>
      </TabsList>

      <TabsContent value="sign-In">Sign In</TabsContent>
    </Tabs>
  )
};

export default AuthTabSwitcher;