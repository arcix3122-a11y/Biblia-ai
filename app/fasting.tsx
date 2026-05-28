import { Redirect } from "expo-router";

export default function FastingRedirect() {
  return <Redirect href={{ pathname: "/practice/[id]", params: { id: "fasting" } }} />;
}
