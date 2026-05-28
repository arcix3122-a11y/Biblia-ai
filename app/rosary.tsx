import { Redirect } from "expo-router";

export default function RosaryRedirect() {
  return <Redirect href={{ pathname: "/practice/[id]", params: { id: "rosary" } }} />;
}
