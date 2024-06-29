import { Text } from "../Text/Text";
import "./RedText.css";

export function RedText(props) {
  return <Text className="RedText">{props.children}</Text>;
}
