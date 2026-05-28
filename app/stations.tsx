import { Redirect } from "expo-router";

export default function StationsRedirect() {
  return <Redirect href={{ pathname: "/practice/[id]", params: { id: "stations" } }} />;
}
