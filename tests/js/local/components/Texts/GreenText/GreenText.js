import { Text } from "../Text/Text";
import "./GreenText.css";

export function GreenText(props) {
  return <Text className="GreenText">{props.children}</Text>;
}
